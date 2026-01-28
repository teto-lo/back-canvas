const Puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const config = require('../config.json');

// Mock Data
const MOCK_IMAGE_PATH = path.join(__dirname, '../output/images/test_upload.jpg');
const MOCK_METADATA = {
    title: "テスト投稿 (Test Upload)",
    tags: ["背景", "テスト", "幾何学", "パターン", "グラデーション"],
    description: "これあ自動アップロードのテスト投稿です。後で削除します。"
};

// Ensure mock image exists
if (!fs.existsSync(MOCK_IMAGE_PATH)) {
    // Copy an existing image or create dummy
    const existing = fs.readdirSync(path.join(__dirname, '../output/images')).find(f => f.endsWith('.jpg'));
    if (existing) {
        fs.copyFileSync(path.join(__dirname, '../output/images', existing), MOCK_IMAGE_PATH);
    } else {
        console.error('No images found to use for test');
        process.exit(1);
    }
}

async function runTest() {
    console.log('🚀 Starting Isolated Upload Test...');

    const browser = await Puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1280, height: 800 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        // LOGIN
        console.log('🔐 Logging in...');
        const cookiesPath = path.join(__dirname, '../cookies.json');
        if (fs.existsSync(cookiesPath)) {
            const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
            await page.setCookie(...cookies);
            await page.goto('https://www.ac-illust.com/creator/upload.php', { waitUntil: 'networkidle0' });
        }

        if (page.url().includes('login')) {
            console.log('   ⚠️ Login required (Cookies expired or missing). Please login manually.');
            await page.waitForTimeout(30000); // Give time to login
        }

        console.log('📤 Navigating to Upload Page...');
        if (!page.url().includes('upload.php')) {
            await page.goto('https://www.ac-illust.com/creator/upload.php', { waitUntil: 'networkidle0' });
        }

        // UPLOAD
        console.log('📎 Uploading Image...');
        const fileInput = await page.$('input#jpg_path');
        await fileInput.uploadFile(MOCK_IMAGE_PATH);

        // Wait for upload processing (thumbnail appearance)
        console.log('⏳ Waiting for image upload processing...');
        // Look for any image that appears in the upload area
        try {
            await page.waitForFunction(() => {
                const img = document.querySelector('.uploaded-image img') || document.querySelector('.preview-area img');
                // Note: Selector is a guess, but generic waiting helps. 
                // Better: Wait for the "required" error to disappear or just wait longer.
                return true;
            }, { timeout: 10000 });
        } catch (e) { }

        await page.waitForTimeout(10000); // Generous wait for upload

        // Verify upload
        const isUploaded = await page.evaluate(() => {
            const fileInput = document.querySelector('input#jpg_path');
            // Check if file is selected or preview exists
            return fileInput.files.length > 0;
        });
        console.log(`   Image Uploaded state: ${isUploaded}`);

        // FORM FILL with verification
        console.log('✏️ Filling Metadata...');
        await page.type('input[name="title"]', MOCK_METADATA.title, { delay: 100 });

        // Verify Title
        const titleValue = await page.evaluate(() => document.querySelector('input[name="title"]').value);
        console.log(`   Title set to: "${titleValue}"`);

        if (!titleValue) {
            console.log('   RETRYING Title input via JS...');
            await page.evaluate((val) => {
                const input = document.querySelector('input[name="title"]');
                input.value = val;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }, MOCK_METADATA.title);
        }

        await page.type('textarea#ntags', MOCK_METADATA.tags.join(' '));

        // Category: Frame
        console.log('📂 Selecting Category (Frame)...');
        await page.evaluate(() => {
            const labels = Array.from(document.querySelectorAll('label'));
            const frameLabel = labels.find(l => l.innerText.trim() === 'フレーム');
            if (frameLabel) frameLabel.click();
        });

        await page.type('textarea#illust_comment', MOCK_METADATA.description);

        // AI Checkbox: Ensure UNCHECKED
        console.log('🤖 Ensuring AI Checkbox is OFF...');
        await page.evaluate(() => {
            const aiInput = document.getElementById('illust_ai_status');
            if (aiInput && aiInput.checked) aiInput.click();
        });

        await page.waitForTimeout(1000);

        // SUBMIT
        console.log('🚀 Submitting Form (JS Click)...');
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
            document.querySelector('#submit_btn').click();
        });

        // MODAL
        console.log('⏳ Waiting for Modal...');
        await page.waitForSelector('#confirmCopyrightModal', { visible: true, timeout: 5000 });
        await page.waitForTimeout(500);

        console.log('✅ Modal Appeared. Clicking Exec Upload...');
        await page.evaluate(() => {
            document.querySelector('#exec-upload').click();
        });

        // SUCCESS CHECK
        console.log('⏳ Waiting for Navigation...');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });

        if (!page.url().includes('upload.php')) {
            console.log('🎉 Upload SUCCESS!');
        } else {
            console.log('❌ Upload Failed (URL is still upload.php)');
            await page.screenshot({ path: 'test_failure.png' });
        }

    } catch (error) {
        console.error('❌ Error:', error);
        await page.screenshot({ path: 'test_error.png' });
    } finally {
        // await browser.close(); // Keep open for inspection
        console.log('👀 Browser left open for inspection');
    }
}

runTest();
