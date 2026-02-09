const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({
        headless: true, // Headless for speed, or false to see it
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Capture Console Logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err));

    try {
        console.log('Navigating to Noise Generator...');
        await page.goto('http://127.0.0.1:8000/noise', { waitUntil: 'networkidle0' });

        // Check Canvas Existence
        const canvas = await page.$('#noiseCanvas');
        if (!canvas) {
            console.error('CRITICAL: #noiseCanvas not found!');
        } else {
            console.log('✅ #noiseCanvas found.');

            // Check Canvas Properties
            const props = await page.evaluate(() => {
                const c = document.getElementById('noiseCanvas');
                const gl = c.getContext('webgl');
                const inputW = document.getElementById('width');
                const inputH = document.getElementById('height');
                return {
                    width: c.width,
                    height: c.height,
                    styleWidth: c.style.width,
                    styleHeight: c.style.height,
                    glContext: !!gl,
                    glError: gl ? gl.getError() : 'No Context',
                    inputWidthVal: inputW ? inputW.value : 'missing',
                    inputHeightVal: inputH ? inputH.value : 'missing'
                };
            });
            console.log('Canvas Props:', props);
        }

        // Wait a bit for rendering
        await page.waitForTimeout(1000);

        // Take Screenshot
        const screenshotPath = path.join(__dirname, 'debug_noise_capture.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Screenshot saved to ${screenshotPath}`);

    } catch (e) {
        console.error('EXECUTION ERROR:', e);
    } finally {
        await browser.close();
    }
})();
