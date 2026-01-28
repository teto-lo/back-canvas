<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liquid Generator</title>
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif;
            background: linear-gradient(135deg, #e6f7ff 0%, #e6fffb 100%);
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
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 20px;
            padding: 24px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
            max-height: calc(100vh - 40px);
            overflow-y: auto;
            position: sticky;
            top: 20px;
        }

        .canvas-container {
            background: white;
            border-radius: 20px;
            padding: 24px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        h1 {
            font-size: 24px;
            font-weight: 700;
            background: linear-gradient(90deg, #1890ff, #13c2c2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
        }

        .subtitle {
            color: #8c8c8c;
            font-size: 14px;
            margin-bottom: 24px;
        }

        .section {
            margin-bottom: 24px;
        }

        .section-title {
            font-size: 12px;
            font-weight: 600;
            color: #595959;
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
            color: #595959;
            margin-bottom: 6px;
        }

        input[type="range"] {
            width: 100%;
            height: 6px;
            border-radius: 3px;
            background: #f0f0f0;
            outline: none;
            -webkit-appearance: none;
        }

        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #1890ff;
            box-shadow: 0 2px 6px rgba(24, 144, 255, 0.3);
            cursor: pointer;
            transition: transform 0.1s;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.1);
        }

        input[type="number"], input[type="color"] {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d9d9d9;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.3s;
        }

        input[type="number"]:focus {
            border-color: #1890ff;
            outline: none;
            box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
        }

        .btn {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 8px;
        }

        .btn-primary {
            background: linear-gradient(90deg, #1890ff, #13c2c2);
            color: white;
            box-shadow: 0 4px 15px rgba(24, 144, 255, 0.3);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(24, 144, 255, 0.4);
        }

        .btn-secondary {
            background: #f5f5f5;
            color: #595959;
        }

        .btn-secondary:hover {
            background: #e6e6e6;
        }

        .value-display {
            float: right;
            font-weight: 600;
            color: #1890ff;
        }

        .color-palette { margin-top: 8px; }
        .color-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .home-link { display: inline-block; margin-bottom: 16px; color: #1890ff; text-decoration: none; font-weight: 500; }
        .home-link:hover { text-decoration: underline; }
        
        select {
             width: 100%;
             padding: 8px 12px;
             border: 1px solid #d9d9d9;
             border-radius: 8px;
             font-size: 14px;
             background: white;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="controls">
            <a href="{{ route('home') }}" class="home-link">← ホームに戻る</a>
            
            <h1>リキッド生成 (Liquid)</h1>
            <p class="subtitle">流体のような歪曲背景</p>

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
                <div class="section-title">カラーパレット</div>
                <div id="colorPaletteContainer" class="color-palette"></div>
                <button id="addColorBtn" class="btn btn-secondary">+ 色を追加</button>
            </div>

            <!-- Parameters -->
            <div class="section">
                <div class="section-title">パラメータ</div>
                
                <div class="param-group">
                    <label>
                        歪み (Distortion): <span class="value-display" id="distortionValue">50</span>
                    </label>
                    <input type="range" id="distortion" min="0" max="100" value="50">
                </div>

                <div class="param-group">
                    <label>
                        サイズ (Scale): <span class="value-display" id="scaleValue">30</span>
                    </label>
                    <input type="range" id="scale" min="5" max="100" value="30">
                </div>

                <div class="param-group">
                    <label>
                        速度 (Speed): <span class="value-display" id="speedValue">20</span>
                    </label>
                    <input type="range" id="speed" min="0" max="100" value="20">
                </div>
            </div>

            <!-- Actions -->
            <div class="section">
                <button id="randomBtn" class="btn btn-secondary">🎲 ランダム生成</button>
                
                <div class="param-group" style="margin-top:10px;">
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
            <canvas id="liquidCanvas" width="1600" height="1200"></canvas>
            <div class="canvas-info" id="canvasInfo" style="margin-top:10px; color:#8c8c8c;">1600 × 1200 px</div>
        </div>
    </div>

    <script src="{{ asset('js/liquid-generator.js') }}"></script>
</body>
</html>
