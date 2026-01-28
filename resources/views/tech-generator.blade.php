<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tech Generator</title>
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Courier New', Courier, monospace; /* Tech feel */
            background: #050510;
            color: #00ffcc;
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
            background: rgba(10, 10, 20, 0.9);
            border: 1px solid #00ffcc;
            border-radius: 4px;
            padding: 24px;
            box-shadow: 0 0 15px rgba(0, 255, 204, 0.2);
            max-height: calc(100vh - 40px);
            overflow-y: auto;
            position: sticky;
            top: 20px;
        }

        .canvas-container {
            background: #000;
            border: 1px solid #00ffcc;
            border-radius: 4px;
            padding: 24px;
            box-shadow: 0 0 15px rgba(0, 255, 204, 0.2);
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        h1 {
            font-size: 24px;
            font-weight: 700;
            color: #00ffcc;
            text-shadow: 0 0 5px #00ffcc;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .subtitle {
            color: #00aa88;
            font-size: 12px;
            margin-bottom: 24px;
            text-transform: uppercase;
        }

        .section {
            margin-bottom: 24px;
            border-left: 2px solid #00ffcc;
            padding-left: 10px;
        }

        .section-title {
            font-size: 12px;
            font-weight: 600;
            color: #fff;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }

        .param-group {
            margin-bottom: 16px;
        }

        label {
            display: block;
            font-size: 12px;
            font-weight: 500;
            color: #00ffcc;
            margin-bottom: 6px;
        }

        input[type="range"] {
            width: 100%;
            height: 4px;
            background: #003333;
            outline: none;
            -webkit-appearance: none;
        }

        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 12px;
            height: 12px;
            border-radius: 0;
            background: #00ffcc;
            cursor: pointer;
            border: 1px solid #fff;
        }

        input[type="number"], input[type="color"] {
            width: 100%;
            padding: 8px;
            border: 1px solid #00ffcc;
            background: #001111;
            color: #00ffcc;
            font-family: inherit;
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #00ffcc;
            font-size: 12px;
        }

        .btn {
            width: 100%;
            padding: 12px;
            border: 1px solid #00ffcc;
            border-radius: 0;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .btn-primary {
            background: #00ffcc;
            color: #000;
        }

        .btn-primary:hover {
            background: #fff;
            box-shadow: 0 0 10px #00ffcc;
        }

        .btn-secondary {
            background: transparent;
            color: #00ffcc;
        }

        .btn-secondary:hover {
            background: rgba(0, 255, 204, 0.1);
        }

        .value-display {
            float: right;
            font-weight: 600;
            color: #fff;
        }
        
        .home-link {
            display: inline-block;
            margin-bottom: 16px;
            color: #00ffcc;
            text-decoration: none;
            font-size: 12px;
        }
        
        .home-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="controls">
            <a href="{{ route('home') }}" class="home-link">&lt;&lt; RETURN TO HOME</a>
            
            <h1>テック風生成 (Tech)</h1>
            <p class="subtitle">cyberpunk / circuit board design</p>

            <!-- Canvas Size -->
            <div class="section">
                <div class="section-title">SYSTEM CONFIG (Size)</div>
                <div class="param-group">
                    <label>WIDTH (px)</label>
                    <input type="number" id="width" value="1600" min="100" max="4096">
                </div>
                <div class="param-group">
                    <label>HEIGHT (px)</label>
                    <input type="number" id="height" value="1200" min="100" max="4096">
                </div>
            </div>

            <!-- Colors -->
            <div class="section">
                <div class="section-title">COLOR INTERFACE</div>
                <div class="param-group">
                    <label>GLOW COLOR</label>
                    <input type="color" id="color1" value="#00ffcc">
                </div>
                <div class="param-group">
                    <label>BACKGROUND COLOR</label>
                    <input type="color" id="colorBg" value="#050510">
                </div>
            </div>

            <!-- Parameters -->
            <div class="section">
                <div class="section-title">PARAMETERS</div>
                
                <div class="param-group">
                    <label>
                        SCALE: <span class="value-display" id="scaleValue">50</span>
                    </label>
                    <input type="range" id="scale" min="10" max="200" value="50">
                </div>

                <div class="param-group">
                    <label>
                        COMPLEXITY: <span class="value-display" id="complexityValue">50</span>
                    </label>
                    <input type="range" id="complexity" min="0" max="100" value="50">
                </div>

                <div class="param-group">
                    <label>
                        SPEED: <span class="value-display" id="speedValue">20</span>
                    </label>
                    <input type="range" id="speed" min="0" max="100" value="20">
                </div>
            </div>

            <!-- Actions -->
            <div class="section">
                <button id="randomBtn" class="btn btn-secondary">RANDOMIZE</button>
                
                <div class="param-group" style="margin-top:10px;">
                    <label>FORMAT</label>
                    <select id="exportFormat" style="background:#001111; color:#00ffcc; border:1px solid #00ffcc; padding:8px; width:100%;">
                        <option value="png">PNG</option>
                        <option value="jpeg">JPEG</option>
                    </select>
                </div>
                <button id="exportBtn" class="btn btn-primary">EXPORT DATA</button>
            </div>
        </div>

        <div class="canvas-container">
            <canvas id="techCanvas" width="1600" height="1200"></canvas>
            <div class="canvas-info" id="canvasInfo" style="color:#00ffcc; margin-top:10px;">1600 × 1200 px</div>
        </div>
    </div>

    <script src="{{ asset('js/tech-generator.js') }}"></script>
</body>
</html>
