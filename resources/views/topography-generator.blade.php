<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Topography Generator</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet">
    <style>
        :root {
            --bg-color: #f1f5f9;
            --sidebar-bg: #ffffff;
            --text-color: #0f172a;
            --border-color: #e2e8f0;
            --primary-color: #0d9488; /* Teal */
            --primary-hover: #0f766e;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 0;
            font-family: 'Outfit', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            height: 100vh;
            display: flex;
            overflow: hidden;
        }

        /* Sidebar */
        .sidebar {
            width: 340px;
            background-color: var(--sidebar-bg);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            padding: 24px;
            overflow-y: auto;
            flex-shrink: 0;
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.03);
            z-index: 10;
        }

        .header {
            margin-bottom: 32px;
        }

        .header h1 {
            font-size: 1.25rem;
            font-weight: 700;
            margin: 0 0 4px 0;
            letter-spacing: -0.025em;
        }
        
        .header a {
            text-decoration: none;
            color: inherit;
        }

        .header p {
            font-size: 0.875rem;
            color: #64748b;
            margin: 0;
        }

        .control-section {
            display: flex;
            flex-direction: column;
            gap: 24px;
            margin-bottom: 32px;
        }

        .control-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        label {
            font-size: 0.825rem;
            font-weight: 600;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: flex;
            justify-content: space-between;
        }
        
        .checkbox-label {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 8px;
            text-transform: none;
            cursor: pointer;
            color: #475569;
        }

        .value-display {
            font-family: 'JetBrains Mono', monospace;
            color: #64748b;
            font-weight: 500;
        }

        input[type="range"] {
            -webkit-appearance: none;
            width: 100%;
            height: 6px;
            background: #e2e8f0;
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
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        /* Color Inputs */
        .color-row {
            display: flex;
            gap: 12px;
            align-items: center;
        }
        
        .color-input-wrapper {
             flex: 1;
             display: flex;
             flex-direction: column;
             gap: 4px;
        }

        input[type="color"] {
            -webkit-appearance: none;
            border: none;
            width: 100%;
            height: 40px;
            border-radius: 8px;
            cursor: pointer;
            padding: 0;
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }
        
        input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }

        /* Action Buttons */
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
            font-family: inherit;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
            font-size: 0.9rem;
        }

        .btn-primary {
            background-color: var(--primary-color);
            color: white;
            box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.2);
        }

        .btn-primary:hover {
            background-color: var(--primary-hover);
            transform: translateY(-1px);
        }
        
        .btn-secondary {
            background-color: white;
            border: 1px solid #cbd5e1;
            color: #334155;
        }

        /* Main Canvas Area */
        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            background-image: 
                linear-gradient(45deg, #e5e7eb 25%, transparent 25%), 
                linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), 
                linear-gradient(45deg, transparent 75%, #e5e7eb 75%), 
                linear-gradient(-45deg, transparent 75%, #e5e7eb 75%);
            background-size: 20px 20px;
        }

        #topographyCanvas {
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
            max-width: 90%;
            max-height: 90%;
            background: transparent;
        }

        .canvas-info {
            position: absolute;
            bottom: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.9);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.75rem;
            color: #64748b;
            font-family: 'JetBrains Mono', monospace;
            backdrop-filter: blur(4px);
            border: 1px solid #e2e8f0;
        }
        
        select {
             width: 100%; 
             padding: 10px; 
             border-radius: 8px; 
             border: 1px solid #cbd5e1;
             background-color: white;
             font-family: inherit;
             color: inherit;
        }

    </style>
</head>

<body>
    <!-- Sidebar -->
    <aside class="sidebar">
        <div class="header">
            <h1><a href="{{ route('home') }}">← ホームに戻る</a></h1>
            <p>等高線生成 (Contour Lines & Waves)</p>
        </div>

        <div class="control-section">
            <div class="control-group">
                <label>キャンバスサイズ</label>
                <div style="display: flex; gap: 10px;">
                    <div style="flex:1">
                        <input type="number" id="width" value="1600" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                    </div>
                    <div style="flex:1">
                        <input type="number" id="height" value="1200" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                    </div>
                </div>
            </div>

            <!-- Colors -->
            <div class="control-group">
                <label>カラー (Colors)</label>
                <div id="colorParamsContainer" style="display: flex; flex-direction: column; gap: 8px;">
                     <!-- Colors -->
                </div>
                <button id="addColorBtn" class="btn btn-secondary" style="margin-top:8px; padding: 6px;">
                    + 色を追加
                </button>
            </div>
            
            <div class="control-group">
                <label>背景 (Background)</label>
                <div class="color-row">
                    <div class="color-input-wrapper">
                         <input type="color" id="colorBg" value="#F0FDFA">
                    </div>
                </div>
                <!-- Transparent Checkbox -->
                <label class="checkbox-label" style="margin-top:8px;">
                    <input type="checkbox" id="bgTransparent">
                    背景を透過 (Transparent)
                </label>
            </div>

            <!-- Parameters -->
            <div class="control-group">
                <label for="scale">
                    スケール / ズーム (Scale)
                    <span class="value-display" id="scaleValue">50</span>
                </label>
                <input type="range" id="scale" min="1" max="100" value="50">
            </div>

            <div class="control-group">
                <label for="elevation">
                    等高線密度 (Elevation)
                    <span class="value-display" id="elevationValue">30</span>
                </label>
                <input type="range" id="elevation" min="1" max="100" value="30">
            </div>
            
            <div class="control-group">
                <label for="distortion">
                    歪み / うねり (Distortion)
                    <span class="value-display" id="distortionValue">50</span>
                </label>
                <input type="range" id="distortion" min="0" max="100" value="50">
            </div>
            
            <div class="control-group">
                <label for="lineWidth">
                    線の太さ (Line Width)
                    <span class="value-display" id="lineWidthValue">15</span>
                </label>
                <input type="range" id="lineWidth" min="1" max="100" value="15">
            </div>

        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
            <button id="randomBtn" class="btn btn-secondary">
                🎲 ランダム生成
            </button>
            
            <div class="control-group">
                <label for="exportFormat" style="margin-bottom:0;">保存形式</label>
                <select id="exportFormat">
                    <option value="png">PNG</option>
                    <option value="jpeg">JPEG</option>
                </select>
            </div>

            <button id="exportBtn" class="btn btn-primary">
                画像を保存
            </button>
        </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
        <canvas id="topographyCanvas" width="1600" height="1200"></canvas>
        <div class="canvas-info" id="canvasInfo">1600 × 1200 px</div>
    </main>

    <script src="{{ asset('js/topography-generator.js') }}"></script>
</body>

</html>
