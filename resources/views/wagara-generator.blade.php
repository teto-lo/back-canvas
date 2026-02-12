<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wagara Generator</title>
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: "Hiragino Mincho ProN", "Yu Mincho", serif; /* Traditional feel */
            background: #fdfcf8;
            color: #3e3a39;
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
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid #d4d4d4;
            border-radius: 8px;
            padding: 24px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            max-height: calc(100vh - 40px);
            overflow-y: auto;
            position: sticky;
            top: 20px;
        }

        .canvas-container {
            background: white;
            border: 1px solid #d4d4d4;
            border-radius: 0;
            padding: 24px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        h1 {
            font-size: 24px;
            font-weight: 700;
            color: #b7282e; /* Traditional Red */
            margin-bottom: 8px;
            font-family: "Hiragino Mincho ProN", serif;
        }

        .subtitle {
            color: #6e6b66;
            font-size: 14px;
            margin-bottom: 24px;
        }

        .section {
            margin-bottom: 24px;
        }

        .section-title {
            font-size: 13px;
            font-weight: 600;
            color: #595857;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 6px;
            margin-bottom: 12px;
        }

        .param-group {
            margin-bottom: 16px;
        }

        label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            color: #3e3a39;
            margin-bottom: 6px;
        }

        input[type="range"] {
            width: 100%;
            height: 6px;
            background: #e0e0e0;
            outline: none;
            -webkit-appearance: none;
        }

        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #b7282e;
            cursor: pointer;
        }

        input[type="number"], select, input[type="color"] {
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
        }

        .btn {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
            transition: opacity 0.2s;
            margin-bottom: 8px;
        }

        .btn-primary {
            background: #b7282e;
            color: white;
        }

        .btn-secondary {
            background: #e0e0e0;
            color: #333;
        }

        .value-display {
            float: right;
            font-weight: 600;
            color: #b7282e;
        }
        
        /* Common styles reuse */
        .color-palette { margin-top: 8px; }
        .color-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .home-link { display: inline-block; margin-bottom: 16px; color: #b7282e; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="controls">
            <a href="{{ route('home') }}" class="home-link">← ホームに戻る</a>
            
            <h1>和柄生成 (Wagara)</h1>
            <p class="subtitle">日本の伝統的な模様を作成</p>

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

            <!-- Pattern Type -->
            <div class="section">
                <div class="section-title">模様選択 (Pattern)</div>
                <select id="patternType">
                    <option value="0">青海波 (Seigaiha - Waves)</option>
                    <option value="1">七宝 (Shippo - Seven Treasures)</option>
                    <option value="2">市松 (Ichimatsu - Checkered)</option>
                    <option value="3">矢絣 (Yagasuri - Arrow Feathers)</option>
                </select>
            </div>

            <!-- Colors -->
            <div class="section">
                <div class="section-title">配色 (Colors)</div>
                <div class="param-group">
                    <label>メイン色 (Main Color)</label>
                    <input type="color" id="color1" value="#2a4073"> <!-- Indigo -->
                </div>
                <div class="param-group">
                    <label>背景色 (Background Color)</label>
                    <input type="color" id="colorBg" value="#f2f2f2"> <!-- Off-white -->
                </div>
                <button id="swapColorsBtn" class="btn btn-secondary">⇅ 色を入れ替え</button>
            </div>

            <!-- Parameters -->
            <div class="section">
                <div class="section-title">調整 (Parameters)</div>
                
                <div class="param-group">
                    <label>
                        サイズ (Scale): <span class="value-display" id="scaleValue">50</span>
                    </label>
                    <input type="range" id="scale" min="10" max="200" value="50">
                </div>

                <div class="param-group">
                    <label>
                        線の太さ (Line Width): <span class="value-display" id="lineWidthValue">10</span>
                    </label>
                    <input type="range" id="lineWidth" min="1" max="50" value="10">
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
            <canvas id="wagaraCanvas" width="1600" height="1200"></canvas>
            <div class="canvas-info" id="canvasInfo">1600 × 1200 px</div>
        </div>
    </div>

    <script src="{{ asset('js/wagara-generator.js') }}"></script>
</body>
</html>
