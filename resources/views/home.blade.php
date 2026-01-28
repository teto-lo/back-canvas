<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Back Canvas Tools - 背景生成ツール</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #f8f9fa;
            --text-color: #2c3e50;
            --card-bg: #ffffff;
            --accent-color: #3498db;
            --hover-color: #2980b9;
        }

        body {
            font-family: 'Outfit', 'Noto Sans JP', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
        }

        header {
            margin-top: 60px;
            margin-bottom: 40px;
            text-align: center;
            padding: 0 20px;
        }

        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin: 0;
            letter-spacing: -0.02em;
        }

        p.subtitle {
            font-size: 1.1rem;
            color: #7f8c8d;
            margin-top: 10px;
        }

        .grid-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 30px;
            width: 100%;
            max-width: 1200px;
            padding: 0 20px 60px 20px;
        }

        .tool-card {
            background-color: var(--card-bg);
            border-radius: 16px;
            text-decoration: none;
            color: inherit;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            transition: all 0.2s ease;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid rgba(0,0,0,0.05);
            height: 100%;
        }

        .tool-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            border-color: var(--accent-color);
        }

        .card-preview {
            height: 160px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        .card-icon {
            font-size: 3.5rem;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
            z-index: 2;
        }

        .card-content {
            padding: 24px;
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .tool-card h2 {
            font-size: 1.1rem;
            font-weight: 700;
            margin: 0 0 8px 0;
            color: var(--text-color);
        }

        .tool-card p {
            font-size: 0.85rem;
            color: #64748b;
            line-height: 1.6;
            margin: 0;
        }

        /* Preview Backgrounds */
        .preview-noise {
            background-color: #1a1a1a;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E");
        }
        
        .preview-watercolor {
            background-color: #fff;
            background-image: 
                radial-gradient(circle at 70% 20%, rgba(255, 100, 100, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 30% 60%, rgba(100, 100, 255, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(255, 255, 100, 0.3) 0%, transparent 50%);
            filter: contrast(120%);
        }

        .preview-aurora {
            background: linear-gradient(135deg, #a5b4fc 0%, #c084fc 50%, #f472b6 100%);
        }
        
        .preview-geometric {
            background-color: #f8fafc;
            background-image: radial-gradient(#94a3b8 1.5px, transparent 1.5px);
            background-size: 20px 20px;
        }
        
        .preview-topography {
            background: linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%);
            position: relative;
            overflow: hidden;
        }
        .preview-topography::after {
            content: '';
            position: absolute;
            background: repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 10px, rgba(13, 148, 136, 0.1) 10px, rgba(13, 148, 136, 0.1) 12px);
            top:0; left:0; right:0; bottom:0;
        }
        
        .preview-gradient {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
        }
        
        .preview-particle {
            background: radial-gradient(circle at 20% 30%, rgba(255, 215, 0, 0.6) 0%, transparent 20%),
                        radial-gradient(circle at 80% 70%, rgba(0, 191, 255, 0.6) 0%, transparent 20%),
                        #0f172a;
        }
        
        .preview-blob {
            background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
        }
        
        .preview-perlin {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            opacity: 0.8;
        }
        
        .preview-voronoi {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        
        .preview-wave {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        /* New Generators */
        .preview-sunburst {
            background: repeating-conic-gradient(#fcd34d 0 15deg, #fbbf24 15deg 30deg);
        }
        .preview-wagara {
            background-color: #fdfcf8;
            background-image: radial-gradient(#1e3a8a 2px, transparent 2px); /* Simple placeholder */
            background-size: 10px 10px;
            border: 4px solid #b91c1c;
        }
        .preview-tech {
            background-color: #020617;
            background-image: linear-gradient(0deg, transparent 24%, rgba(34, 211, 238, .3) 25%, rgba(34, 211, 238, .3) 26%, transparent 27%, transparent 74%, rgba(34, 211, 238, .3) 75%, rgba(34, 211, 238, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(34, 211, 238, .3) 25%, rgba(34, 211, 238, .3) 26%, transparent 27%, transparent 74%, rgba(34, 211, 238, .3) 75%, rgba(34, 211, 238, .3) 76%, transparent 77%, transparent);
            background-size: 30px 30px;
        }
        .preview-memphis {
            background-color: #fff0f5;
            background-image: radial-gradient(#ff69b4 20%, transparent 20%), linear-gradient(45deg, transparent 48%, #00ced1 48%, #00ced1 52%, transparent 52%);
            background-size: 20px 20px, 30px 30px;
        }
        .preview-liquid {
            background: linear-gradient(45deg, #1890ff, #13c2c2, #722ed1);
            filter: blur(5px);
        }

    </style>

</head>
<body>

    <header>
        <h1>Back Canvas Tools</h1>
        <p class="subtitle">プロジェクト用の美しい背景素材を生成します。</p>
    </header>

    <div class="grid-container">
        <!-- Noise Generator -->
        <a href="{{ route('noise') }}" class="tool-card">
            <div class="card-preview preview-noise">
                <div class="card-icon">⚡</div>
            </div>
            <div class="card-content">
                <h2>ノイズ生成 (Noise)</h2>
                <p>高品質な粒状ノイズテクスチャを生成します。</p>
            </div>
        </a>

        <!-- Watercolor Generator -->
        <a href="{{ route('watercolor') }}" class="tool-card">
            <div class="card-preview preview-watercolor">
                <div class="card-icon">🎨</div>
            </div>
            <div class="card-content">
                <h2>水彩生成 (Watercolor)</h2>
                <p>滲みのある有機的な水彩背景を生成します。</p>
            </div>
        </a>

        <!-- Aurora Generator -->
        <a href="{{ route('aurora') }}" class="tool-card">
            <div class="card-preview preview-aurora">
                <div class="card-icon">✨</div>
            </div>
            <div class="card-content">
                <h2>オーロラ生成 (Aurora)</h2>
                <p>柔らかなグラデーションとメッシュアニメーション。</p>
            </div>
        </a>

        <!-- Geometric Generator -->
        <a href="{{ route('geometric') }}" class="tool-card">
            <div class="card-preview preview-geometric">
                <div class="card-icon">📐</div>
            </div>
            <div class="card-content">
                <h2>幾何学パターン (Geometric)</h2>
                <p>グリッド、ドット、建築学的な構造パターン。</p>
            </div>
        </a>

        <!-- Topography Generator -->
        <a href="{{ route('topography') }}" class="tool-card">
            <div class="card-preview preview-topography">
                <div class="card-icon">🏔️</div>
            </div>
            <div class="card-content">
                <h2>等高線 (Topography)</h2>
                <p>有機的な等高線、波紋、指紋のようなパターン。</p>
            </div>
        </a>

        <!-- Gradient Generator -->
        <a href="{{ route('gradient') }}" class="tool-card">
            <div class="card-preview preview-gradient">
                <div class="card-icon">🌈</div>
            </div>
            <div class="card-content">
                <h2>グラデーション (Gradient)</h2>
                <p>線形、円形、コニックなど多彩なグラデーション。</p>
            </div>
        </a>

        <!-- Particle Generator -->
        <a href="{{ route('particle') }}" class="tool-card">
            <div class="card-preview preview-particle">
                <div class="card-icon">✨</div>
            </div>
            <div class="card-content">
                <h2>パーティクル (Particle)</h2>
                <p>ボケ味のある光や粒子の散布エフェクト。</p>
            </div>
        </a>

        <!-- Blob Generator -->
        <a href="{{ route('blob') }}" class="tool-card">
            <div class="card-preview preview-blob">
                <div class="card-icon">💧</div>
            </div>
            <div class="card-content">
                <h2>メタボール (Blob)</h2>
                <p>滑らかに動く有機的な変形シェイプ。</p>
            </div>
        </a>

        <!-- Perlin Noise Generator -->
        <a href="{{ route('perlin') }}" class="tool-card">
            <div class="card-preview preview-perlin">
                <div class="card-icon">🌫️</div>
            </div>
            <div class="card-content">
                <h2>パーリンノイズ (Perlin)</h2>
                <p>フラクタルな階層を持つスムーズな有機ノイズ。</p>
            </div>
        </a>

        <!-- Voronoi Generator -->
        <a href="{{ route('voronoi') }}" class="tool-card">
            <div class="card-preview preview-voronoi">
                <div class="card-icon">🔷</div>
            </div>
            <div class="card-content">
                <h2>ボロノイ (Voronoi)</h2>
                <p>細胞状のモザイクパターン。</p>
            </div>
        </a>

        <!-- Wave Generator -->
        <a href="{{ route('wave') }}" class="tool-card">
            <div class="card-preview preview-wave">
                <div class="card-icon">🌊</div>
            </div>
            <div class="card-content">
                <h2>ウェーブ (Wave)</h2>
                <p>数学的な波紋と干渉パターン。</p>
            </div>
        </a>

        <!-- Sunburst Generator -->
        <a href="{{ route('sunburst') }}" class="tool-card">
            <div class="card-preview preview-sunburst">
                <div class="card-icon">☀️</div>
            </div>
            <div class="card-content">
                <h2>サンバースト (Sunburst)</h2>
                <p>集中線や放射状のパターン。</p>
            </div>
        </a>

        <!-- Wagara Generator -->
        <a href="{{ route('wagara') }}" class="tool-card">
            <div class="card-preview preview-wagara">
                <div class="card-icon">🎎</div>
            </div>
            <div class="card-content">
                <h2>和柄 (Wagara)</h2>
                <p>青海波、七宝などの伝統的な日本の模様。</p>
            </div>
        </a>

        <!-- Tech Generator -->
        <a href="{{ route('tech') }}" class="tool-card">
            <div class="card-preview preview-tech">
                <div class="card-icon">🤖</div>
            </div>
            <div class="card-content">
                <h2>テック風 (Tech)</h2>
                <p>回路基板やサイバーパンク風のデザイン。</p>
            </div>
        </a>

        <!-- Memphis Generator -->
        <a href="{{ route('memphis') }}" class="tool-card">
            <div class="card-preview preview-memphis">
                <div class="card-icon">🔺</div>
            </div>
            <div class="card-content">
                <h2>メンフィス (Memphis)</h2>
                <p>80年代風のポップな幾何学パターン。</p>
            </div>
        </a>

        <!-- Liquid Generator -->
        <a href="{{ route('liquid') }}" class="tool-card">
            <div class="card-preview preview-liquid">
                <div class="card-icon">💧</div>
            </div>
            <div class="card-content">
                <h2>リキッド (Liquid)</h2>
                <p>流体のような歪みを持つ抽象的な背景。</p>
            </div>
        </a>
    </div>

</body>
</html>
