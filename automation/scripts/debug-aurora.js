const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err));

    try {
        console.log('Navigating to Aurora Generator...');
        await page.goto('http://127.0.0.1:8000/aurora', { waitUntil: 'networkidle0' });

        await page.waitForTimeout(1000);

        // Check instance
        const initialParams = await page.evaluate(() => {
            if (!window.auroraGen) return null;
            return {
                width: window.auroraGen.params.width,
                speed: window.auroraGen.params.speed,
                colors: window.auroraGen.colors
            };
        });

        console.log('Initial Params:', JSON.stringify(initialParams, null, 2));

        if (!initialParams) {
            console.error('CRITICAL: window.auroraGen is missing!');
        } else {
            console.log('🎲 Clicking Random Button...');
            await page.click('#randomBtn');

            await page.waitForTimeout(1000);

            const newParams = await page.evaluate(() => {
                return {
                    width: window.auroraGen.params.width,
                    speed: window.auroraGen.params.speed,
                    colors: window.auroraGen.colors
                };
            });
            console.log('New Params:', JSON.stringify(newParams, null, 2));

            // Verify Change
            if (initialParams.speed === newParams.speed) {
                console.warn('⚠️ WARNING: Speed did not change!');
            } else {
                console.log('✅ Params updated successfully.');
            }
        }

        // Screenshot
        const screenshotPath = path.join(__dirname, 'debug_aurora_capture.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Screenshot saved to ${screenshotPath}`);

    } catch (e) {
        console.error('EXECUTION ERROR:', e);
    } finally {
        await browser.close();
    }
})();
