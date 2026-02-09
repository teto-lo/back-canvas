<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Soft Gradient Generator</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #f0fdfa; /* Mint theme */
            --sidebar-bg: #ffffff;
            --text-color: #334155;
            --border-color: #ccfbf1;
            --primary-color: #2dd4bf; /* Teal-400 */
            --primary-hover: #14b8a6;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Outfit', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            height: 100vh;
            display: flex;
            overflow: hidden;
        }

        .sidebar {
            width: 340px;
            background-color: var(--sidebar-bg);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            padding: 24px;
            overflow-y: auto;
            flex-shrink: 0;
            box-shadow: 4px 0 24px rgba(45, 212, 191, 0.05);
            z-index: 10;
        }

        .header { margin-bottom: 32px; }
        .header h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 4px; color: #115e59; }
        .header a { text-decoration: none; color: inherit; }
        .header p { font-size: 0.875rem; color: #134e4a; }

        .control-section { display: flex; flex-direction: column; gap: 24px; margin-bottom: 32px; }
        .control-group { display: flex; flex-direction: column; gap: 8px; }

        label {
            font-size: 0.825rem;
            font-weight: 600;
            color: #0f766e;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: flex;
            justify-content: space-between;
        }

        input[type="range"] {
            -webkit-appearance: none;
            width: 100%;
            height: 6px;
            background: #ccfbf1;
            border-radius: 3px;
            outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            background: var(--primary-color);
            border-radius: 50%;
            cursor: pointer;
            transition: transform 0.1s;
            box-shadow: 0 2px 4px rgba(45, 212, 191, 0.2);
        }
        input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.1); }

        select, input[type="number"] {
            width: 100%;
            padding: 10px;
            border-radius: 8px;
            border: 1px solid #ccfbf1;
            background-color: white;
            font-family: inherit;
            color: inherit;
        }

        .action-buttons {
            margin-top: auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .btn {
            padding: 12px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
            font-size: 0.9rem;
        }
        .btn-primary { background-color: var(--primary-color); color: white; box-shadow: 0 4px 6px -1px rgba(45, 212, 191, 0.3); }
        .btn-primary:hover { background-color: var(--primary-hover); transform: translateY(-1px); }
        .btn-secondary { background-color: white; border: 1px solid #ccfbf1; color: #115e59; }
        .btn-secondary:hover { background-color: #f0fdfa; }

        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            background-color: #ffffff;
            /* No grid for soft gradient to see blur better */
        }

        #softGradientCanvas {
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.05);
            max-width: 90%;
            max-height: 90%;
        }

        .canvas-info {
            position: absolute;
            bottom: 20px; right: 20px;
            background: rgba(255, 255, 255, 0.9);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.75rem;
            color: #115e59;
            font-family: 'JetBrains Mono', monospace;
            border: 1px solid #ccfbf1;
        }
    </style>
</head>
<body>
    <aside class="sidebar">
        <div class="header">
            <h1><a href="{{ route('home') }}">← ホームに戻る</a></h1>
            <p>ソフトグラデーション生成 (Soft & Blurry)</p>
        </div>

        <div class="control-section">
            <div class="control-group">
                <label>キャンバスサイズ</label>
                <div style="display: flex; gap: 10px;">
                    <div style="flex:1"><input type="number" id="width" value="1600"></div>
                    <div style="flex:1"><input type="number" id="height" value="1200"></div>
                </div>
            </div>

            <div class="control-group">
                <label>ベースカラー (Base)</label>
                <input type="color" id="baseColor" value="#ffffff" style="height:40px; cursor:pointer;">
            </div>

            <div class="control-group">
                <label>アクセントカラー (Accents)</label>
                <div id="colorContainer" style="display: flex; flex-direction: column; gap: 5px;">
                    <!-- JS will fill -->
                </div>
                <button id="addColorBtn" class="btn btn-secondary" style="margin-top:5px; padding:6px; font-size:0.8rem;">+ 色を追加</button>
            </div>

            <div class="control-group">
                <label>ぼかし強度 (Blur): <span id="blurValue">100</span></label>
                <input type="range" id="blur" min="0" max="200" value="100">
            </div>
            
            <div class="control-group">
                <label>円の数 (Bubbles): <span id="bubbleCountValue">5</span></label>
                <input type="range" id="bubbleCount" min="3" max="15" value="5">
            </div>

        </div>

        <div class="action-buttons">
            <button id="randomBtn" class="btn btn-secondary">🎲 ランダム生成</button>
            <div class="control-group">
                <label style="margin-bottom:0;">保存形式</label>
                <select id="exportFormat">
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                </select>
            </div>
            <button id="exportBtn" class="btn btn-primary">画像を保存</button>
        </div>
    </aside>

    <main class="main-content">
        <canvas id="softGradientCanvas" width="1600" height="1200"></canvas>
        <div class="canvas-info" id="canvasInfo">1600 × 1200 px</div>
    </main>

    <script src="{{ asset('js/soft-gradient-generator.js') }}"></script>
</body>
</html>
