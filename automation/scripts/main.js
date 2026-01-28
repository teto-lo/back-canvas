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
 * Main execution function
 */
async function main() {
    console.log('🚀 AC-Illust Auto-Upload System Started\n');
    console.log('='.repeat(60));

    // Validate environment variables
    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ Error: GEMINI_API_KEY not found in .env file');
        process.exit(1);
    }

    if (!config.upload.dryRun) {
        if (!process.env.AC_EMAIL || !process.env.AC_PASSWORD) {
            console.error('❌ Error: AC_EMAIL and AC_PASSWORD required for uploads');
            process.exit(1);
        }
    }

    // Initialize components
    const duplicateChecker = new DuplicateChecker();
    await duplicateChecker.connect();

    const imageGenerator = new ImageGenerator(config);
    await imageGenerator.launch();

    const aiMetadata = new AIMetadataGenerator(process.env.GEMINI_API_KEY, config);

    let uploader = null;
    if (!config.upload.dryRun) {
        uploader = new ACIllustUploader({
            email: process.env.AC_EMAIL,
            password: process.env.AC_PASSWORD
        }, config);
        await uploader.launch(false); // Non-headless for manual login support
        await uploader.login();
    }

    // Check daily limit
    const todayCount = await duplicateChecker.getTodayUploadCount();
    console.log(`📊 Today's uploads: ${todayCount}/${config.batch.dailyLimit}`);

    if (todayCount >= config.batch.dailyLimit) {
        console.log('⚠️  Daily limit reached. Exiting.');
        await cleanup();
        return;
    }

    // Calculate batch size
    const targetCount = Math.min(
        getRandomDelay(config.batch.minImages, config.batch.maxImages),
        config.batch.dailyLimit - todayCount
    );

    console.log(`🎯 Target: ${targetCount} images\n`);
    console.log('='.repeat(60) + '\n');

    let uploadedCount = 0;
    let attemptCount = 0;
    const maxAttempts = targetCount * 3; // Allow retries

    while (uploadedCount < targetCount && attemptCount < maxAttempts) {
        attemptCount++;
        console.log(`\n📦 Batch ${uploadedCount + 1}/${targetCount} (Attempt ${attemptCount})`);
        console.log('-'.repeat(60));

        try {
            // 1. Generate image
            const imageData = await imageGenerator.generateImage();

            // 2. Check for duplicates
            const dupCheck = await duplicateChecker.isDuplicate(imageData.jpegPath);
            if (dupCheck.isDuplicate) {
                console.log(`⚠️  Duplicate detected (hash: ${dupCheck.hash.substring(0, 8)}...)`);
                console.log(`   Skipping and trying again...`);

                // Clean up duplicate files
                fs.unlinkSync(imageData.jpegPath);
                if (imageData.pngPath) fs.unlinkSync(imageData.pngPath);

                continue;
            }

            // 3. Generate metadata
            const metadata = await aiMetadata.generateMetadata(
                imageData.generatorName,
                imageData.parameters
            );

            // Save metadata to file
            await aiMetadata.saveMetadata(
                metadata,
                `${imageData.generatorName}_${imageData.timestamp}`
            );

            // 4. Upload (or skip in dry-run mode)
            let uploadResult = { success: true, dryRun: config.upload.dryRun };

            if (!config.upload.dryRun) {
                uploadResult = await uploader.upload(
                    imageData.jpegPath,
                    imageData.pngPath,
                    metadata
                );
            } else {
                console.log('   ⚠️ DRY-RUN: Skipping actual upload');
            }

            // 5. Save record
            const record = await duplicateChecker.saveUploadRecord({
                jpegPath: imageData.jpegPath,
                pngPath: imageData.pngPath,
                generatorName: imageData.generatorName,
                parameters: imageData.parameters,
                metadata: metadata,
                status: uploadResult.success ? 'success' : 'failed'
            });

            console.log(`   ✅ Record saved (ID: ${record.id})`);

            uploadedCount++;
            console.log(`\n✨ Progress: ${uploadedCount}/${targetCount} completed`);

            // Rate limiting: wait between uploads
            if (uploadedCount < targetCount) {
                const delay = getRandomDelay(
                    config.batch.delayBetweenUploads.min,
                    config.batch.delayBetweenUploads.max
                );
                const minutes = Math.floor(delay / 60000);
                const seconds = Math.floor((delay % 60000) / 1000);

                console.log(`\n⏳ Waiting ${minutes}m ${seconds}s before next upload...`);
                await sleep(delay);
            }

        } catch (error) {
            console.error(`\n❌ Error in batch ${uploadedCount + 1}:`, error.message);
            console.log('   Continuing to next attempt...');

            // Wait a bit before retrying
            await sleep(30000); // 30 seconds
        }
    }

    // Cleanup
    async function cleanup() {
        console.log('\n' + '='.repeat(60));
        console.log('🧹 Cleaning up...');

        await imageGenerator.close();
        if (uploader) await uploader.close();
        await duplicateChecker.close();

        console.log('✅ Cleanup complete');
    }

    await cleanup();

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully uploaded: ${uploadedCount}/${targetCount}`);
    console.log(`📁 Images saved in: ./output/images/`);
    console.log(`📄 Metadata saved in: ./output/metadata/`);
    console.log(`💾 Database: ./database/uploads.db`);

    if (config.upload.dryRun) {
        console.log('\n⚠️  DRY-RUN MODE: No actual uploads were performed');
    }

    console.log('\n✨ Auto-upload system completed successfully!\n');
}

// Run main function
main().catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
});
