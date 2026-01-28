/**
 * Perlin Noise Generator - WebGL Controller
 * Smooth Organic Noise Patterns
 */

class PerlinGenerator {
    constructor() {
        this.canvas = document.getElementById('perlinCanvas');
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
            noiseType: 0, // 0=Perlin, 1=Simplex, 2=Turbulence, 3=Ridged
            colors: [
                { r: 0.2, g: 0.4, b: 0.8 },  // Blue
                { r: 0.9, g: 0.9, b: 0.95 }  // White
            ],
            colorBg: { r: 0.97, g: 0.98, b: 0.99 },
            bgTransparent: false,
            scale: 50,
            octaves: 6,
            persistence: 50,
            lacunarity: 2.0,
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
            uniform int u_noiseType;
            
            uniform vec3 u_colors[10];
            uniform int u_colorCount;
            uniform vec3 u_bg;
            uniform float u_bgTransparent;
            
            uniform float u_scale;
            uniform int u_octaves;
            uniform float u_persistence;
            uniform float u_lacunarity;
            uniform float u_seed;
            
            // Hash function for pseudo-random numbers
            float hash(vec2 p) {
                p = fract(p * vec2(123.34, 456.21));
                p += dot(p, p + 45.32);
                return fract(p.x * p.y);
            }
            
            // 2D Perlin noise
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                
                // Smooth interpolation
                vec2 u = f * f * (3.0 - 2.0 * f);
                
                // Four corners
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                
                // Bilinear interpolation
                return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
            }
            
            // Simplex-style noise (simplified)
            float simplex(vec2 p) {
                const float K1 = 0.366025404; // (sqrt(3)-1)/2
                const float K2 = 0.211324865; // (3-sqrt(3))/6
                
                vec2 i = floor(p + (p.x + p.y) * K1);
                vec2 a = p - i + (i.x + i.y) * K2;
                vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec2 b = a - o + K2;
                vec2 c = a - 1.0 + 2.0 * K2;
                
                vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
                vec3 n = h * h * h * h * vec3(hash(i), hash(i+o), hash(i+1.0));
                
                return dot(n, vec3(70.0));
            }
            
            // Fractal Brownian Motion
            float fbm(vec2 p, int octaves, float persistence, float lacunarity) {
                float value = 0.0;
                float amplitude = 1.0;
                float frequency = 1.0;
                float maxValue = 0.0;
                
                for(int i = 0; i < 8; i++) {
                    if (i >= octaves) break;
                    
                    float n = 0.0;
                    if (u_noiseType == 0) {
                        n = noise(p * frequency);
                    } else {
                        n = simplex(p * frequency) * 0.5 + 0.5;
                    }
                    
                    value += n * amplitude;
                    maxValue += amplitude;
                    
                    amplitude *= persistence;
                    frequency *= lacunarity;
                }
                
                return value / maxValue;
            }
            
            // Turbulence (absolute value of noise)
            float turbulence(vec2 p, int octaves, float persistence, float lacunarity) {
                float value = 0.0;
                float amplitude = 1.0;
                float frequency = 1.0;
                float maxValue = 0.0;
                
                for(int i = 0; i < 8; i++) {
                    if (i >= octaves) break;
                    
                    float n = abs(noise(p * frequency) * 2.0 - 1.0);
                    value += n * amplitude;
                    maxValue += amplitude;
                    
                    amplitude *= persistence;
                    frequency *= lacunarity;
                }
                
                return value / maxValue;
            }
            
            // Ridged noise
            float ridged(vec2 p, int octaves, float persistence, float lacunarity) {
                float value = 0.0;
                float amplitude = 1.0;
                float frequency = 1.0;
                float maxValue = 0.0;
                
                for(int i = 0; i < 8; i++) {
                    if (i >= octaves) break;
                    
                    float n = 1.0 - abs(noise(p * frequency) * 2.0 - 1.0);
                    n = n * n;
                    value += n * amplitude;
                    maxValue += amplitude;
                    
                    amplitude *= persistence;
                    frequency *= lacunarity;
                }
                
                return value / maxValue;
            }
            
            vec3 getColor(float t) {
                t = clamp(t, 0.0, 1.0);
                
                if (u_colorCount <= 1) return u_colors[0];
                
                float scaledT = t * float(u_colorCount - 1);
                int idx = int(floor(scaledT));
                float f = fract(scaledT);
                
                vec3 c1 = vec3(0.0);
                vec3 c2 = vec3(0.0);
                
                for(int i=0; i<10; i++) {
                    if (i == idx) c1 = u_colors[i];
                    if (i == idx + 1) c2 = u_colors[i];
                }
                
                if (idx >= u_colorCount - 1) {
                    for(int i=0; i<10; i++) {
                        if (i == u_colorCount - 1) { c1 = u_colors[i]; c2 = u_colors[i]; }
                    }
                }
                
                return mix(c1, c2, f);
            }
            
