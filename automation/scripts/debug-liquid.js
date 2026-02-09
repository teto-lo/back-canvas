const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err));

    try {
        console.log('Navigating to Liquid Generator...');
        await page.goto('http://127.0.0.1:8000/liquid', { waitUntil: 'networkidle0' });

        await page.waitForTimeout(2000);

        // Take screenshot
        const screenshotPath = path.join(__dirname, 'debug_liquid_capture.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Screenshot saved to ${screenshotPath}`);

        console.log('Waiting 10 seconds for visual inspection...');
        await page.waitForTimeout(10000);

    } catch (e) {
        console.error('EXECUTION ERROR:', e);
    } finally {
        await browser.close();
    }
})();
