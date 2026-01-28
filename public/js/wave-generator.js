/**
 * Wave Generator - WebGL Controller
 * Mathematical Wave Patterns
 */

class WaveGenerator {
    constructor() {
        this.canvas = document.getElementById('waveCanvas');
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
            waveType: 0, // 0=Linear, 1=Radial, 2=Interference, 3=Spiral
            colors: [
                { r: 0.31, g: 0.67, b: 0.99 },  // Blue
                { r: 0.0, g: 0.95, b: 0.99 }    // Cyan
            ],
            colorBg: { r: 1.0, g: 1.0, b: 1.0 },
            bgTransparent: false,
            frequency: 10,
            amplitude: 50,
            waveCount: 1,
            rotation: 0,
            phase: 0,
            distortion: 0
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
            uniform int u_waveType;
            
            uniform vec3 u_colors[10];
            uniform int u_colorCount;
            uniform vec3 u_bg;
            uniform float u_bgTransparent;
            
            uniform float u_frequency;
            uniform float u_amplitude;
            uniform int u_waveCount;
            uniform float u_rotation;
            uniform float u_phase;
            uniform float u_distortion;
            
            #define PI 3.14159265359
            
            // Rotation matrix
            vec2 rotate(vec2 p, float angle) {
                float c = cos(angle);
                float s = sin(angle);
                return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
            }
            
            // Hash for distortion
            float hash(vec2 p) {
                p = fract(p * vec2(123.34, 456.21));
                p += dot(p, p + 45.32);
                return fract(p.x * p.y);
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
                float aspect = u_resolution.x / u_resolution.y;
                vec2 coord = (uv - 0.5) * 2.0;
                coord.x *= aspect;
                
                // Apply rotation
                float rotRad = u_rotation * PI / 180.0;
                coord = rotate(coord, rotRad);
                
                float wave = 0.0;
                float phaseRad = u_phase * PI / 180.0;
                
                if (u_waveType == 0) {
                    // Linear waves
                    for(int i = 0; i < 5; i++) {
                        if (i >= u_waveCount) break;
                        float offset = float(i) * 0.3;
                        wave += sin((coord.y + offset) * u_frequency + phaseRad);
                    }
                    wave /= float(u_waveCount);
                    
                } else if (u_waveType == 1) {
                    // Radial waves
                    float dist = length(coord);
                    for(int i = 0; i < 5; i++) {
                        if (i >= u_waveCount) break;
                        float offset = float(i) * 0.5;
                        wave += sin((dist + offset) * u_frequency + phaseRad);
                    }
                    wave /= float(u_waveCount);
                    
                } else if (u_waveType == 2) {
                    // Interference (multiple wave sources)
                    for(int i = 0; i < 5; i++) {
                        if (i >= u_waveCount) break;
                        
                        // Position wave sources in a circle
                        float angle = float(i) * 2.0 * PI / float(u_waveCount);
                        vec2 source = vec2(cos(angle), sin(angle)) * 0.5;
                        
                        float dist = length(coord - source);
                        wave += sin(dist * u_frequency + phaseRad);
                    }
                    wave /= float(u_waveCount);
                    
                } else if (u_waveType == 3) {
                    // Spiral waves
                    float dist = length(coord);
                    float angle = atan(coord.y, coord.x);
                    
                    for(int i = 0; i < 5; i++) {
                        if (i >= u_waveCount) break;
                        float offset = float(i) * 0.5;
                        wave += sin((dist * u_frequency + angle * 3.0 + offset) + phaseRad);
                    }
                    wave /= float(u_waveCount);
                }
                
                // Apply distortion
                if (u_distortion > 0.0) {
                    float noise = hash(coord * 10.0) * 2.0 - 1.0;
                    wave += noise * (u_distortion / 100.0);
                }
                
                // Apply amplitude
                wave = wave * (u_amplitude / 100.0);
                
                // Normalize to 0-1
                float t = wave * 0.5 + 0.5;
                
                vec3 color = getColor(t);
                
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
            waveType: gl.getUniformLocation(this.program, 'u_waveType'),
            frequency: gl.getUniformLocation(this.program, 'u_frequency'),
            amplitude: gl.getUniformLocation(this.program, 'u_amplitude'),
            waveCount: gl.getUniformLocation(this.program, 'u_waveCount'),
            rotation: gl.getUniformLocation(this.program, 'u_rotation'),
            phase: gl.getUniformLocation(this.program, 'u_phase'),
            distortion: gl.getUniformLocation(this.program, 'u_distortion'),
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

        // Wave Type
        document.getElementById('waveType').addEventListener('change', (e) => {
            this.params.waveType = parseInt(e.target.value);
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
        ['frequency', 'amplitude', 'waveCount', 'rotation', 'phase', 'distortion'].forEach(id => {
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
        // Random wave type
        this.params.waveType = Math.floor(Math.random() * 4);
        document.getElementById('waveType').value = this.params.waveType;

        // Random colors
        const count = 2 + Math.floor(Math.random() * 4);
        this.params.colors = [];
        for (let i = 0; i < count; i++) {
            this.params.colors.push({ r: Math.random(), g: Math.random(), b: Math.random() });
        }
        this.updateColorUI();

        // Random parameters
        this.params.frequency = 5 + Math.floor(Math.random() * 50);
        this.params.amplitude = 30 + Math.floor(Math.random() * 70);
        this.params.waveCount = 1 + Math.floor(Math.random() * 4);
        this.params.rotation = Math.floor(Math.random() * 360);
        this.params.phase = Math.floor(Math.random() * 360);
        this.params.distortion = Math.floor(Math.random() * 50);

        document.getElementById('frequency').value = this.params.frequency;
        document.getElementById('frequencyValue').textContent = Math.floor(this.params.frequency);

        document.getElementById('amplitude').value = this.params.amplitude;
        document.getElementById('amplitudeValue').textContent = Math.floor(this.params.amplitude);

        document.getElementById('waveCount').value = this.params.waveCount;
        document.getElementById('waveCountValue').textContent = Math.floor(this.params.waveCount);

        document.getElementById('rotation').value = this.params.rotation;
        document.getElementById('rotationValue').textContent = Math.floor(this.params.rotation);

        document.getElementById('phase').value = this.params.phase;
        document.getElementById('phaseValue').textContent = Math.floor(this.params.phase);

        document.getElementById('distortion').value = this.params.distortion;
        document.getElementById('distortionValue').textContent = Math.floor(this.params.distortion);

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
        a.download = `wave_${Date.now()}.${fileExt}`;
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
        gl.uniform1i(this.uniforms.waveType, this.params.waveType);
        gl.uniform1f(this.uniforms.frequency, this.params.frequency);
        gl.uniform1f(this.uniforms.amplitude, this.params.amplitude);
        gl.uniform1i(this.uniforms.waveCount, this.params.waveCount);
        gl.uniform1f(this.uniforms.rotation, this.params.rotation);
        gl.uniform1f(this.uniforms.phase, this.params.phase);
        gl.uniform1f(this.uniforms.distortion, this.params.distortion);

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
    new WaveGenerator();
});