            void main() {
                vec2 uv = v_texCoord;
                vec2 p = uv * u_scale + u_seed;
                
                float n = 0.0;
                
                if (u_noiseType == 0 || u_noiseType == 1) {
                    // Classic Perlin or Simplex
                    n = fbm(p, u_octaves, u_persistence, u_lacunarity);
                } else if (u_noiseType == 2) {
                    // Turbulence
                    n = turbulence(p, u_octaves, u_persistence, u_lacunarity);
                } else if (u_noiseType == 3) {
                    // Ridged
                    n = ridged(p, u_octaves, u_persistence, u_lacunarity);
                }
                
                vec3 color = getColor(n);
                
                if (u_bgTransparent > 0.5) {
                    gl_FragColor = vec4(color, 1.0);
                } else {
                    gl_FragColor = vec4(color, 1.0);
                }
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
            noiseType: gl.getUniformLocation(this.program, 'u_noiseType'),
            scale: gl.getUniformLocation(this.program, 'u_scale'),
            octaves: gl.getUniformLocation(this.program, 'u_octaves'),
            persistence: gl.getUniformLocation(this.program, 'u_persistence'),
            lacunarity: gl.getUniformLocation(this.program, 'u_lacunarity'),
            seed: gl.getUniformLocation(this.program, 'u_seed'),
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

        // Noise Type
        document.getElementById('noiseType').addEventListener('change', (e) => {
            this.params.noiseType = parseInt(e.target.value);
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

        document.getElementById('colorBg').addEventListener('input', (e) => {
            this.params.colorBg = this.hexToRgb(e.target.value);
            this.render();
        });
        document.getElementById('bgTransparent').addEventListener('change', (e) => {
            this.params.bgTransparent = e.target.checked;
            this.render();
        });

        // Parameters
        ['scale', 'octaves', 'persistence', 'seed'].forEach(id => {
            const slider = document.getElementById(id);
            const display = document.getElementById(id + 'Value');
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.params[id] = val;
                display.textContent = Math.floor(val);
                this.render();
            });
        });

        // Lacunarity (special handling for decimal display)
        const lacSlider = document.getElementById('lacunarity');
        const lacDisplay = document.getElementById('lacunarityValue');
        lacSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value) / 10.0; // 10-40 -> 1.0-4.0
            this.params.lacunarity = val;
            lacDisplay.textContent = val.toFixed(1);
            this.render();
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
        // Random noise type
        this.params.noiseType = Math.floor(Math.random() * 4);
        document.getElementById('noiseType').value = this.params.noiseType;

        // Random colors
        const count = 2 + Math.floor(Math.random() * 4);
        this.params.colors = [];
        for (let i = 0; i < count; i++) {
            this.params.colors.push({ r: Math.random(), g: Math.random(), b: Math.random() });
        }
        this.updateColorUI();

        // Random parameters
        this.params.scale = 10 + Math.floor(Math.random() * 90);
        this.params.octaves = 1 + Math.floor(Math.random() * 7);
        this.params.persistence = Math.floor(Math.random() * 100);
        this.params.lacunarity = 1.0 + Math.random() * 3.0;
        this.params.seed = Math.floor(Math.random() * 10000);

        document.getElementById('scale').value = this.params.scale;
        document.getElementById('scaleValue').textContent = Math.floor(this.params.scale);

        document.getElementById('octaves').value = this.params.octaves;
        document.getElementById('octavesValue').textContent = Math.floor(this.params.octaves);

        document.getElementById('persistence').value = this.params.persistence;
        document.getElementById('persistenceValue').textContent = Math.floor(this.params.persistence);

        document.getElementById('lacunarity').value = Math.floor(this.params.lacunarity * 10);
        document.getElementById('lacunarityValue').textContent = this.params.lacunarity.toFixed(1);

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
        a.download = `perlin_${Date.now()}.${fileExt}`;
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
        gl.uniform1i(this.uniforms.noiseType, this.params.noiseType);
        gl.uniform1f(this.uniforms.scale, this.params.scale);
        gl.uniform1i(this.uniforms.octaves, this.params.octaves);
        gl.uniform1f(this.uniforms.persistence, this.params.persistence / 100.0);
        gl.uniform1f(this.uniforms.lacunarity, this.params.lacunarity);
        gl.uniform1f(this.uniforms.seed, this.params.seed);

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
    new PerlinGenerator();
});
