
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    try {
        console.log('Navigating to blob generator...');
        await page.goto('http://127.0.0.1:8000/blob', { waitUntil: 'networkidle0' });

        await page.waitForTimeout(2000);

        console.log('Clicking Randomize...');
        await page.click('#randomBtn');

        const startTime = Date.now();
        const hashes = [];

        console.log('Tracking canvas changes for 10 seconds...');
        while (Date.now() - startTime < 10000) {
            const hash = await page.evaluate(() => {
                const c = document.querySelector('canvas');
                return c ? c.toDataURL().substring(0, 50) : 'no-canvas';
            });
            hashes.push({ t: Date.now() - startTime, h: hash });
            await page.waitForTimeout(100);
        }

        // Analyze changes
        let lastH = hashes[0].h;
        console.log('0ms: ' + lastH);
        for (const p of hashes) {
            if (p.h !== lastH) {
                console.log(`${p.t}ms: Hash CHANGED`);
                lastH = p.h;
            }
        }

    } catch (e) {
        console.error(e);
    }

    await browser.close();
})();
