/**
 * Uploader Module
 * Automates upload to AC-Illust using Puppeteer
 */

const puppeteer = require('puppeteer');
const path = require('path');

class ACIllustUploader {
    constructor(credentials, config) {
        this.email = credentials.email;
        this.password = credentials.password;
        this.config = config;
        this.browser = null;
        this.page = null;
    }

    /**
     * Launch browser with dedicated Chrome profile
     */
    async launch(headless = false) {
        const userDataDir = path.join(__dirname, '../chrome-profile');
        console.log(`🔧 専用Chromeプロファイルを使用します: ${userDataDir}`);

        this.browser = await puppeteer.launch({
            headless: headless ? 'new' : false,
            userDataDir: userDataDir,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--mute-audio',
                '--window-size=1920,1080'
            ],
            defaultViewport: null,
            ignoreDefaultArgs: ['--enable-automation']
        });

        const pages = await this.browser.pages();
        this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();

        await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });
    }

    /**
     * Close browser
     */
    async close() {
        if (this.page) await this.page.close().catch(() => { });
        if (this.browser) await this.browser.close().catch(() => { });
    }

    /**
     * Login to AC-Illust
     */
    async login() {
        if (!this.page) this.page = await this.browser.newPage();
        const page = this.page;

        console.log('🔐 イラストACのログイン状態を確認中...');

        try {
            await page.goto('https://www.ac-illust.com/creator/upload.php', {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // ログイン済みかどうかの真の判定：アップロードフィールドがあるか
            const isLoggedIn = await page.$('input#jpg_path');
            if (isLoggedIn) {
                console.log('   ✅ ログイン済みです');
                return true;
            }

            console.log('   ⚠️ ログインが必要です。Googleログインを開始します...');

            // Googleボタンを探す (複数のセレクタを試行)
            const googleSelectors = [
                'a[onclick*="provider=Google"]',
                '#btn-auth-google',
                '.btn-google',
                'a[href*="provider=Google"]'
            ];

            let buttonMatched = null;
            for (const selector of googleSelectors) {
                try {
                    const btn = await page.$(selector);
                    if (btn) {
                        buttonMatched = selector;
                        break;
                    }
                } catch (e) { }
            }

            if (!buttonMatched) {
                console.log('   ❌ Googleログインボタンが見つかりませんでした。');
                await page.screenshot({ path: path.join(__dirname, `../output/no_login_btn_${Date.now()}.png`) });
                return false;
            }

            console.log(`   🔵 Googleボタン (${buttonMatched}) をクリックします...`);
            await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (el) {
                    el.scrollIntoView();
                    el.click();
                }
            }, buttonMatched);

            // 遷移を待機
            await page.waitForTimeout(5000);

            // Googleアカウント選択画面のハンドル
            if (page.url().includes('accounts.google.com')) {
                const content = await page.content();
                if (content.includes('アカウントを選択') || content.includes('data-identifier')) {
                    console.log('   👤 アカウント選択画面を検知しました。');
                    try {
                        const accBtn = await page.waitForSelector('div[data-identifier]', { timeout: 10000 });
                        if (accBtn) {
                            console.log('   🤖 保存済みアカウントを自動選択します...');
                            await page.click('div[data-identifier]');
                            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => { });
                        }
                    } catch (e) {
                        console.log('   ⚠️ 自動選択に失敗しました。手動操作が必要です。');
                    }
                }
            }

            // 最終的なログイン成功確認（1分間ループで確認）
            console.log('   ⏳ ログイン完了を待機中...');
            const start = Date.now();
            while (Date.now() - start < 60000) {
                await page.waitForTimeout(3000);
                if (await page.$('input#jpg_path')) {
                    console.log('   ✅ ログインに成功しました');
                    return true;
                }
                // もし変なページにいたらアップロードページへ再試行
                if (page.url().includes('ac-illust.com') && !page.url().includes('login') && !page.url().includes('upload')) {
                    await page.goto('https://www.ac-illust.com/creator/upload.php', { waitUntil: 'networkidle0' }).catch(() => { });
                }
            }

            console.log('   ❌ ログインのタイムアウトまたは失敗です。');
            return false;

        } catch (error) {
            console.error('   ❌ ログインエラー:', error.message);
            return false;
        }
    }

    /**
     * イラストACへのアップロード
     */
    async upload(jpegPath, pngPath, metadata) {
        if (!this.page) this.page = await this.browser.newPage();
        const page = this.page;

        try {
            console.log('📤 イラストACにアップロードを開始します...');

            // アップロードページへ
            await page.goto('https://www.ac-illust.com/creator/upload.php', {
                waitUntil: 'networkidle0'
            });

            // ログインチェック
            if (!(await page.$('input#jpg_path'))) {
                console.log('   ⚠️ ページにアップロード項目がありません。ログインを試みます...');
                const loginResult = await this.login();
                if (!loginResult) throw new Error('自動ログインに失敗しました');

                await page.goto('https://www.ac-illust.com/creator/upload.php', {
                    waitUntil: 'networkidle0'
                });
            }

            await page.waitForTimeout(2000 + Math.random() * 2000);

            // JPEG
            console.log('   📎 JPEGをアップロード中...');
            const jpegInput = await page.$('input#jpg_path');
            if (!jpegInput) {
                const errPic = path.join(__dirname, `../output/upload_err_${Date.now()}.png`);
                await page.screenshot({ path: errPic });
                throw new Error(`アップロードフィールド消失 (URL: ${page.url()})`);
            }
            await jpegInput.uploadFile(jpegPath);

            // Processing wait
            console.log('   ⏳ 完了待機中...');
            try {
                await page.waitForFunction(() => {
                    return document.querySelectorAll('.uploaded-image img').length > 0 ||
                        document.querySelectorAll('.preview-area img').length > 0;
                }, { timeout: 30000 });
            } catch (e) { }
            await page.waitForTimeout(2000);

            // PNG
            if (pngPath) {
                console.log('   📎 PNGをアップロード中...');
                const pngInput = await page.$('input#png_path');
                if (pngInput) await pngInput.uploadFile(pngPath);
                await page.waitForTimeout(5000);
            }

            // Title
            console.log('   ✏️ タイトル入力...');
            await page.waitForTimeout(20000);
            await page.type('input[name="title"]', metadata.title, { delay: 100 });

            // Tags
            console.log('   🏷️ タグ入力...');
            await page.waitForTimeout(20000);
            try {
                const tagEd = 'ul.tag-editor';
                await page.waitForSelector(tagEd);
                await page.click(tagEd);
                let input = 'ul.tag-editor input';
                if (!(await page.$(input))) await page.click(`${tagEd} li.placeholder`);

                if (await page.$(input)) {
                    for (const tag of metadata.tags) {
                        await page.type(input, tag);
                        await page.keyboard.press('Enter');
                        await page.waitForTimeout(200);
                    }
                }
            } catch (e) {
                await page.evaluate((tags) => {
                    if (typeof jQuery !== 'undefined' && jQuery('#ntags').tagEditor) {
                        for (const tag of tags) jQuery('#ntags').tagEditor('addTag', tag);
                    } else {
                        const n = document.querySelector('#ntags');
                        if (n) n.value = tags.join(',');
                    }
                }, metadata.tags);
            }

            // Category
            try {
                await page.evaluate(() => {
                    const cb = document.getElementById('フレーム-109');
                    if (cb && !cb.checked) cb.click();
                });
            } catch (e) { }

            // Description
            if (metadata.description) {
                await page.type('textarea#illust_comment', metadata.description, { delay: 50 });
            }

            await page.waitForTimeout(20000);

            if (this.config.upload.dryRun) {
                console.log('   ⚠️ DRY-RUN skip');
                return { success: true, dryRun: true };
            }

            // Submit
            console.log('   🚀 送信...');
            const sub = await page.evaluate(() => {
                const b = document.querySelector('input#submit_btn');
                if (b) { b.click(); return true; }
                return false;
            });
            if (!sub) throw new Error('送信ボタンなし');

            try {
                await page.waitForSelector('#confirmCopyrightModal', { visible: true, timeout: 5000 });
                await page.evaluate(() => {
                    const ok = document.querySelector('#exec-upload');
                    if (ok) ok.click();
                });
            } catch (e) { }

            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
            const ok = !page.url().includes('upload.php');
            return { success: ok, url: page.url() };

        } catch (error) {
            console.error('   ❌ アップロードエラー:', error.message);
            throw error;
        }
    }
}

module.exports = ACIllustUploader;
