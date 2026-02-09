/**
 * Figma Noise Generator - WebGL Controller
 * リアルタイムプレビュー・パラメータ制御・PNG出力
 */

class NoiseGenerator {
    constructor() {
        this.canvas = document.getElementById('noiseCanvas');
        this.gl = this.canvas.getContext('webgl', {
            preserveDrawingBuffer: true,
            premultipliedAlpha: false,
            alpha: true
        });

        if (!this.gl) {
            alert('WebGL未対応のブラウザです');
            return;
        }

        // パラメータ初期値
        const wInput = document.getElementById('width');
        const hInput = document.getElementById('height');

        this.params = {
            width: wInput ? parseInt(wInput.value) : 1600,
            height: hInput ? parseInt(hInput.value) : 1200,
            color: { r: 0, g: 0, b: 0 }, // Black
            density: 50,
            depth: 50,
            stretch: 0,
            smooth: 50,
            vignette: 0,
            stretch: 0,
            smooth: 50,
            vignette: 0,
            vignetteOpacity: 100, // 新規
            centerFade: 0,
            centerFadeOpacity: 100, // 新規
            bgMode: 'transparent',
            bgColor: '#ffffff'
        };

        this.init();
        this.setupEventListeners();
        this.render();
    }

    init() {
        const gl = this.gl;

        // 頂点シェーダー（フルスクリーン四角形）
        const vertexShaderSource = `
            attribute vec2 a_position;
            varying vec2 v_texCoord;
            
            void main() {
                v_texCoord = a_position * 0.5 + 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        // フラグメントシェーダー（ノイズ生成）- 完全修正版
        const fragmentShaderSource = `
            precision highp float;
            
            varying vec2 v_texCoord;
            
            uniform vec2 u_resolution;
            uniform vec3 u_color;
            uniform float u_density;     // 全体の不透明度
            uniform float u_depth;       // 粒の密度（周波数）
            uniform float u_stretch;     // 粒の横幅（横に引き伸ばす）
            uniform float u_smooth;      // なめらかさ（高い=細かい）
            uniform float u_vignette;    // 周辺減光サイズ
            uniform float u_vignetteOpacity; // 周辺減光不透明度（強さ）
            uniform float u_centerFade;  // 中心透過サイズ
            uniform float u_centerFadeOpacity; // 中心透過不透明度（強さ）
            
            // 高精度ハッシュ関数
            float hash(vec2 p) {
                p = fract(p * vec2(443.897, 441.423));
                p += dot(p, p.yx + 19.19);
                return fract(p.x * p.y);
            }
            
            // 2D Value Noise - 粒状ノイズ
            // smoothFactor: 0.0 = Blocky (Nearest), 1.0 = Smooth (Interpolated)
            float valueNoise2D(vec2 p, float smoothFactor) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                
                vec2 u = f * f * (3.0 - 2.0 * f);
                
                // Blocky Noise (Nearest / Cell value)
                // 単純にセルの左下のハッシュ値を使うとブロック状になる
                float blocky = a;
                
                // Smooth Noise (Interpolated)
                float smoothN = mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
                
                return mix(blocky, smoothN, smoothFactor);
            }
            
            // FBM（複数オクターブ）- なめらかさ制御
            float fbm(vec2 p, int octaves, float smoothFactor) {
                float total = 0.0;
                float frequency = 1.0;
                float amplitude = 1.0;
                float maxValue = 0.0;
                
                for (int i = 0; i < 8; i++) {
                    if (i >= octaves) break;
                    
                    total += valueNoise2D(p * frequency, smoothFactor) * amplitude;
                    maxValue += amplitude;
                    
                    amplitude *= 0.5;
                    frequency *= 2.0;
                }
                
                return total / maxValue;
            }
            
