/**
 * Test Slack Notifications (Dry Run)
 * Does NOT upload to AC-Illust
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const SlackNotifier = require('./slack-notifier');

// Mock config
const config = {
    slack: {
        enabled: true,
        port: 3000
    }
};

async function main() {
    console.log('🚀 Starting Slack Notification Test...');

    // 1. Create dummy image
    const dummyDir = path.join(__dirname, '../output/test');
    if (!fs.existsSync(dummyDir)) fs.mkdirSync(dummyDir, { recursive: true });

    const dummyImage = path.join(dummyDir, 'test_image.png');

    // Create a simple text image using canvas or just copy a file?
    // Let's assume we can just create a dummy file or copy if exists.
    // For simplicity, let's try to copy test_failure.png if exists, or create empty file
    try {
        if (fs.existsSync(path.join(__dirname, '../test_failure.png'))) {
            fs.copyFileSync(path.join(__dirname, '../test_failure.png'), dummyImage);
        } else {
            console.log('⚠️ No test image found, creating dummy text file as image (slack might fail preview)');
            fs.writeFileSync(dummyImage, 'dummy image content');
        }
    } catch (e) {
        console.log('Creating dummy file...');
        fs.writeFileSync(dummyImage, 'dummy content');
    }

    console.log(`📸 Dummy image created: ${dummyImage}`);

    // 2. Initialize Notifier
    const slackNotifier = new SlackNotifier(config);

    try {
        await slackNotifier.start();
    } catch (e) {
        console.error('❌ Failed to start Socket Mode:', e.message);
        return;
    }

    // 3. Send Notification
    const metadata = {
        title: "Test Image " + Date.now(),
        tags: ["test", "slack", "socket-mode"],
        description: "This is a test notification using Socket Mode."
    };

    console.log('🔔 Sending notification...');

    // Set a short timeout for test
    const approvalPromise = slackNotifier.sendApprovalRequest(dummyImage, metadata, "TestGenerator");

    console.log('\n👀 Check your Slack channel now!');
    console.log('   Click Approve, Reject, Postpone, or Edit.');
    console.log('   Waiting for your action in Slack... (Ctrl+C to cancel)\n');

    try {
        const result = await approvalPromise;
        console.log('\n' + '='.repeat(40));
        console.log(`🎉 Result Received: ${result.action}`);
        console.log(`👤 User: ${result.user}`);
        if (result.metadata) {
            console.log('📝 New Metadata:', result.metadata);
        }
        console.log('='.repeat(40));

    } catch (e) {
        console.error('Test failed:', e);
    } finally {
        await slackNotifier.stop();
        console.log('✅ Test Complete');
        process.exit(0);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
