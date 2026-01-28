/**
 * Liquid Generator - WebGL Controller
 * Domain Warping / Fluid Effects
 */

class LiquidGenerator {
    constructor() {
        this.canvas = document.getElementById('liquidCanvas');
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
                { r: 0.0, g: 0.2, b: 0.8 },   // Deep Blue
                { r: 0.0, g: 0.8, b: 0.9 },   // Cyan
                { r: 0.8, g: 0.2, b: 0.8 },   // Purple
                { r: 0.0, g: 0.0, b: 0.2 }    // Dark
            ],
            distortion: 50,
            scale: 30,
            speed: 20
        };

        this.time = 0;
        this.animationId = null;

        this.init();
        this.setupEventListeners();
        this.updateColorUI();
        this.render();
        this.startAnimation();
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
            
            uniform float u_time;
            uniform float u_distortion;
            uniform float u_scale;
            
            // FBM & Noise from IQ
            float random (in vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }

            float noise (in vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);

                // Four corners in 2D of a tile
                float a = random(i);
                float b = random(i + vec2(1.0, 0.0));
                float c = random(i + vec2(0.0, 1.0));
                float d = random(i + vec2(1.0, 1.0));

                vec2 u = f * f * (3.0 - 2.0 * f);

                return mix(a, b, u.x) +
                        (c - a)* u.y * (1.0 - u.x) +
                        (d - b) * u.x * u.y;
            }

            #define OCTAVES 6
            float fbm (in vec2 st) {
                // Initial values
                float value = 0.0;
                float amplitude = .5;
                float frequency = 0.;
                //
                // Loop of octaves
                for (int i = 0; i < OCTAVES; i++) {
                    value += amplitude * noise(st);
                    st *= 2.;
                    amplitude *= .5;
                }
                return value;
            }
            
            void main() {
                vec2 uv = v_texCoord;
                float aspect = u_resolution.x / u_resolution.y;
                uv.x *= aspect;
                
                // Domain warping
                vec2 st = uv * (u_scale / 10.0);
                
                vec2 q = vec2(0.);
                q.x = fbm( st + 0.00*u_time);
                q.y = fbm( st + vec2(1.0));

                vec2 r = vec2(0.);
                r.x = fbm( st + 1.0*q + vec2(1.7,9.2)+ 0.15*u_time );
                r.y = fbm( st + 1.0*q + vec2(8.3,2.8)+ 0.126*u_time);

                float f = fbm(st + r * (u_distortion / 20.0));

                // Color mapping
                // Mix colors based on f and q
                
                vec3 color = mix(u_colors[0], u_colors[1], clamp((f*f)*4.0,0.0,1.0));
                
                if (u_colorCount > 2) {
                    color = mix(color, u_colors[2], clamp(length(q),0.0,1.0));
                }
                if (u_colorCount > 3) {
                    color = mix(color, u_colors[3], clamp(length(r.x),0.0,1.0));
                }

                // Smooth out
                color = sqrt(color);
                
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
            time: gl.getUniformLocation(this.program, 'u_time'),
            distortion: gl.getUniformLocation(this.program, 'u_distortion'),
            scale: gl.getUniformLocation(this.program, 'u_scale'),
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
        });
        document.getElementById('height').addEventListener('input', (e) => {
            this.params.height = parseInt(e.target.value);
            this.updateCanvasSize();
        });

        document.getElementById('addColorBtn').addEventListener('click', () => {
            if (this.params.colors.length < 10) {
                this.params.colors.push({ r: Math.random(), g: Math.random(), b: Math.random() });
                this.updateColorUI();
                this.render();
            }
        });

        ['distortion', 'scale', 'speed'].forEach(id => {
            const slider = document.getElementById(id);
            const display = document.getElementById(id + 'Value');
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.params[id] = val;
                display.textContent = Math.floor(val);
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

    startAnimation() {
        const animate = () => {
            if (this.params.speed > 0) {
                this.time += 0.01 * (this.params.speed / 20.0);
            }
            this.render();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    randomize() {
        const count = 3 + Math.floor(Math.random() * 3);
        this.params.colors = [];
        for (let i = 0; i < count; i++) {
            this.params.colors.push({ r: Math.random(), g: Math.random(), b: Math.random() });
        }
        this.updateColorUI();

        this.params.distortion = Math.floor(Math.random() * 100);
        this.params.scale = 10 + Math.floor(Math.random() * 50);
        this.params.speed = Math.floor(Math.random() * 50);

        ['distortion', 'scale', 'speed'].forEach(id => {
            document.getElementById(id).value = this.params[id];
            document.getElementById(id + 'Value').textContent = this.params[id];
        });
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
        a.download = `liquid_${Date.now()}.${fileExt}`;
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
        gl.uniform1f(this.uniforms.time, this.time);
        gl.uniform1f(this.uniforms.distortion, this.params.distortion);
        gl.uniform1f(this.uniforms.scale, this.params.scale);

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
    new LiquidGenerator();
});
