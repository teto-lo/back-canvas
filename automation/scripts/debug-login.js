/**
 * Debug script to investigate AC-Illust Google login flow
 * This will capture HTML at each step to identify correct selectors
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function investigateLoginFlow() {
    console.log('🔍 Starting login flow investigation...\n');

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080'
        ],
        defaultViewport: null
    });

    const page = await browser.newPage();
    const outputDir = path.join(__dirname, '../debug-html');

    // Create output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
        // Step 1: Go to AC-Illust login page
        console.log('Step 1: Navigating to AC-Illust login page...');
        await page.goto('https://www.ac-illust.com/main/login.php', {
            waitUntil: 'networkidle0'
        });

        const step1Html = await page.content();
        fs.writeFileSync(path.join(outputDir, '1-login-page.html'), step1Html);
        console.log('✅ Saved: 1-login-page.html');
        console.log('   Please check for Google login button selector\n');

        // Wait for user to see the page
        console.log('⏸️  Pausing for 5 seconds...\n');
        await page.waitForTimeout(5000);

        // Step 2: Try to find and click Google login
        console.log('Step 2: Looking for Google login button...');

        // Try multiple possible selectors
        const possibleSelectors = [
            'a[href*="login_google"]',
            'a[href*="google"]',
            'button:has-text("Google")',
            '.google-login',
            '[class*="google"]'
        ];

        let googleButton = null;
        let usedSelector = null;

        for (const selector of possibleSelectors) {
            try {
                googleButton = await page.$(selector);
                if (googleButton) {
                    usedSelector = selector;
                    console.log(`✅ Found Google button with selector: ${selector}`);
                    break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        if (!googleButton) {
            console.log('❌ Could not find Google login button automatically');
            console.log('   Please click it manually in the browser window');
            console.log('   Waiting 30 seconds...\n');
            await page.waitForTimeout(30000);
        } else {
            await googleButton.click();
            console.log('✅ Clicked Google login button\n');
        }

        // Step 3: Wait for Google page and capture
        console.log('Step 3: Waiting for Google login page...');
        await page.waitForTimeout(3000);

        const step3Html = await page.content();
        const step3Url = page.url();
        fs.writeFileSync(path.join(outputDir, '2-google-page.html'), step3Html);
        console.log('✅ Saved: 2-google-page.html');
        console.log(`   URL: ${step3Url}`);
        console.log('   Please check for email input selector\n');

        // Step 4: Check for email input
        console.log('Step 4: Looking for email input...');
        const emailInput = await page.$('input[type="email"]');
        if (emailInput) {
            console.log('✅ Found email input with selector: input[type="email"]');
        } else {
            console.log('❌ Email input not found with standard selector');
            console.log('   Check the HTML file for correct selector\n');
        }

        console.log('\n📁 HTML files saved to:', outputDir);
        console.log('\n⏸️  Browser will stay open for 60 seconds for manual inspection...');
        await page.waitForTimeout(60000);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
        console.log('\n✅ Investigation complete!');
    }
}

investigateLoginFlow().catch(console.error);
