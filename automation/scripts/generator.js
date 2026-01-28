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
                    const widthInput = document.querySelector('#canvasWidth');
                    const heightInput = document.querySelector('#canvasHeight');

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

            // Click randomize button with human-like delay
            try {
                await page.waitForSelector('#randomBtn', { timeout: 5000 });
                await page.waitForTimeout(500 + Math.random() * 1000); // 0.5-1.5 seconds

                await page.evaluate(() => {
                    const btn = document.querySelector('#randomBtn');
                    if (btn) btn.click();
                });

                await page.waitForTimeout(3000 + Math.random() * 2000); // 3-5 seconds for render
            } catch (e) {
                console.log('   ⚠️ Could not click randomize, using current state');
                await page.waitForTimeout(2000);
            }

            // Check transparency
            const hasTransparency = await this.checkTransparency(page);
            console.log(`   Transparency: ${hasTransparency ? 'Yes (>50%)' : 'No'}`);

            // Get parameters
            const parameters = await this.getParameters(page, generatorName);

            // Setup download path
            const downloadPath = this.outputDir;
            await this.downloadFile(page, downloadPath);

            // Human-like delay before export
            await page.waitForTimeout(1000 + Math.random() * 1500); // 1-2.5 seconds

            // Export JPEG (required)
            console.log('   📥 Exporting JPEG...');
            await page.select('#exportFormat', 'jpeg');
            await page.waitForTimeout(500 + Math.random() * 500); // 0.5-1 second

            await page.click('#exportBtn');
            await page.waitForTimeout(4000 + Math.random() * 2000); // 4-6 seconds for download

            // Find downloaded JPEG file
            const files = fs.readdirSync(downloadPath);
            const jpegFile = files.find(f => f.endsWith('.jpg') && f.includes(generatorName));

            let jpegPath = null;
            if (jpegFile) {
                const oldPath = path.join(downloadPath, jpegFile);
                jpegPath = path.join(downloadPath, `${baseFilename}.jpg`);
                fs.renameSync(oldPath, jpegPath);
                console.log(`   ✅ JPEG saved: ${baseFilename}.jpg`);
            }

            // Export PNG if transparency detected
            let pngPath = null;
            if (hasTransparency) {
                console.log('   📥 Exporting PNG...');
                await page.waitForTimeout(1000 + Math.random() * 1000); // 1-2 seconds

                await page.select('#exportFormat', 'png');
                await page.waitForTimeout(500 + Math.random() * 500);

                await page.click('#exportBtn');
                await page.waitForTimeout(4000 + Math.random() * 2000); // 4-6 seconds

                const filesAfter = fs.readdirSync(downloadPath);
                const pngFile = filesAfter.find(f => f.endsWith('.png') && f.includes(generatorName) && !files.includes(f));

                if (pngFile) {
                    const oldPath = path.join(downloadPath, pngFile);
                    pngPath = path.join(downloadPath, `${baseFilename}.png`);
                    fs.renameSync(oldPath, pngPath);
                    console.log(`   ✅ PNG saved: ${baseFilename}.png`);
                }
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
