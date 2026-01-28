/**
 * Cookie Import Script
 * Manually import cookies from your browser to bypass Google login
 */

const fs = require('fs');
const path = require('path');

console.log('🍪 Cookie Import Helper\n');
console.log('This script helps you import cookies from your browser to bypass Google login.\n');
console.log('Steps:');
console.log('1. Open Chrome/Edge and login to AC-Illust with Google');
console.log('2. Press F12 to open DevTools');
console.log('3. Go to "Application" tab → "Cookies" → "https://www.ac-illust.com"');
console.log('4. Copy all cookies (right-click → Copy all as JSON or manually)');
console.log('5. Paste the cookies below when prompted\n');

// Example cookie format
const exampleCookies = [
    {
        "name": "PHPSESSID",
        "value": "your_session_id_here",
        "domain": ".ac-illust.com",
        "path": "/",
        "expires": -1,
        "httpOnly": true,
        "secure": false
    }
];

console.log('Example cookie format:');
console.log(JSON.stringify(exampleCookies, null, 2));
console.log('\n');
console.log('Alternative: Use EditThisCookie extension');
console.log('1. Install "EditThisCookie" Chrome extension');
console.log('2. Login to AC-Illust');
console.log('3. Click the cookie icon → Export');
console.log('4. Save the exported JSON to automation/cookies.json');
console.log('\n');

// Check if cookies.json exists
const cookiesPath = path.join(__dirname, '../cookies.json');
if (fs.existsSync(cookiesPath)) {
    console.log('✅ cookies.json already exists!');
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    console.log(`   Found ${cookies.length} cookies`);
} else {
    console.log('⚠️  cookies.json not found');
    console.log('   Create automation/cookies.json with your browser cookies');
}
