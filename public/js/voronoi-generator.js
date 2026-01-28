/**
 * Voronoi Generator - WebGL Controller
 * Cell-based Organic Patterns
 */

class VoronoiGenerator {
    constructor() {
        this.canvas = document.getElementById('voronoiCanvas');
        this.gl = this.canvas.getContext('webgl', {
            preserveDrawingBuffer: true,
            premultipliedAlpha: false,
            alpha: true
        });

        if (!this.gl) {
            console.error('WebGL not supported');
            return;
        }

        this.params = {
            width: 1600,
            height: 1200,
            cellType: 0, // 0=Classic, 1=Borders, 2=BorderOnly, 3=Worley
            colors: [
                { r: 0.96, g: 0.58, b: 0.98 },  // Pink
                { r: 0.96, g: 0.34, b: 0.42 },  // Red
                { r: 0.53, g: 0.81, b: 0.92 },  // Blue
                { r: 0.99, g: 0.85, b: 0.46 }   // Yellow
            ],
            borderColor: { r: 0.0, g: 0.0, b: 0.0 },
            colorBg: { r: 1.0, g: 1.0, b: 1.0 },
            bgTransparent: false,
            cellCount: 20,
            borderWidth: 2,
            randomness: 100,
            distanceMetric: 0, // 0=Euclidean, 1=Manhattan, 2=Chebyshev
            seed: 1234
        };

        this.init();
        this.setupEventListeners();
        this.updateColorUI();
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
            uniform int u_cellType;
            uniform int u_distanceMetric;
            
            uniform vec3 u_colors[10];
            uniform int u_colorCount;
            uniform vec3 u_borderColor;
            uniform vec3 u_bg;
            uniform float u_bgTransparent;
            
            uniform int u_cellCount;
            uniform float u_borderWidth;
            uniform float u_randomness;
            uniform float u_seed;
            
            // Hash function
            float hash(vec2 p) {
                p = fract(p * vec2(123.34 + u_seed, 456.21 + u_seed));
                p += dot(p, p + 45.32);
                return fract(p.x * p.y);
            }
            
            vec2 hash2(vec2 p) {
                return vec2(hash(p), hash(p + vec2(1.0, 1.0)));
            }
            
            // Distance functions
            float distEuclidean(vec2 a, vec2 b) {
                return length(a - b);
            }
            
            float distManhattan(vec2 a, vec2 b) {
                vec2 d = abs(a - b);
                return d.x + d.y;
            }
            
            float distChebyshev(vec2 a, vec2 b) {
                vec2 d = abs(a - b);
                return max(d.x, d.y);
            }
            
            float getDistance(vec2 a, vec2 b) {
                if (u_distanceMetric == 0) return distEuclidean(a, b);
                if (u_distanceMetric == 1) return distManhattan(a, b);
                return distChebyshev(a, b);
            }
            
            void main() {
                vec2 uv = v_texCoord;
                float aspect = u_resolution.x / u_resolution.y;
                vec2 coord = uv;
                coord.x *= aspect;
                
                float minDist1 = 999.0;
                float minDist2 = 999.0;
                int closestIdx = 0;
                
                // Generate cell points and find closest
                for(int i = 0; i < 100; i++) {
                    if (i >= u_cellCount) break;
                    
                    // Generate cell position
                    vec2 seed = vec2(float(i) * 0.1, float(i) * 0.2);
                    vec2 basePos = hash2(seed);
                    
                    // Add randomness
                    vec2 offset = (hash2(seed + vec2(2.0, 3.0)) - 0.5) * (u_randomness / 100.0);
                    vec2 cellPos = basePos + offset;
                    cellPos.x *= aspect;
                    
                    float dist = getDistance(coord, cellPos);
                    
                    if (dist < minDist1) {
                        minDist2 = minDist1;
                        minDist1 = dist;
                        closestIdx = i;
                    } else if (dist < minDist2) {
                        minDist2 = dist;
                    }
                }
                
                vec3 color = u_bg;
                
                if (u_cellType == 0) {
                    // Classic Voronoi - solid cells
                    int colorIdx = closestIdx;
                    
                    // Manual modulo
                    if (colorIdx >= u_colorCount) colorIdx = colorIdx - u_colorCount;
                    if (colorIdx >= u_colorCount) colorIdx = colorIdx - u_colorCount;
                    if (colorIdx >= u_colorCount) colorIdx = colorIdx - u_colorCount;
                    if (colorIdx >= u_colorCount) colorIdx = colorIdx - u_colorCount;
                    if (colorIdx >= u_colorCount) colorIdx = colorIdx - u_colorCount;
                    
                    for(int i = 0; i < 10; i++) {
                        if (i >= u_colorCount) break;
                        if (i == colorIdx) color = u_colors[i];
                    }
                    
                    // Border
                    float borderDist = (minDist2 - minDist1) * 100.0;
                    if (borderDist < u_borderWidth) {
                        color = u_borderColor;
                    }
                    
                } else if (u_cellType == 1) {
                    // Cell with borders (distance to closest)
                    float t = smoothstep(0.0, 0.3, minDist1);
                    
                    int colorIdx = closestIdx;
                    if (colorIdx >= u_colorCount) colorIdx = colorIdx - u_colorCount;
                    if (colorIdx >= u_colorCount) colorIdx = colorIdx - u_colorCount;
                    if (colorIdx >= u_colorCount) colorIdx = colorIdx - u_colorCount;
                    if (colorIdx >= u_colorCount) colorIdx = colorIdx - u_colorCount;
                    
                    vec3 cellColor = u_colors[0];
                    for(int i = 0; i < 10; i++) {
                        if (i >= u_colorCount) break;
                        if (i == colorIdx) cellColor = u_colors[i];
                    }
                    
                    color = mix(cellColor, u_borderColor, t);
                    
                } else if (u_cellType == 2) {
                    // Border only
                    float borderDist = (minDist2 - minDist1) * 100.0;
                    if (borderDist < u_borderWidth) {
                        color = u_borderColor;
                    }
                    
                } else if (u_cellType == 3) {
                    // Worley noise (smooth gradient)
                    float t = smoothstep(0.0, 0.5, minDist1);
                    
                    int colorIdx = closestIdx;
                    if (colorIdx >= u_colorCount) colorIdx = colorIdx - u_colorCount;
                    if (colorIdx >= u_colorCount) colorIdx = colorIdx - u_colorCount;
                    if (colorIdx >= u_colorCount) colorIdx = colorIdx - u_colorCount;
                    
                    vec3 cellColor = u_colors[0];
                    for(int i = 0; i < 10; i++) {
                        if (i >= u_colorCount) break;
                        if (i == colorIdx) cellColor = u_colors[i];
                    }
                    
                    color = mix(cellColor, u_bg, t);
                }
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;

        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader) {
            console.error('Failed to create vertex shader');
            return;
        }

        if (!fragmentShader) {
            console.error('Failed to create fragment shader');
            return;
        }

        this.program = this.createProgram(vertexShader, fragmentShader);

        if (!this.program) {
            console.error('Failed to link program');
            return;
        }

        const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        this.uniforms = {
            resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            cellType: gl.getUniformLocation(this.program, 'u_cellType'),
            distanceMetric: gl.getUniformLocation(this.program, 'u_distanceMetric'),
            cellCount: gl.getUniformLocation(this.program, 'u_cellCount'),
            borderWidth: gl.getUniformLocation(this.program, 'u_borderWidth'),
            randomness: gl.getUniformLocation(this.program, 'u_randomness'),
            seed: gl.getUniformLocation(this.program, 'u_seed'),
            borderColor: gl.getUniformLocation(this.program, 'u_borderColor'),
            bg: gl.getUniformLocation(this.program, 'u_bg'),
            bgTransparent: gl.getUniformLocation(this.program, 'u_bgTransparent'),
            colorCount: gl.getUniformLocation(this.program, 'u_colorCount')
        };

        this.uniforms.colors = [];
        for (let i = 0; i < 10; i++) {
            this.uniforms.colors.push(gl.getUniformLocation(this.program, `u_colors[${i}]`));
        }

        // Initialize canvas size
        this.canvas.width = this.params.width;
        this.canvas.height = this.params.height;
        gl.viewport(0, 0, this.params.width, this.params.height);
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

        // Cell Type
        document.getElementById('cellType').addEventListener('change', (e) => {
            this.params.cellType = parseInt(e.target.value);
            this.render();
        });

        // Distance Metric
        document.getElementById('distanceMetric').addEventListener('change', (e) => {
            this.params.distanceMetric = parseInt(e.target.value);
            this.render();
        });

        // Colors
        document.getElementById('addColorBtn').addEventListener('click', () => {
            if (this.params.colors.length < 10) {
                this.params.colors.push({ r: Math.random(), g: Math.random(), b: Math.random() });
                this.updateColorUI();
                this.render();
            }
        });

        document.getElementById('borderColor').addEventListener('input', (e) => {
            this.params.borderColor = this.hexToRgb(e.target.value);
            this.render();
        });

        document.getElementById('colorBg').addEventListener('input', (e) => {
            this.params.colorBg = this.hexToRgb(e.target.value);
            this.render();
        });
        document.getElementById('bgTransparent').addEventListener('change', (e) => {
            this.params.bgTransparent = e.target.checked;
            this.render();
        });

        // Parameters
        ['cellCount', 'borderWidth', 'randomness', 'seed'].forEach(id => {
            const slider = document.getElementById(id);
            const display = document.getElementById(id + 'Value');
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.params[id] = val;
                display.textContent = Math.floor(val);
                this.render();
            });
        });

        document.getElementById('randomBtn').addEventListener('click', () => this.randomize());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportImage());
    }

    updateColorUI() {
        const container = document.getElementById('colorPaletteContainer');
        container.innerHTML = '';

        this.params.colors.forEach((color, index) => {
            const div = document.createElement('div');
            div.className = 'color-row';

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
                if (this.params.colors.length > 2) {
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
        // Random cell type
        this.params.cellType = Math.floor(Math.random() * 4);
        document.getElementById('cellType').value = this.params.cellType;

        // Random distance metric
        this.params.distanceMetric = Math.floor(Math.random() * 3);
        document.getElementById('distanceMetric').value = this.params.distanceMetric;

        // Random colors
        const count = 3 + Math.floor(Math.random() * 5);
        this.params.colors = [];
        for (let i = 0; i < count; i++) {
            this.params.colors.push({ r: Math.random(), g: Math.random(), b: Math.random() });
        }
        this.updateColorUI();

        // Random parameters
        this.params.cellCount = 10 + Math.floor(Math.random() * 70);
        this.params.borderWidth = Math.floor(Math.random() * 15);
        this.params.randomness = Math.floor(Math.random() * 100);
        this.params.seed = Math.floor(Math.random() * 10000);

        document.getElementById('cellCount').value = this.params.cellCount;
        document.getElementById('cellCountValue').textContent = Math.floor(this.params.cellCount);

        document.getElementById('borderWidth').value = this.params.borderWidth;
        document.getElementById('borderWidthValue').textContent = Math.floor(this.params.borderWidth);

        document.getElementById('randomness').value = this.params.randomness;
        document.getElementById('randomnessValue').textContent = Math.floor(this.params.randomness);

        document.getElementById('seed').value = this.params.seed;
        document.getElementById('seedValue').textContent = Math.floor(this.params.seed);

        this.render();
    }

    exportImage() {
        const formatSelect = document.getElementById('exportFormat');
        const format = formatSelect ? formatSelect.value : 'png';
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const fileExt = format === 'jpeg' ? 'jpg' : 'png';

        if (format === 'jpeg' && this.params.bgTransparent) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            const ctx = tempCanvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            ctx.drawImage(this.canvas, 0, 0);
            tempCanvas.toBlob(blob => this.saveBlob(blob, fileExt), mimeType, 0.9);
        } else {
            this.canvas.toBlob(blob => this.saveBlob(blob, fileExt), mimeType, format === 'jpeg' ? 0.9 : undefined);
        }
    }

    saveBlob(blob, fileExt) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voronoi_${Date.now()}.${fileExt}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    render() {
        if (!this.program) {
            console.error('Cannot render: program is null');
            return;
        }

        const gl = this.gl;
        gl.useProgram(this.program);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform2f(this.uniforms.resolution, this.params.width, this.params.height);
        gl.uniform1i(this.uniforms.cellType, this.params.cellType);
        gl.uniform1i(this.uniforms.distanceMetric, this.params.distanceMetric);
        gl.uniform1i(this.uniforms.cellCount, this.params.cellCount);
        gl.uniform1f(this.uniforms.borderWidth, this.params.borderWidth);
        gl.uniform1f(this.uniforms.randomness, this.params.randomness);
        gl.uniform1f(this.uniforms.seed, this.params.seed);

        gl.uniform3f(this.uniforms.borderColor, this.params.borderColor.r, this.params.borderColor.g, this.params.borderColor.b);
        gl.uniform3f(this.uniforms.bg, this.params.colorBg.r, this.params.colorBg.g, this.params.colorBg.b);
        gl.uniform1f(this.uniforms.bgTransparent, this.params.bgTransparent ? 1.0 : 0.0);

        gl.uniform1i(this.uniforms.colorCount, this.params.colors.length);
        for (let i = 0; i < 10; i++) {
            if (i < this.params.colors.length) {
                const c = this.params.colors[i];
                gl.uniform3f(this.uniforms.colors[i], c.r, c.g, c.b);
            } else {
                gl.uniform3f(this.uniforms.colors[i], 0, 0, 0);
            }
        }

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VoronoiGenerator();
});