            void main() {
                vec2 uv = v_texCoord;
                vec2 coord = uv * u_resolution;
                
                // 1. Depth（粒の密度）→ 基本周波数
                // 範囲を拡大：最大25.0 -> 150.0
                float frequency = mix(0.5, 150.0, u_depth / 100.0);
                
                // 2. Stretch（粒の横幅）
                // 範囲を拡大（最大20倍）
                float stretchFactor = mix(1.0, 20.0, u_stretch / 100.0);
                vec2 stretchedCoord = vec2(coord.x / stretchFactor, coord.y);
                
                // 再生成感
                stretchedCoord.x += u_stretch * 1.5;

                vec2 scaledCoord = stretchedCoord * frequency / 100.0;

                // Rearrange (再配置)
                float rowID = floor(scaledCoord.y);
                float rowShift = hash(vec2(rowID, 123.45)) * 100.0; 
                scaledCoord.x += rowShift;
                
                // 3. Smooth（なめらかさ）
                float smoothFactor = u_smooth / 100.0;
                int octaves = int(mix(2.0, 8.0, smoothFactor));
                
                // FBMでノイズ生成
                float noise = fbm(scaledCoord, octaves, smoothFactor);
                
                // コントラスト調整
                noise = (noise - 0.5) * 1.8 + 0.5;
                noise = clamp(noise, 0.0, 1.0);
                
                // Alpha Multiplier for Masking
                float finalAlphaMultiplier = 1.0;
                
                // 4. Vignette（周辺減光）
                if (u_vignette > 0.0) {
                    vec2 center = uv - 0.5;
                    float dist = length(center);
                    
                    // サイズ制御
                    float sizeFactor = u_vignette / 100.0;
                    float innerRadius = 0.8 - (sizeFactor * 0.6); 
                    float outerRadius = 1.2 - (sizeFactor * 0.4); 
                    
                    // Intensity
                    float opacityStr = u_vignetteOpacity / 100.0;
                    
                    float vMask = 1.0 - smoothstep(innerRadius, outerRadius, dist);
                    float vFactor = mix(1.0, vMask, opacityStr);
                    
                    finalAlphaMultiplier *= vFactor;
                }
                
                // 5. Center Fade（中心透過）
                if (u_centerFade > 0.0) {
                    vec2 center = uv - 0.5;
                    float dist = length(center);
                    
                    // サイズ制御
                    float sizeFactor = u_centerFade / 100.0;
                    float holeRadius = 0.5 * sizeFactor; 
                    
                    // Intensity
                    float opacityStr = u_centerFadeOpacity / 100.0;
                    
                    float fMask = smoothstep(0.0, holeRadius + 0.1, dist);
                    float fFactor = mix(1.0, fMask, opacityStr);
                    
                    finalAlphaMultiplier *= fFactor;
                }
                
                // 6. Density（密度/被覆率）
                float densityThreshold = 1.0 - u_density / 100.0;
                float edgeSoftness = mix(0.01, 0.3, u_smooth / 100.0);
                
                float alpha = smoothstep(densityThreshold, densityThreshold + edgeSoftness, noise);
                
                // マスク適用
                alpha *= finalAlphaMultiplier;
                
                // 最終カラー
                vec3 finalColor = u_color;
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `;

        // シェーダーコンパイル
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        // プログラム作成
        this.program = this.createProgram(vertexShader, fragmentShader);

        // 頂点バッファ設定（フルスクリーン四角形）
        const positions = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1
        ]);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        // 属性の取得とバインド
        const positionLocation = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Uniform変数の位置取得
        this.uniforms = {
            resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            color: gl.getUniformLocation(this.program, 'u_color'),
            density: gl.getUniformLocation(this.program, 'u_density'),
            depth: gl.getUniformLocation(this.program, 'u_depth'),
            stretch: gl.getUniformLocation(this.program, 'u_stretch'),
            smooth: gl.getUniformLocation(this.program, 'u_smooth'),
            vignette: gl.getUniformLocation(this.program, 'u_vignette'),
            vignetteOpacity: gl.getUniformLocation(this.program, 'u_vignetteOpacity'),
            centerFade: gl.getUniformLocation(this.program, 'u_centerFade'),
            centerFadeOpacity: gl.getUniformLocation(this.program, 'u_centerFadeOpacity')
        };

        // ブレンディング設定（透明度対応）
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('シェーダーコンパイルエラー:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    createProgram(vertexShader, fragmentShader) {
        const gl = this.gl;
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('プログラムリンクエラー:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }

        return program;
    }

    setupEventListeners() {
        // サイズ変更
        // サイズ変更
        const wInput = document.getElementById('width');
        const hInput = document.getElementById('height');

        if (wInput) {
            wInput.addEventListener('input', (e) => {
                this.params.width = parseInt(e.target.value);
                this.updateCanvasSize();
                this.render();
            });
        }

        if (hInput) {
            hInput.addEventListener('input', (e) => {
                this.params.height = parseInt(e.target.value);
                this.updateCanvasSize();
                this.render();
            });
        }

        // カラー変更
        // カラー変更
        const colorInput = document.getElementById('color');
        if (colorInput) {
            colorInput.addEventListener('input', (e) => {
                this.updateColor(e.target.value);
                const hexInput = document.getElementById('hexColor');
                if (hexInput) hexInput.value = e.target.value;
                this.render();
            });
        }

        const hexColorInput = document.getElementById('hexColor');
        if (hexColorInput) {
            hexColorInput.addEventListener('input', (e) => {
                const color = e.target.value;
                if (/^#[0-9A-F]{6}$/i.test(color)) {
                    this.updateColor(color);
                    if (colorInput) colorInput.value = color;
                    this.render();
                }
            });
        }

        // パラメータスライダー
        const paramSliders = ['density', 'depth', 'stretch', 'smooth', 'vignette', 'vignetteOpacity', 'centerFade', 'centerFadeOpacity'];
        paramSliders.forEach(param => {
            const slider = document.getElementById(param);
            const valueDisplay = document.getElementById(param + 'Value');

            if (slider) {
                slider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    this.params[param] = value;
                    if (valueDisplay) valueDisplay.textContent = value.toFixed(1);
                    this.render();
                });
            }
        });

        // エクスポートボタン
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportImage();
        });

        // ランダム生成ボタン
        document.getElementById('randomBtn').addEventListener('click', () => {
            this.randomize();
        });

        // 背景モード切り替え
        const bgModeSelect = document.getElementById('bgMode');
        const bgColorGroup = document.getElementById('bgColorGroup');
        const checkerboard = document.querySelector('.checkerboard');

        bgModeSelect.addEventListener('change', (e) => {
            this.params.bgMode = e.target.value;

            if (e.target.value === 'solid') {
                bgColorGroup.style.display = 'block';
                checkerboard.classList.remove('pattern');
                checkerboard.classList.add('solid');
                this.updateBackgroundColor(this.params.bgColor);
            } else {
                bgColorGroup.style.display = 'none';
                checkerboard.classList.remove('solid');
                checkerboard.classList.add('pattern');
            }
        });

        // 背景色変更
        document.getElementById('bgColor').addEventListener('input', (e) => {
            this.params.bgColor = e.target.value;
            document.getElementById('hexBgColor').value = e.target.value;
            this.updateBackgroundColor(e.target.value);
        });

        document.getElementById('hexBgColor').addEventListener('input', (e) => {
            const color = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(color)) {
                this.params.bgColor = color;
                document.getElementById('bgColor').value = color;
                this.updateBackgroundColor(color);
            }
        });
    }

    updateBackgroundColor(hex) {
        document.documentElement.style.setProperty('--preview-bg', hex);
    }

    updateColor(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        this.params.color = { r, g, b };
    }

    updateCanvasSize() {
        this.canvas.width = this.params.width;
        this.canvas.height = this.params.height;
        this.gl.viewport(0, 0, this.params.width, this.params.height);

        // キャンバス情報更新
        document.getElementById('canvasInfo').textContent =
            `${this.params.width} × ${this.params.height} px`;
    }

    render() {
        const gl = this.gl;

        // 背景クリア（透明）
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // プログラム使用
        gl.useProgram(this.program);

        // Uniform変数の設定
        gl.uniform2f(this.uniforms.resolution, this.params.width, this.params.height);
        gl.uniform3f(this.uniforms.color, this.params.color.r, this.params.color.g, this.params.color.b);
        gl.uniform1f(this.uniforms.density, this.params.density);
        gl.uniform1f(this.uniforms.depth, this.params.depth);
        gl.uniform1f(this.uniforms.stretch, this.params.stretch);
        gl.uniform1f(this.uniforms.smooth, this.params.smooth);
        gl.uniform1f(this.uniforms.vignette, this.params.vignette);
        gl.uniform1f(this.uniforms.vignetteOpacity, this.params.vignetteOpacity);
        gl.uniform1f(this.uniforms.centerFade, this.params.centerFade);
        gl.uniform1f(this.uniforms.centerFadeOpacity, this.params.centerFadeOpacity);

        // 描画
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    exportImage() {
        const formatSelect = document.getElementById('exportFormat');
        const format = formatSelect ? formatSelect.value : 'png';
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const fileExt = format === 'jpeg' ? 'jpg' : 'png';
        const quality = format === 'jpeg' ? 0.9 : undefined; // JPEG quality

        if (format === 'jpeg') {
            // JPEGの場合は透明部分が黒になるのを防ぐため、白い背景の別キャンバスに描画してから保存
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            const ctx = tempCanvas.getContext('2d');

            // 白背景で塗りつぶし
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

            // WebGLキャンバスを描画
            ctx.drawImage(this.canvas, 0, 0);

            tempCanvas.toBlob((blob) => {
                this.saveBlob(blob, fileExt);
            }, mimeType, quality);
        } else {
            // PNGなどはそのまま保存
            this.canvas.toBlob((blob) => {
                this.saveBlob(blob, fileExt);
            }, mimeType, quality);
        }
    }

    saveBlob(blob, fileExt) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `noise_${Date.now()}.${fileExt}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    randomize() {
        // ランダムパラメータ生成
        this.params.density = Math.random() * 100;
        this.params.depth = Math.random() * 100;
        this.params.stretch = Math.random() * 100;
        this.params.smooth = Math.random() * 100;
        this.params.vignette = 0;
        this.params.vignetteOpacity = 0;

        // 中心透過もランダムからは除外（変な縁の原因になるため）
        this.params.centerFade = 0;
        this.params.centerFadeOpacity = 0;

        // UIを更新 (存在チェック付き)
        const updates = {
            'density': this.params.density,
            'depth': this.params.depth,
            'stretch': this.params.stretch,
            'smooth': this.params.smooth,
            'vignette': this.params.vignette,
            'vignetteOpacity': this.params.vignetteOpacity,
            'centerFade': this.params.centerFade,
            'centerFadeOpacity': this.params.centerFadeOpacity
        };

        for (const [id, val] of Object.entries(updates)) {
            const el = document.getElementById(id);
            const disp = document.getElementById(id + 'Value');
            if (el) el.value = val;
            if (disp) disp.textContent = val.toFixed(1);
        }

        // ランダムカラー生成
        const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        this.updateColor(randomColor);

        const colorInput = document.getElementById('color');
        const hexInput = document.getElementById('hexColor');
        if (colorInput) colorInput.value = randomColor;
        if (hexInput) hexInput.value = randomColor;

        // 再描画
        this.render();
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    new NoiseGenerator();
});