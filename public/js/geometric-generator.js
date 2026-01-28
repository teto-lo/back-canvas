/**
 * Geometric Pattern Generator - WebGL Controller
 * Grids, Dots, and Structured Patterns
 */

class GeometricGenerator {
    constructor() {
        this.canvas = document.getElementById('geometricCanvas');
        this.gl = this.canvas.getContext('webgl', {
            preserveDrawingBuffer: true,
            premultipliedAlpha: false,
            alpha: true
        });

        if (!this.gl) {
            alert('WebGL not supported');
            return;
        }

        this.params = {
            width: 1600,
            height: 1200,
            patternType: 0,
            colors: [
                { r: 0.2, g: 0.25, b: 0.33 }, // Default Slate
                { r: 0.58, g: 0.64, b: 0.72 }  // Secondary
            ],
            colorBg: { r: 1.0, g: 1.0, b: 1.0 },
            bgTransparent: false,
            density: 10,  // Grid cells (replaces scale/spacing logic)
            lineWidth: 20 // Stroke / Size
        };

        this.init();
        this.setupEventListeners();
        this.updateColorUI(); // Init color UI
        this.render();
    }

    init() {
        const gl = this.gl;

        const vertexShaderSource = `
            attribute vec2 a_position;
            varying vec2 v_texCoord;
            void main() {
                v_texCoord = a_position * 0.5 + 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        const fragmentShaderSource = `
            precision highp float;
            
            varying vec2 v_texCoord;
            
            uniform vec2 u_resolution;
            uniform int u_patternType;
            
            // Colors
            uniform vec3 u_colors[10];
            uniform int u_colorCount;
            uniform vec3 u_bg;
            uniform float u_bgTransparent;
            
            uniform float u_density;   // Grid Repetition (2.0 - 50.0)
            uniform float u_lineWidth; // 0.0 - 100.0 (converted to 0.0-1.0 or ratio)
            
            #define PI 3.14159265359

            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }

            vec2 rotate2D(vec2 _st, float _angle){
                _st -= 0.5;
                _st =  mat2(cos(_angle),-sin(_angle),
                            sin(_angle),cos(_angle)) * _st;
                _st += 0.5;
                return _st;
            }

