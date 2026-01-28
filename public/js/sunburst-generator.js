/**
 * Sunburst Generator - WebGL Controller
 * Radial/Sunburst Patterns
 */

class SunburstGenerator {
    constructor() {
        this.canvas = document.getElementById('sunburstCanvas');
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
                { r: 1.0, g: 0.6, b: 0.2 },  // Orange
                { r: 1.0, g: 0.8, b: 0.4 }   // Light Orange
            ],
            colorBg: { r: 1.0, g: 1.0, b: 1.0 },
            bgTransparent: false,
            stripeCount: 32,
            centerX: 50,
            centerY: 50,
            rotation: 0,
            swirl: 0
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
            
            uniform float u_stripeCount;
            uniform vec2 u_center;
            uniform float u_rotation;
            uniform float u_swirl;
            
            #define PI 3.14159265359
            
            vec3 getColor(float t) {
                t = fract(t); // Repeat
                
                // Color interleaving (0 -> color1, 0.5 -> color2 etc)
                // Simplified: alternating colors
                
                float idxC = floor(t * float(u_colorCount));
                int idx = int(idxC);
                
                for(int i=0; i<10; i++) {
                    if (i == idx) return u_colors[i];
                }
                return u_colors[0];
            }
            
            void main() {
                vec2 uv = v_texCoord;
                float aspect = u_resolution.x / u_resolution.y;
                
                // Centered coordinates
                vec2 center = u_center / 100.0;
                vec2 coord = uv - center;
                coord.x *= aspect;
                
                // Polar coordinates
                float dist = length(coord);
                float angle = atan(coord.y, coord.x);
                
                // Swirl effect
                angle += dist * (u_swirl / 10.0);
                
                // Rotation
                angle += u_rotation * PI / 180.0;
                
                // Normalize angle to 0-1
                float a = (angle / (2.0 * PI)) + 0.5;
                
                // Stripes
                float val = a * u_stripeCount;
                
                // Make it binary (solid stripes)
                // float stripe = step(0.5, fract(val)); // 2 colors
                
                // Or Multi-color support:
                // We map 'val' to color count
                // val is 0 .. stripeCount
                
                // We want to alternate colors per stripe.
                // stripe index = floor(val).
                
                float stripeIdx = floor(val);
                float colorT = mod(stripeIdx, float(u_colorCount)) / float(u_colorCount);
                
                // We want discrete index selection
                // getColor expects 0..1 range and splits it
                
                // Let's just pick color based on modulo
                int cIdx = int(mod(stripeIdx, float(u_colorCount)));
                
                vec3 color = u_colors[0];
                for(int i=0; i<10; i++) {
                    if (i == cIdx) color = u_colors[i];
                }
                
                // Optional: mix with background if needed? 
                // Sunburst usually fills the screen. 
                // If transparent background is asked... maybe just use colors.
                // But if we want gaps? Usually sunburst is solid alternating colors.
                // Unless 2nd color is BG?
                
                // Let's treat all colors as active stripes.
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;

        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) return;

        this.program = this.createProgram(vertexShader, fragmentShader);
        if (!this.program) return;

        const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        this.uniforms = {
            resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            stripeCount: gl.getUniformLocation(this.program, 'u_stripeCount'),
            center: gl.getUniformLocation(this.program, 'u_center'),
            rotation: gl.getUniformLocation(this.program, 'u_rotation'),
            swirl: gl.getUniformLocation(this.program, 'u_swirl'),
            bg: gl.getUniformLocation(this.program, 'u_bg'),
            bgTransparent: gl.getUniformLocation(this.program, 'u_bgTransparent'),
            colorCount: gl.getUniformLocation(this.program, 'u_colorCount')
        };

        this.uniforms.colors = [];
        for (let i = 0; i < 10; i++) {
            this.uniforms.colors.push(gl.getUniformLocation(this.program, `u_colors[${i}]`));
        }

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

        ['stripeCount', 'centerX', 'centerY', 'rotation', 'swirl'].forEach(id => {
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
        const count = 2 + Math.floor(Math.random() * 3);
        this.params.colors = [];
        for (let i = 0; i < count; i++) {
            this.params.colors.push({ r: Math.random(), g: Math.random(), b: Math.random() });
        }
        this.updateColorUI();

        this.params.stripeCount = 8 + Math.floor(Math.random() * 60);
        this.params.centerX = 30 + Math.floor(Math.random() * 40);
        this.params.centerY = 30 + Math.floor(Math.random() * 40);
        this.params.rotation = Math.floor(Math.random() * 360);
        this.params.swirl = Math.floor(Math.random() * 40) - 20;

        ['stripeCount', 'centerX', 'centerY', 'rotation', 'swirl'].forEach(id => {
            document.getElementById(id).value = this.params[id];
            document.getElementById(id + 'Value').textContent = Math.floor(this.params[id]);
        });

        this.render();
    }

    exportImage() {
        const format = document.getElementById('exportFormat').value;
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
            this.canvas.toBlob(blob => this.saveBlob(blob, fileExt), mimeType);
        }
    }

    saveBlob(blob, fileExt) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sunburst_${Date.now()}.${fileExt}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    render() {
        const gl = this.gl;
        gl.useProgram(this.program);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform2f(this.uniforms.resolution, this.params.width, this.params.height);
        gl.uniform1f(this.uniforms.stripeCount, this.params.stripeCount);
        gl.uniform2f(this.uniforms.center, this.params.centerX, this.params.centerY);
        gl.uniform1f(this.uniforms.rotation, this.params.rotation);
        gl.uniform1f(this.uniforms.swirl, this.params.swirl);

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
    new SunburstGenerator();
});
