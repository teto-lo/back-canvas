/**
 * AI Metadata Generator Module
 * Uses Google Gemini API to generate titles, tags, and descriptions
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

class AIMetadataGenerator {
    constructor(apiKey, config) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: config.ai.model || 'gemini-pro' });
        this.config = config;
        this.metadataDir = path.join(__dirname, '../output/metadata');

        // Ensure metadata directory exists
        if (!fs.existsSync(this.metadataDir)) {
            fs.mkdirSync(this.metadataDir, { recursive: true });
        }
    }

    /**
     * Generate metadata from parameters
     */
    async generateMetadata(generatorName, parameters) {
        const prompt = this.buildPrompt(generatorName, parameters);

        try {
            console.log(`🤖 Generating metadata with AI...`);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Extract JSON from response (handle markdown code blocks)
            let jsonText = text;
            if (text.includes('```json')) {
                jsonText = text.split('```json')[1].split('```')[0].trim();
            } else if (text.includes('```')) {
                jsonText = text.split('```')[1].split('```')[0].trim();
            }

            const metadata = JSON.parse(jsonText);

            // Validate metadata
            this.validateMetadata(metadata);

            console.log(`   ✅ Title: ${metadata.title}`);
            console.log(`   ✅ Tags: ${metadata.tags.join(', ')}`);

            return metadata;

        } catch (error) {
            console.error('❌ AI metadata generation failed:', error.message);
            // Fallback to basic metadata
            return this.generateFallbackMetadata(generatorName);
        }
    }

    /**
     * Build prompt for AI
     */
    buildPrompt(generatorName, parameters) {
        const generatorDescriptions = {
            'noise': 'グレインノイズテクスチャ',
            'gradient': 'グラデーション背景',
            'aurora': 'オーロラ風の光の背景',
            'geometric': '幾何学パターン',
            'topography': '等高線マップ',
            'particle': 'パーティクル・ボケ効果',
            'blob': 'メタボール・有機的な形',
            'perlin': 'パーリンノイズ（雲・大理石）',
            'voronoi': 'ボロノイ図・セルパターン',
            'wave': '波・干渉パターン',
            'wagara': '日本の伝統的な和柄パターン',
            'tech': 'サイバーパンク・電子回路パターン',
            'memphis': 'メンフィススタイル・ポップ幾何学',
            'sunburst': '集中線・サンバースト',
            'liquid': 'リキッドマーブル・流体模様'
        };

        const description = generatorDescriptions[generatorName] || '抽象的な背景';

        // Extract colors and convert to names
        let colors = [];
        if (parameters.colors && Array.isArray(parameters.colors)) {
            colors = parameters.colors.map(hex => ({
                hex,
                name: this.getColorName(hex)
            }));
        } else if (parameters.color) {
            colors = [{
                hex: parameters.color,
                name: this.getColorName(parameters.color)
            }];
        }

        const colorNames = colors.map(c => c.name).join('、');

        return `イラストAC用のメタデータをJSON形式で生成してください。

画像タイプ: ${description}
使用色: ${colorNames || '不明'}

【良い例】
入力: グラデーション, 青→紫
出力:
{
  "title": "青紫グラデーション背景",
  "tags": ["背景", "グラデーション", "青", "紫", "壁紙", "デザイン素材", "プレゼン"],
  "description": "青から紫へ美しく変化するグラデーション背景"
}

入力: 幾何学パターン, 赤・オレンジ・黄色
出力:
{
  "title": "暖色系幾何学パターン",
  "tags": ["背景", "幾何学", "赤", "オレンジ", "黄色", "パターン", "カラフル"],
  "description": "赤・オレンジ・黄色の幾何学模様"
}

【必須ルール】
1. title: 20文字以内、色名を含む
2. tags: 7個、色名を必ず含む、検索されやすい単語
3. description: 30文字前後、色と用途を含む

出力(JSON のみ):`;
    }

    /**
     * Get color name from hex code
     */
    getColorName(hex) {
        const colorMap = {
            // 赤系
            '#ff0000': '赤', '#ff6b6b': '明るい赤', '#c92a2a': '濃い赤',
            '#fa5252': '赤', '#ff8787': 'ピンク系赤',
            // ピンク系
            '#ff69b4': 'ピンク', '#ffc0cb': 'ピンク', '#ff1493': '濃いピンク',
            '#faa2c1': 'ピンク', '#f06595': 'ピンク',
            // オレンジ系
            '#ff8c00': 'オレンジ', '#ffa500': 'オレンジ', '#ff7f50': 'オレンジ',
            '#ff922b': 'オレンジ', '#fd7e14': 'オレンジ',
            // 黄色系
            '#ffff00': '黄色', '#ffd700': '黄色', '#ffeb3b': '黄色',
            '#ffd43b': '黄色', '#fab005': '黄色',
            // 緑系
            '#00ff00': '緑', '#32cd32': '緑', '#228b22': '濃い緑',
            '#51cf66': '緑', '#40c057': '緑', '#2f9e44': '濃い緑',
            // 黄緑系
            '#adff2f': '黄緑', '#9acd32': '黄緑', '#8ce99a': '黄緑',
            // 青緑系
            '#00ffff': '水色', '#40e0d0': '水色', '#20c997': '青緑',
            '#3bc9db': '水色', '#15aabf': '青緑',
            // 青系
            '#0000ff': '青', '#1e90ff': '青', '#4169e1': '青',
            '#4dabf7': '青', '#339af0': '青', '#1c7ed6': '濃い青',
            // 紺系
            '#000080': '紺', '#191970': '紺', '#1864ab': '紺',
            // 紫系
            '#800080': '紫', '#9370db': '紫', '#8b00ff': '紫',
            '#9775fa': '紫', '#7950f2': '紫', '#6741d9': '濃い紫',
            // 茶系
            '#8b4513': '茶色', '#a0522d': '茶色', '#d2691e': '茶色',
            // グレー系
            '#808080': 'グレー', '#a9a9a9': 'グレー', '#d3d3d3': '明るいグレー',
            '#868e96': 'グレー', '#495057': '濃いグレー',
            // 白黒
            '#ffffff': '白', '#000000': '黒'
        };

        // Exact match
        if (colorMap[hex.toLowerCase()]) {
            return colorMap[hex.toLowerCase()];
        }

        // Approximate match by RGB values
        const rgb = this.hexToRgb(hex);
        if (!rgb) return 'カラフル';

        const { r, g, b } = rgb;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;

        // Grayscale
        if (diff < 30) {
            if (max < 50) return '黒';
            if (max > 200) return '白';
            return 'グレー';
        }

        // Determine dominant color
        if (r > g && r > b) {
            if (g > 100) return 'オレンジ';
            if (b > 100) return 'ピンク';
            return '赤';
        } else if (g > r && g > b) {
            if (r > 100) return '黄緑';
            if (b > 100) return '青緑';
            return '緑';
        } else if (b > r && b > g) {
            if (r > 100) return '紫';
            if (g > 100) return '水色';
            return '青';
        }

        return 'カラフル';
    }

    /**
     * Convert hex to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * Validate generated metadata
     */
    validateMetadata(metadata) {
        if (!metadata.title || metadata.title.length > 20) {
            throw new Error('Invalid title: must be 1-20 characters');
        }

        if (!metadata.tags || !Array.isArray(metadata.tags) || metadata.tags.length < 5) {
            throw new Error('Invalid tags: must have at least 5 tags');
        }

        // Ensure each tag is within limit
        metadata.tags = metadata.tags.slice(0, 10).map(tag =>
            tag.length > 15 ? tag.substring(0, 15) : tag
        );

        if (!metadata.description) {
            metadata.description = metadata.title;
        }

        // Truncate description if too long
        if (metadata.description.length > 200) {
            metadata.description = metadata.description.substring(0, 197) + '...';
        }
    }

    /**
     * Generate fallback metadata if AI fails
     */
    generateFallbackMetadata(generatorName) {
        const fallbacks = {
            'noise': {
                title: 'グレインノイズ背景',
                tags: ['背景', 'ノイズ', 'テクスチャ', 'シンプル', 'モダン'],
                description: 'シンプルなグレインノイズテクスチャ背景'
            },
            'gradient': {
                title: 'グラデーション背景',
                tags: ['背景', 'グラデーション', 'カラフル', 'モダン', 'デザイン'],
                description: 'カラフルなグラデーション背景素材'
            },
            'aurora': {
                title: 'オーロラ風背景',
                tags: ['背景', 'オーロラ', '光', '幻想的', 'カラフル'],
                description: '幻想的なオーロラ風の背景素材'
            },
            'geometric': {
                title: '幾何学パターン背景',
                tags: ['背景', '幾何学', 'パターン', 'モダン', 'シンプル'],
                description: 'モダンな幾何学パターン背景'
            },
            'topography': {
                title: '等高線マップ背景',
                tags: ['背景', '等高線', 'マップ', 'パターン', 'デザイン'],
                description: '等高線風のパターン背景素材'
            },
            'particle': {
                title: 'パーティクル背景',
                tags: ['背景', 'パーティクル', 'ボケ', '光', 'キラキラ'],
                description: 'キラキラしたパーティクル背景'
            },
            'blob': {
                title: '有機的な形の背景',
                tags: ['背景', '抽象的', '有機的', 'モダン', 'カラフル'],
                description: '有機的な形の抽象背景素材'
            },
            'perlin': {
                title: 'パーリンノイズ背景',
                tags: ['背景', 'ノイズ', 'テクスチャ', '雲', '抽象的'],
                description: '滑らかなノイズテクスチャ背景'
            },
            'voronoi': {
                title: 'セルパターン背景',
                tags: ['背景', 'パターン', 'セル', 'モザイク', 'デザイン'],
                description: 'セル状のパターン背景素材'
            },
            'wave': {
                title: '波模様の背景',
                tags: ['背景', '波', 'パターン', 'モダン', 'デザイン'],
                description: '波模様の抽象背景素材'
            },
            'wagara': {
                title: '和柄パターン背景',
                tags: ['背景', '和柄', '和風', 'パターン', '伝統'],
                description: '日本の伝統的な和柄パターン背景'
            },
            'tech': {
                title: 'テクノロジー背景',
                tags: ['背景', 'テクノロジー', '回路', 'サイバー', '未来'],
                description: 'サイバー感のあるテクノロジー背景'
            },
            'memphis': {
                title: 'メンフィス柄背景',
                tags: ['背景', 'メンフィス', 'ポップ', '幾何学', 'レトロ'],
                description: 'ポップなメンフィススタイルの背景'
            },
            'sunburst': {
                title: '集中線背景',
                tags: ['背景', '集中線', 'サンバースト', 'マンガ', 'インパクト'],
                description: 'インパクトのある集中線背景素材'
            },
            'liquid': {
                title: 'マーブル模様背景',
                tags: ['背景', 'マーブル', 'リキッド', '流体', 'おしゃれ'],
                description: '滑らかな流体マーブル模様の背景'
            }
        };

        return fallbacks[generatorName] || {
            title: '抽象的な背景',
            tags: ['背景', '壁紙', '抽象的', 'デザイン', 'モダン'],
            description: '抽象的な背景素材'
        };
    }

    /**
     * Save metadata to file
     */
    async saveMetadata(metadata, filename) {
        const filepath = path.join(this.metadataDir, `${filename}.json`);
        fs.writeFileSync(filepath, JSON.stringify(metadata, null, 2));
        return filepath;
    }
}

module.exports = AIMetadataGenerator;
