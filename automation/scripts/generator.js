/**
 * Image Generator Module
 * Uses Puppeteer to generate random images from generators
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class ImageGenerator {
    constructor(config) {
        this.config = config;
        this.browser = null;
        this.outputDir = path.join(__dirname, '../output/images');

        // Ensure output directory exists
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Launch browser
     */
    async launch() {
        this.browser = await puppeteer.launch({
            headless: false, // Visual for human-like behavior
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ],
            defaultViewport: { width: 1600, height: 1200 },
            ignoreDefaultArgs: ['--enable-automation']
        });

        // Initialize reusable page
        this.page = await this.browser.newPage();

        // Stealth modifications
        await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });

            // FORCE PRESERVE DRAWING BUFFER FOR WEBGL
            // This ensures that gl.readPixels and screenshotting works for all generators
            const getContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function (type, options) {
                if (type === 'webgl' || type === 'webgl2') {
                    options = { ...(options || {}), preserveDrawingBuffer: true };
                }
                return getContext.call(this, type, options);
            };
        });

        // Random mouse movement simulation helper
        this.page.mouse.randomMove = async () => {
            const x = Math.floor(Math.random() * 1600);
            const y = Math.floor(Math.random() * 1200);
            await this.page.mouse.move(x, y, { steps: 10 + Math.floor(Math.random() * 20) });
        };
    }

    /**
     * Close browser
     */
    async close() {
        if (this.page) {
            await this.page.close();
        }
        if (this.browser) {
            await this.browser.close();
        }
    }

    /**
     * Select random generator
     */
    selectRandomGenerator() {
        const generators = this.config.generators.enabled;
        // Avoid repeating the same generator twice if possible
        let nextGen;
        do {
            nextGen = generators[Math.floor(Math.random() * generators.length)];
        } while (generators.length > 1 && nextGen === this.lastGenerator);

        this.lastGenerator = nextGen;
        return nextGen;
    }

    /**
     * Check if canvas has significant transparency
     */
    async checkTransparency(page) {
        try {
            return await page.evaluate(() => {
                const canvas = document.querySelector('canvas#previewCanvas') || document.querySelector('canvas');
                if (!canvas) return false;

                try {
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return false;

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

                    let transparentPixels = 0;
                    const totalPixels = canvas.width * canvas.height;

                    // Check alpha channel (every 4th value)
                    for (let i = 3; i < data.length; i += 4) {
                        if (data[i] < 255) {
                            transparentPixels++;
                        }
                    }

                    const transparencyRatio = transparentPixels / totalPixels;
                    return transparencyRatio > 0.5; // More than 50% transparent
                } catch (e) {
                    console.error('Error checking transparency:', e);
                    return false;
                }
            });
        } catch (error) {
            console.error('   ⚠️ Could not check transparency:', error.message);
            return false;
        }
    }

    /**
     * Get current parameters from page
     */
    async getParameters(page, generatorName) {
        return await page.evaluate((genName) => {
            const params = {};

            // Get all input elements
            const inputs = document.querySelectorAll('input[type="range"], input[type="number"], select');
            inputs.forEach(input => {
                if (input.id && input.value) {
                    params[input.id] = input.value;
                }
            });

            // Get colors
            const colorInputs = document.querySelectorAll('input[type="color"]');
            const colors = [];
            colorInputs.forEach(input => {
                if (input.value) {
                    colors.push(input.value);
                }
            });
            if (colors.length > 0) {
                params.colors = colors;
            }

            return params;
        }, generatorName);
    }

    /**
     * Download file from browser
     */
    async downloadFile(page, downloadPath) {
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadPath
        });
    }

    /**
     * Generate random image
     */
    async generateImage(generatorName = null) {
        if (!generatorName) {
            generatorName = this.selectRandomGenerator();
        }

        // Reuse existing page or create new if needed
        const page = this.page || await this.browser.newPage();
        this.page = page; // Ensure we keep reference

        const timestamp = Date.now();
        const baseFilename = `${generatorName}_${timestamp}`;

        try {
            // Navigate to generator
            const url = `${this.config.generators.baseUrl}/${generatorName}`;
            console.log(`📸 Generating image from: ${url}`);

            // Random mouse move simulation before navigation
            if (page.mouse.randomMove) await page.mouse.randomMove();

            await page.goto(url, { waitUntil: 'networkidle0' });

            // Human-like delay after page load
            await page.waitForTimeout(1500 + Math.random() * 2500); // 1.5-4 seconds

            await page.waitForSelector('canvas', { timeout: 10000 });

            // Set canvas size to 1600x1200
            console.log('   📐 Setting canvas size to 1600x1200...');
            try {
                await page.evaluate(() => {
                    // Try standard IDs first, then fallback to 'width'/'height' (Aurora/Noise)
                    const widthInput = document.querySelector('#canvasWidth') || document.querySelector('#width');
                    const heightInput = document.querySelector('#canvasHeight') || document.querySelector('#height');

                    if (widthInput && heightInput) {
                        widthInput.value = '1600';
                        heightInput.value = '1200';

                        // Trigger change event
                        widthInput.dispatchEvent(new Event('input', { bubbles: true }));
                        heightInput.dispatchEvent(new Event('input', { bubbles: true }));
                        widthInput.dispatchEvent(new Event('change', { bubbles: true }));
                        heightInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
                await page.waitForTimeout(1500 + Math.random() * 1000); // 1.5-2.5 seconds
            } catch (e) {
                console.log('   ⚠️ Could not set canvas size, using default');
            }

            // Click randomize button multiple times for better variety
            try {
                await page.waitForSelector('#randomBtn', { timeout: 5000 });

                // Randomly change some dropdowns first if they exist
                await page.evaluate(() => {
                    const selects = document.querySelectorAll('select');
                    selects.forEach(select => {
                        if (select.id === 'patternType' || select.id === 'type') {
                            const options = select.options;
                            const randomIndex = Math.floor(Math.random() * options.length);
                            select.selectedIndex = randomIndex;
                            select.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });
                });
                // Capture initial canvas state for "Wait for Change" logic
                const getSmartHash = async () => {
                    // SCREENSHOT BASED HASHING (Slow but 100% Reliable for WebGL)
                    // We capture a small crop of the canvas area to check for visual changes
                    try {
                        const buffer = await page.screenshot({
                            clip: { x: 400, y: 300, width: 100, height: 100 }, // Center-ish crop
                            encoding: 'binary'
                        });
                        // Simple buffer sum hash
                        let sum = 0;
                        for (let i = 0; i < buffer.length; i += 100) sum += buffer[i];
                        return 'scr_' + sum;
                    } catch (e) {
                        return 'error_' + Math.random();
                    }
                };

                let initialInternalHash = await getSmartHash();
                console.log(`   📸 Initial Visual Hash: ${initialInternalHash}`);

                // Click randomize 3-5 times
                const clickCount = 3 + Math.floor(Math.random() * 3);
                console.log(`   🎲 Randomizing ${clickCount} times...`);

                for (let i = 0; i < clickCount; i++) {
                    await page.evaluate(() => {
                        const btn = document.querySelector('#randomBtn');
                        if (btn) btn.click();
                    });

                    // Wait for small delay between clicks
                    await page.waitForTimeout(400 + Math.random() * 300);
                }

                // BARRIER 1: WAIT FOR CHANGE
                // We must see the hash DIFFERENT from initial, to ensure rendering started.
                console.log('   ⏳ Waiting for canvas to START changing...');
                const startWait = Date.now();
                let changed = false;

                while (Date.now() - startWait < 5000) { // 5 sec max wait for start
                    const curr = await getSmartHash();
                    if (curr !== initialInternalHash) {
                        changed = true;
                        console.log('   ⚡ Canvas started changing.');
                        break;
                    }
                    await page.waitForTimeout(200);
                }

                if (!changed) console.log('   ⚠️ Canvas did not change from initial state (or hash failed).');

                // BARRIER 2: WAIT FOR STABILITY (OR TIMEOUT)
                // Now wait for it to STOP changing, OR time out if it's a continuous animation
                console.log('   ⏳ Waiting for canvas stability (max 4s)...');

                let lastHash = await getSmartHash();
                let stableStart = Date.now(); // Last time it was stable
                const phaseStart = Date.now(); // Total time spent in this phase
                const stabilityTimeout = 4000; // Force proceed after 4 seconds

                while (Date.now() - phaseStart < 10000) { // Safety outer loop limit
                    // If total wait exceeds soft limit, break and accept current state
                    if (Date.now() - phaseStart > stabilityTimeout) {
                        console.log('   ⚠️ Animation detected (not stable), proceeding with capture.');
                        break;
                    }

                    await page.waitForTimeout(300);
                    const curr = await getSmartHash();

                    if (curr === lastHash) {
                        // If stable for 0.8s, break
                        if (Date.now() - stableStart > 800) {
                            console.log('   ✅ Canvas is stable.');
                            break;
                        }
                    } else {
                        // Changed. Reset stableStart, but NOT phaseStart
                        lastHash = curr;
                        stableStart = Date.now();
                    }
                }


                await page.waitForTimeout(500); // Final safety buffer

            } catch (e) {
                console.log('   ⚠️ Could not click randomize or wait issues, using current state');
                console.log(e);
                await page.waitForTimeout(2000);
            }

            // Check transparency
            const hasTransparency = await this.checkTransparency(page);
            console.log(`   Transparency: ${hasTransparency ? 'Yes (>50%)' : 'No'}`);

            // ---------------------------------------------------------
            // VISUAL COLOR EXTRACTION
            // ---------------------------------------------------------
            console.log('   🎨 Extracting visual colors from canvas...');
            const visualColors = await page.evaluate(() => {
                try {
                    const canvas = document.querySelector('canvas#previewCanvas') || document.querySelector('canvas');
                    if (!canvas) return [];

                    // Standard canvas or WebGL? 
                    // If WebGL, we must use toDataURL approach to be safe or try gl.readPixels
                    // But standard approach: use offscreen canvas
                    const offCanvas = document.createElement('canvas');
                    offCanvas.width = 100;
                    offCanvas.height = 100;
                    const offCtx = offCanvas.getContext('2d');
                    offCtx.drawImage(canvas, 0, 0, 100, 100);

                    const imageData = offCtx.getImageData(0, 0, 100, 100);
                    const data = imageData.data;

                    const colorCounts = {};

                    // Simple quantization (snap to nearest 32)
                    const round = (n) => Math.floor(n / 32) * 32;
                    const rgbToHex = (r, g, b) => {
                        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                    };

                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        const a = data[i + 3];

                        if (a < 128) continue; // Skip transparency

                        // Ignore very dark or very white (optional, but helps tag relevance)
                        if (r < 20 && g < 20 && b < 20) continue; // Skip pure black
                        if (r > 240 && g > 240 && b > 240) continue; // Skip pure white

                        const key = `${round(r)},${round(g)},${round(b)}`;
                        if (!colorCounts[key]) colorCounts[key] = { count: 0, r, g, b };
                        colorCounts[key].count++;
                    }

                    const sorted = Object.values(colorCounts).sort((a, b) => b.count - a.count);

                    // Take top 5
                    return sorted.slice(0, 5).map(c => rgbToHex(c.r, c.g, c.b));

                } catch (e) {
                    console.error('Visual extraction failed', e);
                    return [];
                }
            });

            console.log('   🎨 Detect Colors:', visualColors.join(', '));

            // Get standard parameters but OVERRIDE colors
            const parameters = await this.getParameters(page, generatorName);
            if (visualColors.length > 0) {
                // If we detected colors, trust them over the DOM inputs
                parameters.colors = visualColors;
                console.log('   ✅ Overrode parameters with visual colors.');
            }


            // DIRECT SCREENSHOT EXPORT (Guarantees WYSIWYG)
            // Instead of clicking export (which might re-seed/re-render), we capture the canvas directly.
            console.log('   � Direct capturing canvas to file...');

            const downloadPath = this.outputDir;
            const canvasHandle = await page.$('canvas#previewCanvas') || await page.$('canvas');
            if (!canvasHandle) throw new Error('Canvas element not found for screenshot');

            // Get bounding box for reliable page-level screenshot
            // Also force no border/outline to prevent artifacts
            await page.addStyleTag({ content: 'canvas { border: none !important; outline: none !important; box-shadow: none !important; }' });

            const boundingBox = await canvasHandle.boundingBox();
            if (!boundingBox) throw new Error('Canvas has no bounding box');

            // 1. Save JPEG
            await page.waitForTimeout(500); // Settle buffer
            const jpegPath = path.join(downloadPath, `${baseFilename}.jpg`);
            await page.screenshot({
                path: jpegPath,
                type: 'jpeg',
                quality: 95,
                clip: boundingBox
            });
            console.log(`   ✅ JPEG saved: ${baseFilename}.jpg`);

            // 2. Save PNG (if transparent)
            let pngPath = null;
            if (hasTransparency) {
                console.log('   📥 Saving PNG (Transparency preserved)...');
                pngPath = path.join(downloadPath, `${baseFilename}.png`);
                await page.screenshot({
                    path: pngPath,
                    type: 'png',
                    omitBackground: true,
                    clip: boundingBox
                });
                console.log(`   ✅ PNG saved: ${baseFilename}.png`);
            }

            // Keep page open (do not close) to simulate human browsing
            console.log('   👀 Keeping tab open for next interaction...');

            return {
                generatorName,
                jpegPath,
                pngPath,
                parameters,
                hasTransparency,
                timestamp
            };

        } catch (error) {
            // Only close if error is critical, otherwise keep open might be better?
            // For now, keep behavior simple: if error, maybe page is stuck, so reload next time
            console.error('   ❌ Error during generation:', error.message);
            throw error;
        }
    }
}

module.exports = ImageGenerator;