            void main() {
                vec2 uv = v_texCoord;
                float aspect = u_resolution.x / u_resolution.y;
                vec2 coord = uv;
                coord.x *= aspect;
                
                // Grid Setup
                float cells = u_density; 
                vec2 st = coord * cells;
                vec2 gridId = floor(st);
                vec2 gridUv = fract(st);
                
                // Parameter conversions
                float w = u_lineWidth / 100.0; // 0.0 to 1.0
                
                float mask = 0.0;
                
                // --- PATTERN LOGIC ---
                
                // 0: Grid
                if (u_patternType == 0) {
                    float thickness = max(0.01, w * 0.5);
                    vec2 g = step(vec2(thickness), gridUv);
                    mask = 1.0 - (g.x * g.y);
                }
                // 1: Dots
                else if (u_patternType == 1) {
                    float radius = w * 0.6; // Max 0.6 radius
                    float d = length(gridUv - 0.5);
                    mask = 1.0 - step(radius, d);
                }
                // 2: Cross
                else if (u_patternType == 2) {
                    vec2 d = abs(gridUv - 0.5);
                    float thick = max(0.01, w * 0.25);
                    float size = 0.1 + w * 0.4;
                    float cross = step(d.y, thick) * step(d.x, size) + step(d.x, thick) * step(d.y, size);
                    mask = clamp(cross, 0.0, 1.0);
                }
                // 3: Vertical Lines
                else if (u_patternType == 3) {
                     float thick = max(0.01, w * 0.5);
                     float d = abs(gridUv.x - 0.5);
                     mask = 1.0 - step(thick, d);
                }
                // 4: Horizontal Lines
                else if (u_patternType == 4) {
                     float thick = max(0.01, w * 0.5);
                     float d = abs(gridUv.y - 0.5);
                     mask = 1.0 - step(thick, d);
                }
                // 5: Diagonal Forward (/)
                else if (u_patternType == 5) {
                    float d = abs(gridUv.x - gridUv.y); // creates diagonal
                    // To handle wrapping? Actually fract(st) resets.
                    // Simple diagonal in cell: line passes through 0,0 to 1,1
                    // Distance to line x=y is |x-y|/sqrt(2).
                    float thick = max(0.02, w * 0.4);
                    // multiple lines? No, just one per cell for simplicity. 
                    // To make continuous, we need x-y.
                    // Let's use global coords for continuous diagonals?
                    // But we want multicolor tiles. So keep it local.
                    mask = 1.0 - step(thick, d);
                }
                // 6: Diagonal Backward (\)
                else if (u_patternType == 6) {
                    float d = abs(gridUv.x - (1.0 - gridUv.y));
                    float thick = max(0.02, w * 0.4);
                    mask = 1.0 - step(thick, d);
                }
                // 7: Triangles
                else if (u_patternType == 7) {
                    // Ref: https://thebookofshaders.com/07/
                    vec2 p = gridUv * 2.0 - 1.0;
                    float a = atan(p.x, p.y) + PI;
                    float r = (2.0 * PI) / 3.0;
                    float d = cos(floor(0.5 + a/r) * r - a) * length(p);
                    float size = w * 0.8;
                    mask = 1.0 - step(size, d);
                }
                // 8: Diamonds
                else if (u_patternType == 8) {
                    vec2 p = abs(gridUv - 0.5);
                    float d = p.x + p.y;
                    float size = w * 0.7;
                    mask = 1.0 - step(size, d);
                }
                // 9: Hexagons
                else if (u_patternType == 9) {
                    // Approximated by circle or 6-sided poly
                    vec2 p = abs(gridUv - 0.5); // * 2.0 - 1.0?
                    // Hex distance
                    // q = abs(p); return max(q.x*0.5 + q.y*0.866025, q.y); // for flat topped
                    // Let's use simpler SDF
                    vec2 q = abs(p - 0.0);
                     // 0.57735 is tan(30)
                    float d = max(q.x * 0.866025 + q.y * 0.5, q.y); 
                    float size = w * 0.5;
                    mask = 1.0 - step(size, d);
                }
                 // 10: Circles Outline
                else if (u_patternType == 10) {
                    float d = length(gridUv - 0.5);
                    float radius = w * 0.5;
                    float ringW = 0.05;
                    mask = step(radius - ringW, d) - step(radius, d);
                }
                 // 11: Stars
                else if (u_patternType == 11) {
                    // 5 points star
                    vec2 p = gridUv * 2.0 - 1.0;
                    float a = atan(p.y, p.x) + PI/2.0;
                    float r = length(p);
                    float size = w * 0.8;
                    float f = cos(a * 5.0);
                    // Star shape: radius modulated by angle
                    // Simple star: r < size * (0.5 + 0.5*cos(5a)) ?
                    // sharp star:
                    float m = 0.5 + 0.3 * sin(a * 5.0 + u_density); // variation
                    // Better generic star
                    mask = 1.0 - step(size * (0.6 + 0.4 * cos(a*5.0)), r);
                }
                 // 12: Hearts
                else if (u_patternType == 12) {
                    vec2 p = gridUv * 2.0 - 1.0;
                    p.y -= 0.3; // shift up
                    // r = (sin(t)sqrt(|cos(t)|)) / (sin(t) + 7/5) - 2sin(t) + 2 ? Too complex
                    // Simple implicit: (x^2 + y^2 - 1)^3 - x^2*y^3 = 0
                    // Scaled
                    p *= 1.5;
                    float a = p.x*p.x + p.y*p.y - 1.0;
                    float d = a*a*a - p.x*p.x*p.y*p.y*p.y;
                    float size = w; // controls opacity edge? 
                    // SDF is hard, just threshold
                    mask = step(d, 0.0) * w; // filled
                }
                 // 13: Checkerboard
                else if (u_patternType == 13) {
                    // Check Logic: mod(x+y, 2)
                    float c = mod(gridId.x + gridId.y, 2.0);
                    mask = c;
                }
                 // 14: Bricks
                else if (u_patternType == 14) {
                    // Shift every other row
                    vec2 st2 = st;
                    if (mod(floor(st2.y), 2.0) == 0.0) {
                        st2.x += 0.5;
                    }
                    vec2 brickUv = fract(st2);
                    // Gap
                    float gap = 0.05;
                    vec2 b = step(vec2(gap), brickUv);
                    mask = 1.0 - (b.x * b.y); // outline ? No, let's fill
                    mask = b.x * b.y;
                }
                 // 15: Scales
                else if (u_patternType == 15) {
                    // Overlapping circles
                    // Use shifted grid
                    vec2 st2 = st;
                    st2.x += mod(gridId.y, 2.0) * 0.5;
                    vec2 f = fract(st2);
                    // Distance from bottom middle (0.5, 0.0)
                    float d = length(f - vec2(0.5, 1.0)); // arc from top?
                    // fish scale usually points down. arc centers at top corners?
                    // simple semi-circle
                    float d2 = length(f - vec2(0.5, 0.0));
                    mask = step(d2, 0.5) * w * 2.0; // scale size
                    // outline
                    mask = step(0.45 * w * 2.0, d2) - step(0.5 * w * 2.0, d2);
                }
                // 16: Zigzag
                else if (u_patternType == 16) {
                    vec2 f = gridUv;
                    //  X:   0   0.5   1
                    //  Y:   0    1    0
                    float y = abs(f.x - 0.5) * 2.0;
                    // Line thickness
                    float d = abs(f.y - y);
                    mask = 1.0 - step(w * 0.3, d);
                }
                // 17: Waves
                else if (u_patternType == 17) {
                    float y = 0.5 + 0.3 * sin(gridUv.x * PI * 2.0);
                    float d = abs(gridUv.y - y);
                    mask = 1.0 - step(w * 0.3, d);
                }
                // 18: Houndstooth
                else if (u_patternType == 18) {
                    // Complex. Simplified version.
                    // 2x2 block logic essentially.
                    // It involves diagonals and blocks.
                    // Let's do a simple chevron/check mix or skip if too hard.
                    // Replaced with: Tri-Grid? 
                    // Let's try simple glitch pattern
                    mask = step(0.5, random(gridId));
                }
                // 19: Tatami
                else if (u_patternType == 19) {
                    // 2x1 blocks alternating H and V
                    // If (x+y)%2==0 -> V, else H
                    float check = mod(gridId.x + gridId.y, 2.0);
                    if (check < 0.5) {
                        // Vertical split?
                        mask = step(0.05, gridUv.x) * step(gridUv.x, 0.95) * step(0.05, gridUv.y) * step(gridUv.y, 0.95);
                    } else {
                        // Horizontal (actually tatami is 2:1 aspect, difficult with square grid)
                        // Just make it look like basket weave
                        mask = step(0.2, gridUv.x) * step(gridUv.x, 0.8);
                    }
                }
                // 20: Maze (Truchet)
                else if (u_patternType == 20 || u_patternType == 21) {
                    // Truchet tiles: random rotation of diagonal or arc
                    float rnd = random(gridId);
                    vec2 tile = gridUv;
                    if (rnd > 0.5) tile.x = 1.0 - tile.x; // flip
                    
                    if (u_patternType == 20) {
                        // Diagonal line
                        float d = abs(tile.x - tile.y);
                        mask = 1.0 - step(w * 0.3, d);
                    } else {
                        // Arcs (Truchet)
                        float d1 = length(tile);
                        float d2 = length(tile - vec2(1.0));
                        float circle = step(0.4, d1) - step(0.6, d1); // Arc 1
                        circle += step(0.4, d2) - step(0.6, d2); // Arc 2
                        mask = circle;
                    }
                }
                // 22: Confetti
                else if (u_patternType == 22) {
                     // Random small shapes scattered
                     // Just use dots logic but with random offset and random size
                     vec2 offset = vec2(random(gridId), random(gridId + 1.0)) * 0.6 - 0.3;
                     float r = random(gridId + 2.0) * 0.3 * w * 3.0; // random size
                     float d = length(gridUv - 0.5 - offset);
                     mask = 1.0 - step(r, d);
                }

                
                vec4 finalColor;
                
                if (mask > 0.1) {
                    // Random Color Selection
                    // Use Scale/Density/Id to pick color
                    float r = random(gridId * 1.123);
                    int colorIdx = int(floor(r * float(u_colorCount)));
                    
                    // Hack to get array access with variable index in WebGL 1.0 (loops)
                    vec3 pickedColor = u_colors[0];
                    for (int i = 0; i < 10; i++) {
                        if (i == colorIdx) pickedColor = u_colors[i];
                    }
                    
                    finalColor = vec4(pickedColor, 1.0);
                } else {
                    if (u_bgTransparent > 0.5) {
                        finalColor = vec4(0.0, 0.0, 0.0, 0.0);
                    } else {
                        finalColor = vec4(u_bg, 1.0);
                    }
                }
                
                gl_FragColor = finalColor;
            }
        `;

        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
        this.program = this.createProgram(vertexShader, fragmentShader);

        const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        this.uniforms = {
            resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            patternType: gl.getUniformLocation(this.program, 'u_patternType'),
            // Array Uniforms
            bg: gl.getUniformLocation(this.program, 'u_bg'),
            bgTransparent: gl.getUniformLocation(this.program, 'u_bgTransparent'),

            density: gl.getUniformLocation(this.program, 'u_density'),
            lineWidth: gl.getUniformLocation(this.program, 'u_lineWidth'),

            colorCount: gl.getUniformLocation(this.program, 'u_colorCount')
        };

        // Cache color locations
        this.uniforms.colors = [];
        for (let i = 0; i < 10; i++) {
            this.uniforms.colors.push(gl.getUniformLocation(this.program, `u_colors[${i}]`));
        }
    }

    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
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
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return null;
        }
        return program;
    }

    setupEventListeners() {
        // Size
        document.getElementById('width').addEventListener('input', (e) => {
            this.params.width = parseInt(e.target.value);
            this.updateCanvasSize();
            this.render();
        });
        document.getElementById('height').addEventListener('input', (e) => {
            this.params.height = parseInt(e.target.value);
            this.updateCanvasSize();
            this.render();
        });

        document.getElementById('patternType').addEventListener('change', (e) => {
            this.params.patternType = parseInt(e.target.value);
            this.render();
        });

        // Color Palette UI
        document.getElementById('addColorBtn').addEventListener('click', () => {
            if (this.params.colors.length < 10) {
                this.params.colors.push({ r: Math.random(), g: Math.random(), b: Math.random() });
                this.updateColorUI();
                this.render();
            }
        });

        document.getElementById('colorBg').addEventListener('input', (e) => {
            this.params.colorBg = this.hexToRgb(e.target.value);
            this.render();
        });
        document.getElementById('bgTransparent').addEventListener('change', (e) => {
            this.params.bgTransparent = e.target.checked;
            // Update Canvas Bg for Preview (Checkerboard vs White)
            // CSS handles checkerboard. If not transparent, we rely on WebGL drawing the bg color.
            // But if transparent, WebGL draws 0,0,0,0, so checkerboard shows through.
            this.render();
        });

        // Sliders
        document.getElementById('density').addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.params.density = val;
            document.getElementById('densityValue').textContent = val;
            this.render();
        });

        document.getElementById('lineWidth').addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.params.lineWidth = val;
            document.getElementById('lineWidthValue').textContent = val;
            this.render();
        });

        document.getElementById('randomBtn').addEventListener('click', () => this.randomize());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportImage());
    }

    updateColorUI() {
        const container = document.getElementById('colorParamsContainer');
        container.innerHTML = '';

        this.params.colors.forEach((color, index) => {
            const div = document.createElement('div');
            div.className = 'color-row';
            div.style.marginBottom = '4px';

            const input = document.createElement('input');
            input.type = 'color';
            input.value = this.rgbToHex(color);
            input.addEventListener('input', (e) => {
                this.params.colors[index] = this.hexToRgb(e.target.value);
                this.render();
            });

            const btn = document.createElement('button');
            btn.textContent = '×';
            btn.className = 'btn btn-secondary';
            btn.style.padding = '0 8px';
            btn.style.marginLeft = '4px';
            btn.onclick = () => {
                if (this.params.colors.length > 1) {
                    this.params.colors.splice(index, 1);
                    this.updateColorUI();
                    this.render();
                }
            };

            div.appendChild(input);
            div.appendChild(btn);
            container.appendChild(div);
        });
    }

    updateCanvasSize() {
        this.canvas.width = this.params.width;
        this.canvas.height = this.params.height;
        this.gl.viewport(0, 0, this.params.width, this.params.height);
        document.getElementById('canvasInfo').textContent = `${this.params.width} × ${this.params.height} px`;
    }

    hexToRgb(hex) {
        return {
            r: parseInt(hex.slice(1, 3), 16) / 255,
            g: parseInt(hex.slice(3, 5), 16) / 255,
            b: parseInt(hex.slice(5, 7), 16) / 255
        };
    }

    rgbToHex(c) {
        const toHex = (n) => {
            const hex = Math.floor(n * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return '#' + toHex(c.r) + toHex(c.g) + toHex(c.b);
    }

    randomize() {
        // Random Pattern
        this.params.patternType = Math.floor(Math.random() * 23);
        document.getElementById('patternType').value = this.params.patternType;

        // Random Colors
        const count = 2 + Math.floor(Math.random() * 3);
        this.params.colors = [];
        for (let i = 0; i < count; i++) {
            this.params.colors.push({ r: Math.random(), g: Math.random(), b: Math.random() });
        }
        this.updateColorUI();

        // Random Params
        this.params.density = 5 + Math.random() * 30;
        this.params.lineWidth = 10 + Math.random() * 80;

        document.getElementById('density').value = this.params.density;
        document.getElementById('densityValue').textContent = Math.floor(this.params.density);
        document.getElementById('lineWidth').value = this.params.lineWidth;
        document.getElementById('lineWidthValue').textContent = Math.floor(this.params.lineWidth);

        this.render();
    }

    exportImage() {
        // ... (Keep existing export logic)
        const formatSelect = document.getElementById('exportFormat');
        const format = formatSelect ? formatSelect.value : 'png';
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const fileExt = format === 'jpeg' ? 'jpg' : 'png';

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const ctx = tempCanvas.getContext('2d');

        if (format === 'jpeg' && this.params.bgTransparent) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }

        ctx.drawImage(this.canvas, 0, 0);
        tempCanvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `geometric_${Date.now()}.${fileExt}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, mimeType, 0.9);
    }

    render() {
        const gl = this.gl;
        gl.useProgram(this.program);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform2f(this.uniforms.resolution, this.params.width, this.params.height);
        gl.uniform1i(this.uniforms.patternType, this.params.patternType);

        // Colors Array
        gl.uniform1i(this.uniforms.colorCount, this.params.colors.length);
        for (let i = 0; i < 10; i++) {
            if (i < this.params.colors.length) {
                const c = this.params.colors[i];
                gl.uniform3f(this.uniforms.colors[i], c.r, c.g, c.b);
            } else {
                gl.uniform3f(this.uniforms.colors[i], 0, 0, 0);
            }
        }

        gl.uniform3f(this.uniforms.bg, this.params.colorBg.r, this.params.colorBg.g, this.params.colorBg.b);
        gl.uniform1f(this.uniforms.bgTransparent, this.params.bgTransparent ? 1.0 : 0.0);

        gl.uniform1f(this.uniforms.density, this.params.density);
        gl.uniform1f(this.uniforms.lineWidth, this.params.lineWidth);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GeometricGenerator();
});
