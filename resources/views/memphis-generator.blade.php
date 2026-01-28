<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Memphis Generator</title>
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Verdana', sans-serif;
            background: #fff0f5; /* Lavalier */
            color: #333;
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
            background: #fff;
            border: 4px solid #333; /* Thick borders for Memphis style */
            border-radius: 0;
            padding: 24px;
            box-shadow: 8px 8px 0px #ff69b4; /* Pink shadow */
            max-height: calc(100vh - 40px);
            overflow-y: auto;
            position: sticky;
            top: 20px;
        }

        .canvas-container {
            background: #fff;
            border: 4px solid #333;
            padding: 24px;
            box-shadow: 8px 8px 0px #00ced1; /* Teal shadow */
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        h1 {
            font-size: 24px;
            font-weight: 900;
            color: #333;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 8px;
            text-shadow: 2px 2px 0px #ffff00; /* Yellow shadow */
        }

        .subtitle {
            color: #555;
            font-size: 14px;
            font-style: italic;
            margin-bottom: 24px;
        }

        .section {
            margin-bottom: 24px;
            border-bottom: 2px dashed #ddd;
            padding-bottom: 16px;
        }

        .section-title {
            font-size: 14px;
            font-weight: 800;
            color: #333;
            background: #e0ffff;
            display: inline-block;
            padding: 2px 8px;
            margin-bottom: 12px;
            transform: skew(-10deg);
        }

        .param-group {
            margin-bottom: 16px;
        }

        label {
            display: block;
            font-size: 12px;
            font-weight: 700;
            color: #333;
            margin-bottom: 6px;
        }

        input[type="range"] {
            width: 100%;
            height: 8px;
            background: #eee;
            outline: none;
            -webkit-appearance: none;
            border: 1px solid #333;
        }

        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            background: #333;
            cursor: pointer;
            border-radius: 0; /* Square thumb */
        }

        input[type="number"], input[type="color"] {
            width: 100%;
            padding: 8px;
            border: 2px solid #333;
            border-radius: 0;
            font-size: 14px;
            font-weight: bold;
        }

        .btn {
            width: 100%;
            padding: 12px;
            border: 3px solid #333;
            border-radius: 0;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
            margin-bottom: 8px;
            text-transform: uppercase;
        }

        .btn-primary {
            background: #ffd700; /* Gold */
            color: #333;
        }

        .btn-primary:hover {
            transform: translate(-4px, -4px);
            box-shadow: 4px 4px 0px #333;
        }

        .btn-secondary {
            background: #fff;
            color: #333;
        }

        .btn-secondary:hover {
            background: #eee;
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
            color: #333;
            text-decoration: none;
            font-weight: bold;
            border-bottom: 2px solid #333;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="controls">
            <a href="{{ route('home') }}" class="home-link">← ホームに戻る</a>
            
            <h1>メンフィス生成 (Memphis)</h1>
            <p class="subtitle">80年代風ポップな幾何学パターン</p>

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

            <!-- Colors -->
            <div class="section">
                <div class="section-title">ポップカラー (Palette)</div>
                <div id="colorPaletteContainer" class="color-palette"></div>
                <button id="addColorBtn" class="btn btn-secondary">+ 色を追加</button>
                <div class="param-group" style="margin-top:10px;">
                    <label>背景色</label>
                    <input type="color" id="colorBg" value="#f0f8ff">
                </div>
            </div>

            <!-- Parameters -->
            <div class="section">
                <div class="section-title">デザイン設定</div>
                
                <div class="param-group">
                    <label>
                        密度 (Density): <span class="value-display" id="densityValue">10</span>
                    </label>
                    <input type="range" id="density" min="2" max="20" value="10">
                </div>

                <div class="param-group">
                    <label>
                        サイズ (Scale): <span class="value-display" id="scaleValue">50</span>
                    </label>
                    <input type="range" id="scale" min="10" max="100" value="50">
                </div>
            </div>

            <!-- Actions -->
            <div class="section">
                <button id="randomBtn" class="btn btn-secondary">🎲 ランダム生成</button>
                
                <div class="param-group" style="margin-top:10px;">
                    <label>保存形式</label>
                    <select id="exportFormat" style="width:100%; padding:8px; border:2px solid #333; font-weight:bold;">
                        <option value="png">PNG</option>
                        <option value="jpeg">JPEG</option>
                    </select>
                </div>
                <button id="exportBtn" class="btn btn-primary">💾 画像を保存</button>
            </div>
        </div>

        <div class="canvas-container">
            <canvas id="memphisCanvas" width="1600" height="1200"></canvas>
            <div class="canvas-info" id="canvasInfo" style="margin-top:10px; font-weight:bold;">1600 × 1200 px</div>
        </div>
    </div>

    <script src="{{ asset('js/memphis-generator.js') }}"></script>
</body>
</html>
