/**
 * Memphis Generator - WebGL Controller
 * 80s Pop Geometric Patterns
 */

class MemphisGenerator {
    constructor() {
        this.canvas = document.getElementById('memphisCanvas');
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
                { r: 1.0, g: 0.0, b: 0.5 },    // Pink
                { r: 0.0, g: 0.8, b: 0.8 },    // Teal
                { r: 1.0, g: 0.9, b: 0.0 },    // Yellow
                { r: 0.2, g: 0.0, b: 0.5 }     // Purple
            ],
            colorBg: { r: 0.95, g: 1.0, b: 1.0 }, // Light Cyan
            density: 10, // Grid size basically
            scale: 50,
            seed: Math.random() * 1000
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
            
            uniform float u_density;
            uniform float u_scale;
            uniform float u_seed;
            
            #define PI 3.14159265359

            float hash(vec2 p) {
                p = fract(p * vec2(123.34 + u_seed, 456.21 + u_seed));
                p += dot(p, p + 45.32);
                return fract(p.x * p.y);
            }

            vec2 rotate(vec2 p, float angle) {
                float c = cos(angle);
                float s = sin(angle);
                return vec2(p.x*c - p.y*s, p.x*s + p.y*c);
            }
            
            // Shapes
            float circle(vec2 p, float r) {
                return length(p) - r;
            }
            
            float box(vec2 p, vec2 b) {
                vec2 d = abs(p) - b;
                return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
            }
            
            float triangle(vec2 p, float s) {
                const float k = sqrt(3.0);
                p.x = abs(p.x) - s;
                p.y = p.y + s/k;
                if( p.x+k*p.y > 0.0 ) p = vec2(p.x-k*p.y,-k*p.x-p.y)/2.0;
                p.x -= clamp( p.x, -2.0*s, 0.0 );
                return -length(p)*sign(p.y);
            }
            
            float zigzag(vec2 p, float w, float h) {
                // Sine wave
                float d = abs(p.y - sin(p.x * 10.0) * h) - w;
                // Crop
                float boxD = max(abs(p.x) - 0.4, abs(p.y) - 0.4);
                return max(d, boxD);
            }
            
            void main() {
                vec2 uv = v_texCoord;
                float aspect = u_resolution.x / u_resolution.y;
                uv.x *= aspect;
                
                // Grid
                float density = u_density; // Cells per row roughly
                vec2 id = floor(uv * density);
                vec2 gv = fract(uv * density) - 0.5;
                
                // Randoms per cell
                float rndShape = hash(id);
                float rndColor = hash(id + vec2(1.0, 0.0));
                float rndRot = hash(id + vec2(0.0, 1.0));
                float rndPos = hash(id + vec2(1.0, 1.0));
                
                // Small random offset
                gv += (vec2(hash(id)-0.5, hash(id+vec2(0.1))-0.5)) * 0.4;
                
                // Rotation
                gv = rotate(gv, rndRot * 2.0 * PI);
                
                float d = 1.0;
                
                // Shape selection
                // 0.0-0.2: Circle
                // 0.2-0.4: Box
                // 0.4-0.6: Triangle
                // 0.6-0.8: Zigzag/Squiggle
                // 0.8-1.0: Dots
                
                float size = u_scale / 200.0;
                
                if (rndShape < 0.2) {
                     d = circle(gv, size);
                } else if (rndShape < 0.4) {
                     d = box(gv, vec2(size));
                } else if (rndShape < 0.6) {
                     d = triangle(gv, size);
                } else if (rndShape < 0.8) {
                     // Zigzag 
                     // gv.x is -0.5 to 0.5
                     d = abs(gv.y - sin(gv.x * 15.0) * 0.1) - 0.02;
                     // Trim ends
                     d = max(d, abs(gv.x) - size);
                } else {
                     // 3 dots
                     vec2 p = gv;
                     p.x += 0.2;
                     float d1 = circle(p, 0.05);
                     p.x -= 0.2;
                     float d2 = circle(p, 0.05);
                     p.x -= 0.2;
                     float d3 = circle(p, 0.05);
                     d = min(min(d1, d2), d3);
                }
                
                // Color
                vec3 color = u_bg;
                
                // Shape mask
                float mask = smoothstep(0.01, 0.0, d);
                
                if (mask > 0.0) {
                    // Pick color
                    int cIdx = int(floor(rndColor * float(u_colorCount)));
                    for(int i=0; i<10; i++) {
                        if(i == cIdx) color = u_colors[i];
                    }
                    // Shadow offset (simple 3D effect style)
                    // If we wanted shadows we'd need another pass or check offset distance
                    // Keeping it flat for now as requested.
                }
                
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
            density: gl.getUniformLocation(this.program, 'u_density'),
            scale: gl.getUniformLocation(this.program, 'u_scale'),
            seed: gl.getUniformLocation(this.program, 'u_seed'),
            bg: gl.getUniformLocation(this.program, 'u_bg'),
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

        ['density', 'scale'].forEach(id => {
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
        this.params.seed = Math.random() * 1000;

        const count = 3 + Math.floor(Math.random() * 4);
        this.params.colors = [];
        for (let i = 0; i < count; i++) {
            this.params.colors.push({ r: Math.random(), g: Math.random(), b: Math.random() });
        }
        this.updateColorUI();

        this.params.density = 4 + Math.floor(Math.random() * 16);
        this.params.scale = 30 + Math.floor(Math.random() * 60);

        document.getElementById('density').value = this.params.density;
        document.getElementById('densityValue').textContent = this.params.density;

        document.getElementById('scale').value = this.params.scale;
        document.getElementById('scaleValue').textContent = this.params.scale;

        this.render();
    }

    exportImage() {
        const format = document.getElementById('exportFormat').value;
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const fileExt = format === 'jpeg' ? 'jpg' : 'png';
        this.canvas.toBlob(blob => this.saveBlob(blob, fileExt), mimeType);
    }

    saveBlob(blob, fileExt) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `memphis_${Date.now()}.${fileExt}`;
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
        gl.uniform1f(this.uniforms.density, this.params.density);
        gl.uniform1f(this.uniforms.scale, this.params.scale);
        gl.uniform1f(this.uniforms.seed, this.params.seed);

        gl.uniform3f(this.uniforms.bg, this.params.colorBg.r, this.params.colorBg.g, this.params.colorBg.b);

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
    new MemphisGenerator();
});
