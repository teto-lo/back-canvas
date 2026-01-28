<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Aurora Generator</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet">
    <style>
        :root {
            --bg-color: #0f172a; /* Dark theme for Aurora */
            --sidebar-bg: #1e293b;
            --text-color: #f1f5f9;
            --border-color: #334155;
            --primary-color: #8b5cf6; /* Violet for aurora vibe */
            --primary-hover: #7c3aed;
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
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.2);
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
            color: #e2e8f0;
        }
        
        .header a {
            text-decoration: none;
            color: inherit;
        }

        .header p {
            font-size: 0.875rem;
            color: #94a3b8;
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
            color: #cbd5e1;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: flex;
            justify-content: space-between;
        }

        .value-display {
            font-family: 'JetBrains Mono', monospace;
            color: #94a3b8;
            font-weight: 500;
        }

        /* Sliders */
        input[type="range"] {
            -webkit-appearance: none;
            width: 100%;
            height: 6px;
            background: #334155;
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
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            border: 2px solid #fff;
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
            background: none;
        }
        
        input[type="color"]::-webkit-color-swatch-wrapper {
            padding: 0;
        }
        
        input[type="color"]::-webkit-color-swatch {
            border: none;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        .color-label {
            font-size: 0.75rem;
            color: #94a3b8;
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
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .btn-primary:hover {
            background-color: var(--primary-hover);
            transform: translateY(-1px);
        }
        
        .btn-secondary {
            background-color: #334155;
            color: #f8fafc;
            border: 1px solid #475569;
        }
        
        .btn-secondary:hover {
            background-color: #475569;
        }

        /* Main Canvas Area */
        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            background-color: #020617;
            background-image: 
                radial-gradient(circle at 50% 50%, #1e293b 1px, transparent 1px);
            background-size: 40px 40px;
        }

        #auroraCanvas {
            box-shadow: 0 0 100px rgba(139, 92, 246, 0.1);
            max-width: 90%;
            max-height: 90%;
            background: black;
        }

        .canvas-info {
            position: absolute;
            bottom: 20px;
            right: 20px;
            background: rgba(15, 23, 42, 0.8);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.75rem;
            color: #94a3b8;
            font-family: 'JetBrains Mono', monospace;
            border: 1px solid #334155;
            backdrop-filter: blur(4px);
        }
        
        select {
             width: 100%; 
             padding: 10px; 
             border-radius: 8px; 
             border: 1px solid #475569;
             background-color: #334155;
             font-family: inherit;
             color: white;
        }
        
        input[type="number"] {
            background-color: #334155;
            color: white;
            border: 1px solid #475569;
        }

    </style>
</head>

<body>
    <!-- Sidebar -->
    <aside class="sidebar">
        <div class="header">
            <h1><a href="{{ route('home') }}">← ホームに戻る</a></h1>
            <p>オーロラ生成 (Moving Gradient Mesh)</p>
        </div>

        <div class="control-section">
            <div class="control-group">
                <label>キャンバスサイズ</label>
                <div style="display: flex; gap: 10px;">
                    <div style="flex:1">
                        <input type="number" id="width" value="1600" style="width:100%; padding:8px; border-radius:6px;">
                    </div>
                    <div style="flex:1">
                        <input type="number" id="height" value="1200" style="width:100%; padding:8px; border-radius:6px;">
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
                    <!-- Dynamic colors will be added here -->
                </div>
                
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #334155;">
                     <div class="color-input-group">
                        <span class="color-label">背景色 (Background)</span>
                        <input type="color" id="colorBg" value="#0F172A">
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
                    <option value="png">PNG (Snapshot)</option>
                    <option value="jpeg">JPEG (Snapshot)</option>
                    <option value="gif">GIF (Animation 3s)</option>
                </select>
            </div>

            <button id="exportBtn" class="btn btn-primary">
                画像を保存
            </button>
        </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
        <canvas id="auroraCanvas" width="1600" height="1200"></canvas>
        <div class="canvas-info" id="canvasInfo">1600 × 1200 px</div>
    </main>

    <script src="{{ asset('js/vendor/gif.js') }}"></script>
    <script src="{{ asset('js/aurora-generator.js') }}"></script>
</body>

</html>
