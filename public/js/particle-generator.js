/**
 * Particle Generator - WebGL Controller
 * Bokeh and Light Particle Effects
 */

class ParticleGenerator {
    constructor() {
        this.canvas = document.getElementById('particleCanvas');
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
            colors: [
                { r: 1.0, g: 0.84, b: 0.0 },   // Gold
                { r: 0.0, g: 0.75, b: 1.0 },   // Cyan
                { r: 1.0, g: 0.41, b: 0.71 }   // Pink
            ],
            colorBg: { r: 0.06, g: 0.09, b: 0.16 },
            bgTransparent: false,
            particleCount: 200,
            minSize: 5,
            maxSize: 40,
            blur: 50,
            minOpacity: 20,
            maxOpacity: 80
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
            
            uniform vec3 u_colors[10];
            uniform int u_colorCount;
            uniform vec3 u_bg;
            uniform float u_bgTransparent;
            
            uniform int u_particleCount;
            uniform float u_minSize;
            uniform float u_maxSize;
            uniform float u_blur;
            uniform float u_minOpacity;
            uniform float u_maxOpacity;
            
            // Pseudo-random function
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }
            
            vec2 random2(vec2 st) {
                return vec2(
                    random(st),
                    random(st + vec2(1.0, 1.0))
                );
            }
            
            void main() {
                vec2 uv = v_texCoord;
                vec2 pixel = gl_FragCoord.xy;
                
                vec3 color = u_bg;
                float totalAlpha = 0.0;
                
                // Render particles
                for(int i = 0; i < 500; i++) {
                    if (i >= u_particleCount) break;
                    
                    // Generate particle properties (deterministic based on index)
                    vec2 seed = vec2(float(i) * 0.1, float(i) * 0.2);
                    vec2 pos = random2(seed);
                    
                    // Size
                    float sizeRandom = random(seed + vec2(2.0, 3.0));
                    float size = u_minSize + sizeRandom * (u_maxSize - u_minSize);
                    
                    // Opacity
                    float opacityRandom = random(seed + vec2(4.0, 5.0));
                    float opacity = (u_minOpacity + opacityRandom * (u_maxOpacity - u_minOpacity)) / 100.0;
                    
                    // Color
                    float colorRandom = random(seed + vec2(6.0, 7.0));
                    int colorIdx = int(floor(colorRandom * float(u_colorCount)));
                    vec3 particleColor = vec3(1.0);
                    for(int c = 0; c < 10; c++) {
                        if (c == colorIdx) particleColor = u_colors[c];
                    }
                    
                    // Position in pixels
                    vec2 particlePos = pos * u_resolution;
                    
                    // Distance from particle center
                    float dist = length(pixel - particlePos);
                    
                    // Soft circle with blur
                    float blurFactor = u_blur / 100.0;
                    float softness = size * (0.3 + blurFactor * 0.7);
                    
                    float alpha = 1.0 - smoothstep(size - softness, size + softness, dist);
                    alpha *= opacity;
                    
                    // Additive blending
                    if (alpha > 0.01) {
                        color = mix(color, particleColor, alpha * 0.5);
                        totalAlpha += alpha * 0.3;
                    }
                }
                
                totalAlpha = clamp(totalAlpha, 0.0, 1.0);
                
                if (u_bgTransparent > 0.5) {
                    gl_FragColor = vec4(color, totalAlpha);
                } else {
                    gl_FragColor = vec4(color, 1.0);
                }
            }
        `;

        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) {
            console.error('Failed to create shaders');
            return;
        }

        this.program = this.createProgram(vertexShader, fragmentShader);

        if (!this.program) {
            console.error('Failed to create program');
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
            particleCount: gl.getUniformLocation(this.program, 'u_particleCount'),
            minSize: gl.getUniformLocation(this.program, 'u_minSize'),
            maxSize: gl.getUniformLocation(this.program, 'u_maxSize'),
            blur: gl.getUniformLocation(this.program, 'u_blur'),
            minOpacity: gl.getUniformLocation(this.program, 'u_minOpacity'),
            maxOpacity: gl.getUniformLocation(this.program, 'u_maxOpacity'),
            bg: gl.getUniformLocation(this.program, 'u_bg'),
            bgTransparent: gl.getUniformLocation(this.program, 'u_bgTransparent'),
            colorCount: gl.getUniformLocation(this.program, 'u_colorCount')
        };

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
        ['particleCount', 'minSize', 'maxSize', 'blur', 'minOpacity', 'maxOpacity'].forEach(id => {
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
        // Random colors
        const count = 2 + Math.floor(Math.random() * 4);
        this.params.colors = [];
        for (let i = 0; i < count; i++) {
            this.params.colors.push({ r: Math.random(), g: Math.random(), b: Math.random() });
        }
        this.updateColorUI();

        // Random parameters
        this.params.particleCount = 100 + Math.floor(Math.random() * 300);
        this.params.minSize = 2 + Math.floor(Math.random() * 20);
        this.params.maxSize = this.params.minSize + 20 + Math.floor(Math.random() * 100);
        this.params.blur = Math.floor(Math.random() * 100);
        this.params.minOpacity = Math.floor(Math.random() * 50);
        this.params.maxOpacity = 50 + Math.floor(Math.random() * 50);

        ['particleCount', 'minSize', 'maxSize', 'blur', 'minOpacity', 'maxOpacity'].forEach(id => {
            document.getElementById(id).value = this.params[id];
            document.getElementById(id + 'Value').textContent = Math.floor(this.params[id]);
        });

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
        a.download = `particles_${Date.now()}.${fileExt}`;
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

        gl.uniform1i(this.uniforms.particleCount, this.params.particleCount);
        gl.uniform1f(this.uniforms.minSize, this.params.minSize);
        gl.uniform1f(this.uniforms.maxSize, this.params.maxSize);
        gl.uniform1f(this.uniforms.blur, this.params.blur);
        gl.uniform1f(this.uniforms.minOpacity, this.params.minOpacity);
        gl.uniform1f(this.uniforms.maxOpacity, this.params.maxOpacity);

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
    new ParticleGenerator();
});
