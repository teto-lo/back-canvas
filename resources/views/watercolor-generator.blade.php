<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Watercolor Generator</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet">
    <style>
        :root {
            --bg-color: #f3f4f6;
            --sidebar-bg: #ffffff;
            --text-color: #1f2937;
            --border-color: #e5e7eb;
            --primary-color: #10b981; /* Green for watercolor vibe */
            --primary-hover: #059669;
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

        /* Sidebar - Controls */
        .sidebar {
            width: 340px;
            background-color: var(--sidebar-bg);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            padding: 24px;
            overflow-y: auto;
            flex-shrink: 0;
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.02);
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
            color: #6b7280;
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
            color: #4b5563;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: flex;
            justify-content: space-between;
        }

        .value-display {
            font-family: 'JetBrains Mono', monospace;
            color: #6b7280;
            font-weight: 500;
        }

        /* Sliders */
        input[type="range"] {
            -webkit-appearance: none;
            width: 100%;
            height: 6px;
            background: #e5e7eb;
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

        input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.1);
        }

        /* Color Inputs */
        .color-inputs {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        
        .color-input-group {
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
        }
        
        input[type="color"]::-webkit-color-swatch-wrapper {
            padding: 0;
        }
        
        input[type="color"]::-webkit-color-swatch {
            border: none;
            border-radius: 8px;
            border: 1px solid rgba(0,0,0,0.1);
        }
        
        .color-label {
            font-size: 0.75rem;
            color: #6b7280;
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
            box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
        }

        .btn-primary:hover {
            background-color: var(--primary-hover);
            transform: translateY(-1px);
        }
        
        .btn-secondary {
            background-color: #fff;
            border: 1px solid #d1d5db;
            color: #374151;
        }
        
        .btn-secondary:hover {
            background-color: #f9fafb;
            border-color: #9ca3af;
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
            background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }

        #watercolorCanvas {
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
            max-width: 90%;
            max-height: 90%;
            background: white; /* Default paper color */
        }

        .canvas-info {
            position: absolute;
            bottom: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.9);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.75rem;
            color: #6b7280;
            font-family: 'JetBrains Mono', monospace;
            backdrop-filter: blur(4px);
        }
        
        select {
             width: 100%; 
             padding: 10px; 
             border-radius: 8px; 
             border: 1px solid #d1d5db;
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
            <p>水彩風テクスチャ (Procedural Watercolor)</p>
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
                <label>
                    パレット (Palette)
                    <button id="addColorBtn" style="background:none; border:none; color:var(--primary-color); cursor:pointer; font-size:1.2rem; padding:0;">+</button>
                </label>
                <div class="color-inputs" id="colorContainer">
                    <!-- Dynamic colors -->
                </div>
                
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
                     <div class="color-input-group">
                        <span class="color-label">背景色 (Paper)</span>
                        <input type="color" id="colorBg" value="#FFFFFF">
                    </div>
                </div>
            </div>

<!-- ... -->

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
        <canvas id="watercolorCanvas" width="1600" height="1200"></canvas>
        <div class="canvas-info" id="canvasInfo">1600 × 1200 px</div>
    </main>

    <script src="{{ asset('js/watercolor-generator.js') }}"></script>
</body>

</html>
