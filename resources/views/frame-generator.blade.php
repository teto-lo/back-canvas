<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Frame Generator</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #fff1f2; /* Pastel Pink theme */
            --sidebar-bg: #ffffff;
            --text-color: #475569;
            --border-color: #fce7f3;
            --primary-color: #ec4899; /* Pink-500 */
            --primary-hover: #db2777;
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
            box-shadow: 4px 0 24px rgba(236, 72, 153, 0.05);
            z-index: 10;
        }

        .header { margin-bottom: 32px; }
        .header h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 4px; color: #831843; }
        .header a { text-decoration: none; color: inherit; }
        .header p { font-size: 0.875rem; color: #9d174d; }

        .control-section { display: flex; flex-direction: column; gap: 24px; margin-bottom: 32px; }
        .control-group { display: flex; flex-direction: column; gap: 8px; }

        label {
            font-size: 0.825rem;
            font-weight: 600;
            color: #831843;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: flex;
            justify-content: space-between;
        }

        input[type="range"] {
            -webkit-appearance: none;
            width: 100%;
            height: 6px;
            background: #fce7f3;
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
            box-shadow: 0 2px 4px rgba(236, 72, 153, 0.2);
        }
        input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.1); }

        select, input[type="number"] {
            width: 100%;
            padding: 10px;
            border-radius: 8px;
            border: 1px solid #fce7f3;
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
        .btn-primary { background-color: var(--primary-color); color: white; box-shadow: 0 4px 6px -1px rgba(236, 72, 153, 0.3); }
        .btn-primary:hover { background-color: var(--primary-hover); transform: translateY(-1px); }
        .btn-secondary { background-color: white; border: 1px solid #fce7f3; color: #831843; }
        .btn-secondary:hover { background-color: #fdf2f8; }

        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            background-image: 
                linear-gradient(45deg, #fdf2f8 25%, transparent 25%), 
                linear-gradient(-45deg, #fdf2f8 25%, transparent 25%), 
                linear-gradient(45deg, transparent 75%, #fdf2f8 75%), 
                linear-gradient(-45deg, transparent 75%, #fdf2f8 75%);
            background-size: 20px 20px;
            background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }

        #frameCanvas {
            box-shadow: 0 20px 50px rgba(236, 72, 153, 0.1);
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
            color: #831843;
            font-family: 'JetBrains Mono', monospace;
            border: 1px solid #fce7f3;
        }
    </style>
</head>
<body>
    <aside class="sidebar">
        <div class="header">
            <h1><a href="{{ route('home') }}">← ホームに戻る</a></h1>
            <p>フレーム生成 (Pastel Frame)</p>
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
                <label>フレームタイプ</label>
                <select id="frameType">
                    <option value="simple">シンプル (Simple)</option>
                    <option value="rounded">角丸 (Rounded)</option>
                    <option value="circle-corner">コーナー円 (Circle Corner)</option>
                    <option value="double">二重線 (Double Line)</option>
                    <option value="dots">ドット装飾 (Dots)</option>
                    <option value="mixed">ミックス (Mixed Shape)</option>
                </select>
            </div>

            <div class="control-group">
                <label>カラー (Colors)</label>
                <div style="display: flex; gap: 5px; margin-bottom:5px;">
                    <input type="color" id="color1" value="#f472b6" style="height:40px; border:none; border-radius:4px; cursor:pointer;">
                    <input type="color" id="color2" value="#a78bfa" style="height:40px; border:none; border-radius:4px; cursor:pointer;">
                    <input type="color" id="color3" value="#34d399" style="height:40px; border:none; border-radius:4px; cursor:pointer;">
                </div>
                <button id="randomColorBtn" class="btn btn-secondary" style="padding:6px;">🎨 ランダムパステル</button>
            </div>

            <div class="control-group">
                <label>太さ (Thickness): <span id="thicknessValue">50</span></label>
                <input type="range" id="thickness" min="10" max="150" value="50">
            </div>

            <div class="control-group">
                <label>余白 (Padding): <span id="paddingValue">40</span></label>
                <input type="range" id="padding" min="0" max="200" value="40">
            </div>
        </div>

        <div class="action-buttons">
            <button id="randomBtn" class="btn btn-secondary">🎲 ランダム生成</button>
            <div class="control-group">
                <label style="margin-bottom:0;">保存形式</label>
                <select id="exportFormat">
                    <option value="png">PNG (透過)</option>
                    <option value="jpeg">JPEG (白背景)</option>
                </select>
            </div>
            <button id="exportBtn" class="btn btn-primary">画像を保存</button>
        </div>
    </aside>

    <main class="main-content">
        <canvas id="frameCanvas" width="1600" height="1200"></canvas>
        <div class="canvas-info" id="canvasInfo">1600 × 1200 px</div>
    </main>

    <script src="{{ asset('js/frame-generator.js') }}"></script>
</body>
</html>
