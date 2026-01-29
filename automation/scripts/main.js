/**
 * Main Orchestrator Script
 * Coordinates image generation, metadata creation, and upload
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ImageGenerator = require('./generator');
const AIMetadataGenerator = require('./ai-metadata');
const ACIllustUploader = require('./uploader');
const DuplicateChecker = require('./duplicate-checker');

// Load configuration
const config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8')
);

// Check for dry-run mode from command line
const isDryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
if (isDryRun) {
    config.upload.dryRun = true;
    console.log('⚠️  DRY-RUN MODE ENABLED - No actual uploads will be performed\n');
}

/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get random delay between min and max
 */
function getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Check if the current time is within working hours
 */
function isWorkingHours() {
    if (!config.schedule || !config.schedule.enabled) return true;

    const now = new Date();
    const hour = now.getHours();

    return hour >= config.schedule.startHour && hour < config.schedule.endHour;
}

/**
 * Wait until working hours start
 */
async function waitUntilWorkingHours() {
    if (!config.schedule || !config.schedule.enabled) return;

    while (!isWorkingHours()) {
        const now = new Date();
        console.log(`\n💤 Outside working hours (${now.getHours()}:${now.getMinutes()}). Waiting until ${config.schedule.startHour}:00...`);
        await sleep(15 * 60 * 1000); // Check every 15 minutes
    }
}

/**
 * Main execution function
 */
async function main() {
    console.log('🚀 AC-Illust Auto-Uploader (Resident Mode) Started\n');
    console.log('='.repeat(60));

    // Validate environment variables
    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ Error: GEMINI_API_KEY not found in .env file');
        process.exit(1);
    }

    // Initialize persistent components
    const duplicateChecker = new DuplicateChecker();
    await duplicateChecker.connect();

    const aiMetadata = new AIMetadataGenerator(process.env.GEMINI_API_KEY, config);

    const SlackNotifier = require('./slack-notifier');
    const slackNotifier = new SlackNotifier(config);

    // Initial Slack Start (Interactive Mode)
    if (config.slack && config.slack.enabled) {
        try {
            await slackNotifier.start();
        } catch (e) {
            console.error('⚠️ Slack Socket Mode起動失敗:', e.message);
        }
    }

    // 無限ループ開始
    while (true) {
        console.log('\n' + '='.repeat(60));
        console.log('💤 待機中: Slackからの開始指示を待っています...');
        console.log('='.repeat(60) + '\n');

        if (config.slack && config.slack.enabled) {
            await slackNotifier.waitForStartTrigger();
        }

        let imageGenerator = null;
        let uploader = null;
        let uploadedCount = 0;
        let targetCount = 0;

        try {
            // 1. Session Components Setup
            imageGenerator = new ImageGenerator(config);
            await imageGenerator.launch();

            if (!config.upload.dryRun) {
                uploader = new ACIllustUploader({
                    email: process.env.AC_EMAIL || '',
                    password: process.env.AC_PASSWORD || ''
                }, config);
                await uploader.launch(false);
                const loginSuccess = await uploader.login();
                if (!loginSuccess) throw new Error('ログインに失敗しました');
            }

            // 2. Batch Calculation
            const todayCount = await duplicateChecker.getTodayUploadCount();
            console.log(`📊 本日の累計投稿数: ${todayCount}/${config.batch.dailyLimit}`);

            if (todayCount >= config.batch.dailyLimit) {
                console.log('⚠️ 本日の上限に達しています。明日また実行してください。');
                if (slackNotifier) await slackNotifier.webClient.chat.postMessage({
                    channel: process.env.SLACK_CHANNEL_ID,
                    text: "⚠️ 今日の上限に達しているため、今回のバッチを終了します。"
                });
                // この回の完了処理へ
            } else {
                targetCount = Math.min(
                    getRandomDelay(config.batch.minImages, config.batch.maxImages),
                    config.batch.dailyLimit - todayCount
                );
                console.log(`🎯 今回の目標投稿件数: ${targetCount} 枚\n`);

                // 3. Main Loop
                let attemptCount = 0;
                const maxAttempts = targetCount * 3;

                while (uploadedCount < targetCount && attemptCount < maxAttempts) {
                    await waitUntilWorkingHours();
                    attemptCount++;
                    console.log(`\n📦 バッチ処理 ${uploadedCount + 1}/${targetCount} (試行 ${attemptCount})`);

                    try {
                        const imageData = await imageGenerator.generateImage();
                        const dupCheck = await duplicateChecker.isDuplicate(imageData.jpegPath);
                        if (dupCheck.isDuplicate) {
                            console.log('⚠️ 重複検知。再生成します...');
                            try { fs.unlinkSync(imageData.jpegPath); if (imageData.pngPath) fs.unlinkSync(imageData.pngPath); } catch (e) { }
                            continue;
                        }

                        let metadata;
                        if (config.ai && config.ai.enabled) {
                            metadata = await aiMetadata.generateMetadata(imageData.generatorName, imageData.parameters);
                        } else {
                            metadata = aiMetadata.generateFallbackMetadata(imageData.generatorName);
                        }

                        await aiMetadata.saveMetadata(metadata, `${imageData.generatorName}_${imageData.timestamp}`);

                        if (config.slack && config.slack.enabled) {
                            const result = await slackNotifier.sendApprovalRequest(imageData.jpegPath, metadata, imageData.generatorName);
                            if (result.action === 'reject') {
                                try { fs.unlinkSync(imageData.jpegPath); if (imageData.pngPath) fs.unlinkSync(imageData.pngPath); } catch (e) { }
                                continue;
                            }
                            if (result.action === 'postpone') {
                                console.log('🕒 保留。1時間待機...');
                                await sleep(3600000);
                            }
                            if (result.metadata) metadata = result.metadata;
                        }

                        let uploadResult = { success: true, dryRun: config.upload.dryRun };
                        if (!config.upload.dryRun) {
                            uploadResult = await uploader.upload(imageData.jpegPath, imageData.pngPath, metadata);
                        }

                        await duplicateChecker.saveUploadRecord({
                            jpegPath: imageData.jpegPath,
                            pngPath: imageData.pngPath,
                            generatorName: imageData.generatorName,
                            parameters: imageData.parameters,
                            metadata: metadata,
                            status: uploadResult.success ? 'success' : 'failed'
                        });

                        uploadedCount++;
                        if (uploadedCount < targetCount) {
                            const delay = getRandomDelay(config.batch.delayBetweenUploads.min, config.batch.delayBetweenUploads.max);
                            console.log(`\n⏳ 次の投稿まで待機中...`);
                            await sleep(delay);
                        }
                    } catch (err) {
                        console.error('\n❌ エラー:', err.message);
                        await sleep(10000);
                    }
                }
            }

        } catch (error) {
            console.error('\n💥 セッションエラー:', error.message);
        } finally {
            // Cleanup current session
            console.log('\n🧹 セッション終了処理中...');
            if (imageGenerator) await imageGenerator.close().catch(() => { });
            if (uploader) await uploader.close().catch(() => { });

            if (config.slack && config.slack.enabled && targetCount > 0) {
                await slackNotifier.sendCompletionSummary(uploadedCount, targetCount);
            }
            console.log('✅ セッション完了。次の指示を待ちます。');
        }
    }
}

main().catch(error => {
    console.error('\n💥 致命的エラー:', error);
    process.exit(1);
});
