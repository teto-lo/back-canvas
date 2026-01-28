/**
 * Test Script
 * Test individual components without uploading
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ImageGenerator = require('./generator');
const AIMetadataGenerator = require('./ai-metadata');
const DuplicateChecker = require('./duplicate-checker');

const config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8')
);

async function testImageGeneration() {
    console.log('\n🧪 Testing Image Generation...\n');

    const generator = new ImageGenerator(config);
    await generator.launch();

    try {
        const result = await generator.generateImage('perlin');
        console.log('\n✅ Image generation test passed');
        console.log('Result:', result);
    } catch (error) {
        console.error('❌ Image generation test failed:', error.message);
    }

    await generator.close();
}

async function testAIMetadata() {
    console.log('\n🧪 Testing AI Metadata Generation...\n');

    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY not found in .env');
        return;
    }

    const aiMetadata = new AIMetadataGenerator(process.env.GEMINI_API_KEY, config);

    try {
        const metadata = await aiMetadata.generateMetadata('perlin', {
            scale: 50,
            octaves: 4,
            noiseType: 'classic'
        });

        console.log('\n✅ AI metadata generation test passed');
        console.log('Metadata:', JSON.stringify(metadata, null, 2));
    } catch (error) {
        console.error('❌ AI metadata test failed:', error.message);
    }
}

async function testDuplicateChecker() {
    console.log('\n🧪 Testing Duplicate Checker...\n');

    const checker = new DuplicateChecker();
    await checker.connect();

    try {
        const count = await checker.getTodayUploadCount();
        console.log(`Today's upload count: ${count}`);

        const records = await checker.getAllRecords(5);
        console.log(`\nRecent uploads: ${records.length}`);

        console.log('\n✅ Duplicate checker test passed');
    } catch (error) {
        console.error('❌ Duplicate checker test failed:', error.message);
    }

    await checker.close();
}

async function runAllTests() {
    console.log('🚀 Running Component Tests\n');
    console.log('='.repeat(60));

    await testDuplicateChecker();
    await testAIMetadata();
    await testImageGeneration();

    console.log('\n' + '='.repeat(60));
    console.log('✨ All tests completed!\n');
}

// Run tests
runAllTests().catch(error => {
    console.error('\n💥 Test error:', error);
    process.exit(1);
});
