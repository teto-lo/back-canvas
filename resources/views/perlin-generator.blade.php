<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Perlin Noise Generator</title>
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 350px 1fr;
            gap: 20px;
            align-items: start;
        }

        .controls {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            max-height: calc(100vh - 40px);
            overflow-y: auto;
            position: sticky;
            top: 20px;
        }

        .canvas-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 0;
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        h1 {
            font-size: 24px;
            font-weight: 700;
            color: #1a202c;
            margin-bottom: 8px;
        }

        .subtitle {
            color: #718096;
            font-size: 14px;
            margin-bottom: 24px;
        }

        .section {
            margin-bottom: 24px;
        }

        .section-title {
            font-size: 12px;
            font-weight: 600;
            color: #4a5568;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
        }

        .param-group {
            margin-bottom: 16px;
        }

        label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            color: #2d3748;
            margin-bottom: 6px;
        }

        input[type="range"] {
            width: 100%;
            height: 6px;
            border-radius: 3px;
            background: #e2e8f0;
            outline: none;
            -webkit-appearance: none;
        }

        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #667eea;
            cursor: pointer;
            transition: all 0.2s;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.2);
            background: #5a67d8;
        }

        input[type="number"] {
            width: 100%;
            padding: 8px 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.2s;
        }

        input[type="number"]:focus {
            outline: none;
            border-color: #667eea;
        }

        input[type="color"] {
            width: 60px;
            height: 36px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            cursor: pointer;
        }

        select {
            width: 100%;
            padding: 8px 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            background: white;
            cursor: pointer;
            transition: border-color 0.2s;
        }

        select:focus {
            outline: none;
            border-color: #667eea;
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }

        .btn {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            margin-bottom: 8px;
        }

        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary {
            background: #e2e8f0;
            color: #2d3748;
        }

        .btn-secondary:hover {
            background: #cbd5e0;
        }

        canvas {
            max-width: 100%;
            border-radius: 0;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            background: white;
        }

        .canvas-info {
            margin-top: 12px;
            font-size: 13px;
            color: #718096;
        }

        .value-display {
            display: inline-block;
            min-width: 40px;
            text-align: right;
            font-weight: 600;
            color: #667eea;
        }

        .color-palette {
            margin-top: 8px;
        }

        .color-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }

        .home-link {
            display: inline-block;
            margin-bottom: 16px;
            color: #667eea;
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
        }

        .home-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="controls">
            <a href="{{ route('home') }}" class="home-link">← Back to Home</a>
            
            <h1>パーリンノイズ生成 (Perlin Noise)</h1>
            <p class="subtitle">滑らかで有機的なノイズパターン</p>

            <!-- Canvas Size -->
            <div class="section">
                <div class="section-title">キャンバスサイズ</div>
                <div class="param-group">
                    <label>幅 (Width px)</label>
                    <input type="number" id="width" value="1600" min="100" max="4096">
                </div>
                <div class="param-group">
                    <label>高さ (Height px)</label>
                    <input type="number" id="height" value="1200" min="100" max="4096">
                </div>
            </div>

            <!-- Noise Type -->
            <div class="section">
                <div class="section-title">ノイズタイプ</div>
                <select id="noiseType">
                    <option value="0">クラシックパーリン (Classic)</option>
                    <option value="1">シンプレックス (Simplex)</option>
                    <option value="2">タービュランス (Turbulence)</option>
                    <option value="3">リッジ (Ridged)</option>
                </select>
            </div>

            <!-- Colors -->
            <div class="section">
                <div class="section-title">カラーパレット</div>
                <div id="colorPaletteContainer" class="color-palette"></div>
                <button id="addColorBtn" class="btn btn-secondary">+ 色を追加</button>
            </div>

            <!-- Background -->
            <div class="section">
                <div class="section-title">背景</div>
                <div class="param-group">
                    <label>背景色</label>
                    <input type="color" id="colorBg" value="#f8fafc">
                </div>
                <div class="checkbox-group">
                    <input type="checkbox" id="bgTransparent">
                    <label for="bgTransparent">背景を透過</label>
                </div>
            </div>

            <!-- Parameters -->
            <div class="section">
                <div class="section-title">ノイズパラメータ</div>
                
                <div class="param-group">
                    <label>
                        スケール (大きさ): <span class="value-display" id="scaleValue">50</span>
                    </label>
                    <input type="range" id="scale" min="1" max="100" value="50">
                </div>

                <div class="param-group">
                    <label>
                        オクターブ (詳細度): <span class="value-display" id="octavesValue">4</span>
                    </label>
                    <input type="range" id="octaves" min="1" max="8" value="4">
                </div>

                <div class="param-group">
                    <label>
                        固執度 (滑らかさ Persistence): <span class="value-display" id="persistenceValue">50</span>
                    </label>
                    <input type="range" id="persistence" min="0" max="100" value="50">
                </div>

                <div class="param-group">
                    <label>
                        空隙性 (周波数倍率 Lacunarity): <span class="value-display" id="lacunarityValue">2.0</span>
                    </label>
                    <input type="range" id="lacunarity" min="10" max="40" value="20">
                    <small style="color: #718096; font-size: 11px;">1.0 - 4.0</small>
                </div>

                <div class="param-group">
                    <label>
                        シード (Seed): <span class="value-display" id="seedValue">1234</span>
                    </label>
                    <input type="range" id="seed" min="0" max="9999" value="1234">
                </div>
            </div>

            <!-- Actions -->
            <div class="section">
                <button id="randomBtn" class="btn btn-secondary">🎲 ランダム生成</button>
                
                <div class="param-group">
                    <label>保存形式</label>
                    <select id="exportFormat">
                        <option value="png">PNG</option>
                        <option value="jpeg">JPEG</option>
                    </select>
                </div>
                <button id="exportBtn" class="btn btn-primary">💾 画像を保存</button>
            </div>
        </div>

        <div class="canvas-container">
            <canvas id="perlinCanvas" width="1920" height="1080"></canvas>
            <div class="canvas-info" id="canvasInfo">1920 × 1080 px</div>
        </div>
    </div>

    <script src="{{ asset('js/perlin-generator.js') }}"></script>
</body>
</html>
