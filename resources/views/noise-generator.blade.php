<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Noise Generator - Figma Style</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --bg-primary: #0a0a0f;
            --bg-secondary: #141419;
            --bg-tertiary: #1c1c24;
            --accent: #6366f1;
            --accent-hover: #818cf8;
            --text-primary: #e4e4e7;
            --text-secondary: #a1a1aa;
            --border: #27272a;
            --shadow: rgba(99, 102, 241, 0.15);
            --preview-bg: #ffffff;
        }

        body {
            font-family: 'Outfit', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            overflow-x: hidden;
        }

        .grain-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0.03;
            pointer-events: none;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E");
            z-index: 9999;
        }

        .container {
            display: grid;
            grid-template-columns: 380px 1fr;
            height: 100vh;
            gap: 0;
        }

        /* サイドバー */
        .sidebar {
            background: var(--bg-secondary);
            border-right: 1px solid var(--border);
            padding: 32px 24px;
            overflow-y: auto;
            position: relative;
        }

        .sidebar::before {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 1px;
            height: 100%;
            background: linear-gradient(180deg, transparent, var(--accent) 50%, transparent);
            opacity: 0.2;
        }

        .logo {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
            background: linear-gradient(135deg, var(--accent), var(--accent-hover));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: -0.02em;
        }

        .subtitle {
            font-size: 13px;
            color: var(--text-secondary);
            margin-bottom: 40px;
            font-weight: 300;
        }

        .section {
            margin-bottom: 32px;
        }

        .section-title {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 16px;
        }

        .control-group {
            margin-bottom: 24px;
        }

        label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 8px;
            color: var(--text-primary);
        }

        .value-display {
            float: right;
            font-family: 'JetBrains Mono', monospace;
            color: var(--accent);
            font-size: 12px;
        }

        input[type="range"] {
            width: 100%;
            height: 4px;
            background: var(--bg-tertiary);
            border-radius: 2px;
            outline: none;
            -webkit-appearance: none;
            position: relative;
            cursor: pointer;
            transition: background 0.2s;
        }

        input[type="range"]:hover {
            background: #25252e;
        }

        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            background: var(--accent);
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 8px var(--shadow);
            transition: transform 0.15s, box-shadow 0.15s;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.15);
            box-shadow: 0 4px 12px var(--shadow);
        }

        input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            background: var(--accent);
            border: none;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 8px var(--shadow);
            transition: transform 0.15s, box-shadow 0.15s;
        }

        input[type="range"]::-moz-range-thumb:hover {
            transform: scale(1.15);
            box-shadow: 0 4px 12px var(--shadow);
        }

        input[type="number"] {
            width: 100%;
            padding: 10px 12px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 6px;
            color: var(--text-primary);
            font-size: 14px;
            font-family: 'JetBrains Mono', monospace;
            transition: border-color 0.2s, background 0.2s;
        }

        input[type="number"]:focus {
            outline: none;
            border-color: var(--accent);
            background: #1f1f28;
        }

        select {
            outline: none;
            transition: border-color 0.2s, background 0.2s;
        }

        select:focus {
            border-color: var(--accent);
            background: #1f1f28;
        }

        .color-input-wrapper {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        input[type="color"] {
            width: 48px;
            height: 48px;
            border: 2px solid var(--border);
            border-radius: 8px;
            cursor: pointer;
            background: var(--bg-tertiary);
            transition: border-color 0.2s, transform 0.15s;
        }

        input[type="color"]:hover {
            border-color: var(--accent);
            transform: scale(1.05);
        }

        input[type="color"]::-webkit-color-swatch-wrapper {
            padding: 0;
        }

        input[type="color"]::-webkit-color-swatch {
            border: none;
            border-radius: 6px;
        }

        .hex-input {
            flex: 1;
        }

        .dimension-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        .btn {
            width: 100%;
            padding: 14px 20px;
            background: var(--accent);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            font-family: 'Outfit', sans-serif;
            letter-spacing: 0.01em;
            position: relative;
            overflow: hidden;
        }

        .btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            transition: left 0.5s;
        }

        .btn:hover::before {
            left: 100%;
        }

        .btn:hover {
            background: var(--accent-hover);
            transform: translateY(-1px);
            box-shadow: 0 6px 20px var(--shadow);
        }

        .btn:active {
            transform: translateY(0);
        }

        .btn-secondary {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            margin-top: 8px;
        }

        .btn-secondary:hover {
            background: #25252e;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        /* プレビューエリア */
        .preview-area {
            padding: 48px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            background: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.05), transparent 70%);
        }

        .preview-header {
            position: absolute;
            top: 32px;
            left: 48px;
            right: 48px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .preview-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }

        .preview-info {
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            color: var(--text-secondary);
        }

        .canvas-wrapper {
            position: relative;
            box-shadow:
                0 20px 60px rgba(0, 0, 0, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.05),
                0 0 80px var(--shadow);
            border-radius: 12px;
            overflow: hidden;
            transition: transform 0.3s;
        }

        .canvas-wrapper:hover {
            transform: scale(1.01);
        }

        #noiseCanvas {
            display: block;
            max-width: 100%;
            max-height: calc(100vh - 200px);
            background: transparent;
        }

        .checkerboard {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -1;
            transition: opacity 0.3s;
        }

        .checkerboard.pattern {
            background-image:
                linear-gradient(45deg, #e4e4e7 25%, transparent 25%),
                linear-gradient(-45deg, #e4e4e7 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #e4e4e7 75%),
                linear-gradient(-45deg, transparent 75%, #e4e4e7 75%);
            background-size: 20px 20px;
            background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
            background-color: #ffffff;
        }

        .checkerboard.solid {
            background-color: var(--preview-bg);
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .section {
            animation: fadeIn 0.4s ease-out backwards;
        }

        .section:nth-child(1) {
            animation-delay: 0.05s;
        }

        .section:nth-child(2) {
            animation-delay: 0.1s;
        }

        .section:nth-child(3) {
            animation-delay: 0.15s;
        }

        .section:nth-child(4) {
            animation-delay: 0.2s;
        }

        /* スクロールバーカスタマイズ */
        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-track {
            background: var(--bg-secondary);
        }

        ::-webkit-scrollbar-thumb {
            background: var(--bg-tertiary);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: #25252e;
        }
    </style>
</head>

<body>
    <div class="grain-overlay"></div>

    <div class="container">
        <!-- サイドバー（パラメータコントロール） -->
        <div class="sidebar">
            <div class="logo">Noise Generator</div>
            <div class="subtitle">Figma-style noise creation</div>

            <!-- サイズ設定 -->
            <div class="section">
                <div class="section-title">サイズ</div>
                <div class="dimension-group">
                    <div class="control-group">
                        <label for="width">幅 (px)</label>
                        <input type="number" id="width" value="1600" min="1" max="4096"
                            step="1">
                    </div>
                    <div class="color-input-wrapper">
                        <input type="color" id="color" value="#000000">
                        <input type="text" id="hexColor" class="hex-input" value="#000000">
                    </div>
                    <div class="control-group">
                        <label for="height">高さ (px)</label>
                        <input type="number" id="height" value="1200" min="1" max="4096"
                            step="1">
                    </div>
                </div>
            </div>

<!-- ... -->

            <!-- アクションボタン -->
            <div class="action-buttons">
                <!-- Export Format Selector -->
                <div class="control-group" style="margin-bottom: 10px;">
                    <label for="exportFormat" style="font-size: 0.9rem;">保存形式 (Format)</label>
                    <select id="exportFormat" style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #ddd;">
                        <option value="png">PNG</option>
                        <option value="jpeg">JPEG</option>
                    </select>
                </div>
                
                <button id="exportBtn" class="btn btn-primary" style="width: 100%;">
                    画像を保存 (Download)
                </button>
                <button class="btn btn-secondary" id="randomBtn">ランダム生成</button>
            </div>
        </div>

        <!-- プレビューエリア -->
        <div class="preview-area">
            <div class="preview-header">
                <div class="preview-title">プレビュー (Preview)</div>
                <div class="preview-info">
                    <span id="canvasInfo">1600 × 1200 px</span>
                </div>
            </div>

            <div class="canvas-wrapper">
                <div class="checkerboard pattern"></div>
                <canvas id="noiseCanvas" width="1600" height="1200"></canvas>
            </div>
        </div>
    </div>

    <script src="{{ asset('js/noise-generator.js') }}"></script>
</body>

</html>
