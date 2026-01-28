/**
 * Uploader Module
 * Automates upload to AC-Illust using Puppeteer
 */

const puppeteer = require('puppeteer');

class ACIllustUploader {
    constructor(credentials, config) {
        this.email = credentials.email;
        this.password = credentials.password;
        this.config = config;
        this.browser = null;
    }

    /**
     * Launch browser
     */
    async launch(headless = false) {
        this.browser = await puppeteer.launch({
            headless: headless ? 'new' : false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ],
            defaultViewport: { width: 1920, height: 1080 },
            ignoreDefaultArgs: ['--enable-automation']
        });

        // Remove webdriver flag
        const pages = await this.browser.pages();
        if (pages.length > 0) {
            this.page = pages[0];
        } else {
            this.page = await this.browser.newPage();
        }

        await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false
            });
        });
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
     * Login to AC-Illust (supports manual login for SNS auth)
     */
    async login() {
        const page = this.page || await this.browser.newPage();
        this.page = page;

        try {
            console.log('🔐 Logging in to AC-Illust...');

            // Check if we have saved cookies
            const fs = require('fs');
            const path = require('path');
            const cookiesPath = path.join(__dirname, '../cookies.json');

            if (fs.existsSync(cookiesPath)) {
                console.log('   📂 Loading saved session cookies...');
                const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
                await page.setCookie(...cookies);

                // Test if session is still valid
                await page.goto('https://www.ac-illust.com/creator/upload.php', {
                    waitUntil: 'networkidle0'
                });

                if (!page.url().includes('login')) {
                    console.log('   ✅ Login successful (using saved session)');
                    console.log('   ✅ Login successful (using saved session)');
                    // Keep page open
                    return true;
                }

                console.log('   ⚠️ Saved session expired, need to login again');
            }


            // If email/password provided and valid, try standard login
            const hasValidCredentials = this.email &&
                this.password &&
                !this.email.includes('your_email') &&
                !this.password.includes('your_password');

            if (hasValidCredentials) {
                await page.goto('https://www.ac-illust.com/main/login.php', {
                    waitUntil: 'networkidle0'
                });

                // Fill login form
                await page.type('input[name="login_id"]', this.email);
                await page.type('input[name="password"]', this.password);

                // Click login button
                await page.click('button[type="submit"]');
                await page.waitForNavigation({ waitUntil: 'networkidle0' });

                // Check if login was successful
                const url = page.url();
                if (url.includes('login')) {
                    throw new Error('Login failed - check credentials');
                }

                // Save cookies for future use
                const cookies = await page.cookies();
                fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
                console.log('   💾 Session cookies saved');

                console.log('   ✅ Login successful');
                console.log('   ✅ Login successful');
                // Keep page open
                console.log('   👀 Keeping session open...');
                return true;
            }

            // Manual login for SNS authentication (Google, etc.)
            console.log('\n⚠️  SNS Login Required (Google/Facebook/etc.)');
            console.log('   Please login manually in the browser window...');
            console.log('   The script will wait for you to complete login.\n');

            await page.goto('https://www.ac-illust.com/main/login.php', {
                waitUntil: 'networkidle0'
            });

            // Wait for user to login manually (check every 2 seconds)
            let loggedIn = false;
            const maxWaitTime = 300000; // 5 minutes
            const startTime = Date.now();

            while (!loggedIn && (Date.now() - startTime) < maxWaitTime) {
                await page.waitForTimeout(2000);

                // Check if we're on a logged-in page
                const currentUrl = page.url();
                if (!currentUrl.includes('login') &&
                    (currentUrl.includes('creator') || currentUrl.includes('mypage'))) {
                    loggedIn = true;
                    break;
                }
            }

            if (!loggedIn) {
                throw new Error('Login timeout - please try again');
            }

            // Human-like delay
            await page.waitForTimeout(1000 + Math.random() * 1000);

            // Save cookies for future use
            const cookies = await page.cookies();
            fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
            console.log('   💾 Session cookies saved for future use');
            console.log('   ✅ Login successful!\n');

            // Do not close page, keep it open for reuse
            console.log('   👀 Keeping session open...');
            return true;

        } catch (error) {
            await page.close();
            throw error;
        }
    }

    /**
     * Upload image to AC-Illust
     */
    async upload(jpegPath, pngPath, metadata) {
        const page = this.page || await this.browser.newPage();
        this.page = page;

        try {
            console.log('📤 Uploading to AC-Illust...');

            // Navigate to upload page
            await page.goto('https://www.ac-illust.com/creator/upload.php', {
                waitUntil: 'networkidle0'
            });

            // Human-like delay after page load
            await page.waitForTimeout(2000 + Math.random() * 2000); // 2-4 seconds

            // Upload JPEG (required)
            console.log('   📎 Uploading JPEG...');
            await page.waitForTimeout(1000 + Math.random() * 1000); // 1-2 seconds before upload

            const jpegInput = await page.$('input#jpg_path');
            await jpegInput.uploadFile(jpegPath);

            // Wait for upload processing (thumbnail appearance) - Critical fix
            console.log('   ⏳ Waiting for upload processing...');
            try {
                await page.waitForFunction(() => {
                    // Check for common upload success indicators
                    return document.querySelectorAll('.uploaded-image img').length > 0 ||
                        document.querySelectorAll('.preview-area img').length > 0;
                }, { timeout: 30000 });
            } catch (e) {
                console.log('   ⚠️ Upload wait timeout (20s), hoping file is ready...');
            }
            await page.waitForTimeout(2000);

            // Upload PNG if exists
            if (pngPath) {
                console.log('   📎 Uploading PNG...');
                await page.waitForTimeout(1000 + Math.random() * 1000); // 1-2 seconds

                const pngInput = await page.$('input#png_path');
                await pngInput.uploadFile(pngPath);
                await page.waitForTimeout(4000 + Math.random() * 2000); // 4-6 seconds
            }

            // SIMULATE HUMAN THINKING 1 (Before Metadata): 45-70 seconds
            console.log('   🤔 Thinking about title and tags... (~1 min)');
            await page.waitForTimeout(45000 + Math.random() * 25000);

            // Fill title
            console.log('   ✏️ Filling metadata...');
            await page.waitForTimeout(800 + Math.random() * 700); // 0.8-1.5 seconds

            await page.type('input[name="title"]', metadata.title, { delay: 100 + Math.random() * 100 }); // Type with human-like speed

            // Verify Title Input
            const titleVal = await page.evaluate(() => document.querySelector('input[name="title"]').value);
            if (!titleVal) {
                console.log('   ⚠️ Title input failed, retrying via JS...');
                await page.evaluate((val) => {
                    const input = document.querySelector('input[name="title"]'); // Fix syntax
                    input.value = val;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }, metadata.title);
            }

            // SIMULATE HUMAN THINKING 2 (Before Description/Category): 45-70 seconds
            console.log('   🤔 Reviewing tags and selecting category... (~1 min)');
            await page.waitForTimeout(45000 + Math.random() * 25000);

            // Fill tags (bulk entry)
            const tagsTextarea = await page.$('textarea#ntags');
            // Clear existing tags first just in case
            await tagsTextarea.click({ clickCount: 3 });
            await tagsTextarea.press('Backspace');
            const tagsString = metadata.tags.join(' ');
            await tagsTextarea.type(tagsString, { delay: 50 + Math.random() * 50 }); // Slower typing
            await page.waitForTimeout(500 + Math.random() * 500);

            // Select category: フレーム (Frame) - Requested by User
            try {
                // Find label with text 'フレーム'
                await page.evaluate(() => {
                    const labels = Array.from(document.querySelectorAll('label'));
                    const frameLabel = labels.find(l => l.innerText.trim() === 'フレーム');
                    if (frameLabel) {
                        const input = document.getElementById(frameLabel.getAttribute('for')) ||
                            frameLabel.querySelector('input');
                        if (input && !input.checked) input.click();
                    } else {
                        // Fallback
                        const frameInput = document.querySelector('input[id*="フレーム"]');
                        if (frameInput && !frameInput.checked) frameInput.click();
                    }
                });
                console.log('   📂 Selected category: Frame');
            } catch (e) {
                console.log('   ⚠️ Could not select Frame category');
            }

            // Fill description
            if (metadata.description) {
                await page.waitForTimeout(2000 + Math.random() * 2000);
                await page.type('textarea#illust_comment', metadata.description, { delay: 30 + Math.random() * 40 });
            }

            // Check if dry-run mode
            if (this.config.upload.dryRun) {
                console.log('   ⚠️ DRY-RUN MODE: Not submitting form');
                await page.screenshot({
                    path: `./output/dry-run-${Date.now()}.png`,
                    fullPage: true
                });
                return { success: true, dryRun: true };
            }

            // SIMULATE HUMAN THINKING 3 (Final Review): 20-40 seconds
            console.log('   🤔 Final check before submission... (~30s)');
            await page.waitForTimeout(20000 + Math.random() * 20000);

            // AI checkbox logic: Explicitly UNCHECK as per user request
            // (Handling case where browser/site might auto-restore state)
            try {
                await page.evaluate(() => {
                    const aiInput = document.getElementById('illust_ai_status');
                    if (aiInput && aiInput.checked) {
                        aiInput.click();
                    }
                });
                console.log('   🤖 Ensured AI checkbox is OFF');
            } catch (e) {
                console.log('   ⚠️ Could not access AI checkbox');
            }

            await page.waitForTimeout(1000);

            // Submit form
            console.log('   🚀 Submitting form...');

            // Submit form using JS click to bypass overlays
            console.log('   🚀 Submitting form...');

            // Scroll to bottom
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            await page.waitForTimeout(1000);

            // Force click using JS
            const submitted = await page.evaluate(() => {
                const btn = document.querySelector('input#submit_btn');
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            });

            if (!submitted) {
                console.log('   ❌ Submit button not found!');
                throw new Error('Submit button not found');
            }

            // Wait for confirmation modal
            try {
                await page.waitForSelector('#confirmCopyrightModal', { visible: true, timeout: 5000 });
                await page.waitForTimeout(1000);

                // Click upload button in modal using JS
                await page.evaluate(() => {
                    const confirmBtn = document.querySelector('#exec-upload');
                    if (confirmBtn) confirmBtn.click();
                });
            } catch (e) {
                console.log('   ⚠️ Modal handling issue (might have submitted directly or timed out):', e.message);
                // Fallback attempt to click if selector failed but button exists
                await page.evaluate(() => {
                    const confirmBtn = document.querySelector('#exec-upload');
                    if (confirmBtn) confirmBtn.click();
                });
            }

            // Wait for upload to complete
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });

            // Check for success
            const currentUrl = page.url();
            const success = !currentUrl.includes('upload.php');

            if (success) {
                console.log('   ✅ Upload successful!');
            } else {
                console.log('   ⚠️ Upload may have failed - check manually');
            }

            // Keep page open
            console.log('   👀 Keeping session open...');
            return { success, url: currentUrl };

        } catch (error) {
            console.error('   ❌ Upload error:', error.message);

            // Take screenshot for debugging
            try {
                await page.screenshot({
                    path: `./output/error-${Date.now()}.png`,
                    fullPage: true
                });
            } catch (e) { }

            // Keep page open for debugging
            throw error;
        }
    }
}

module.exports = ACIllustUploader;
