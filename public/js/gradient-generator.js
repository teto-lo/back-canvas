/**
 * Gradient Generator - WebGL Controller
 * Linear, Radial, Conic, and Diamond Gradients
 */

class GradientGenerator {
    constructor() {
        this.canvas = document.getElementById('gradientCanvas');
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
            gradientType: 'linear',
            colors: [
                { r: 0.4, g: 0.49, b: 0.92 },  // #667eea
                { r: 0.46, g: 0.29, b: 0.64 }  // #764ba2
            ],
            colorBg: { r: 0.94, g: 0.96, b: 0.97 },
            bgTransparent: false,
            angle: 45,
            centerX: 50,
            centerY: 50,
            smoothness: 50
        };

        this.init();
        this.setupEventListeners();
        this.updateColorUI();
        this.updateParamVisibility();
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
            uniform int u_gradientType; // 0=linear, 1=radial, 2=conic, 3=diamond
            
            uniform vec3 u_colors[10];
            uniform int u_colorCount;
            uniform vec3 u_bg;
            uniform float u_bgTransparent;
            
            uniform float u_angle;      // degrees
            uniform vec2 u_center;      // 0.0 - 1.0
            uniform float u_smoothness; // 0.0 - 1.0
            
            #define PI 3.14159265359
            
            vec3 getColor(float t) {
                t = clamp(t, 0.0, 1.0);
                
                // Apply smoothness (ease in/out)
                float smooth = u_smoothness;
                if (smooth > 0.5) {
                    // Ease in-out
                    float factor = (smooth - 0.5) * 2.0;
                    t = mix(t, smoothstep(0.0, 1.0, t), factor);
                } else {
                    // Linear to sharp
                    float factor = smooth * 2.0;
                    t = mix(pow(t, 0.5), t, factor);
                }
                
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
                
                float t = 0.0;
                
                if (u_gradientType == 0) {
                    // Linear Gradient
                    float angleRad = u_angle * PI / 180.0;
                    vec2 dir = vec2(cos(angleRad), sin(angleRad));
                    
                    vec2 centered = uv - 0.5;
                    centered.x *= aspect;
                    
                    t = dot(centered, dir) + 0.5;
                    
                } else if (u_gradientType == 1) {
                    // Radial Gradient
                    vec2 centered = uv - u_center;
                    centered.x *= aspect;
                    
                    float dist = length(centered);
                    t = dist * 1.414; // Normalize to 0-1 (diagonal = sqrt(2))
                    
                } else if (u_gradientType == 2) {
                    // Conic Gradient
                    vec2 centered = uv - u_center;
                    centered.x *= aspect;
                    
                    float angle = atan(centered.y, centered.x);
                    float angleOffset = u_angle * PI / 180.0;
                    angle += angleOffset;
                    
                    t = (angle + PI) / (2.0 * PI);
                    
                } else if (u_gradientType == 3) {
                    // Diamond Gradient (Manhattan distance)
                    vec2 centered = uv - u_center;
                    centered.x *= aspect;
                    
                    float dist = abs(centered.x) + abs(centered.y);
                    t = dist;
                }
                
                vec3 color = getColor(t);
                
                if (u_bgTransparent > 0.5) {
                    gl_FragColor = vec4(color, 1.0);
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
            alert('Program linking failed. Check console for details.');
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
            gradientType: gl.getUniformLocation(this.program, 'u_gradientType'),
            angle: gl.getUniformLocation(this.program, 'u_angle'),
            center: gl.getUniformLocation(this.program, 'u_center'),
            smoothness: gl.getUniformLocation(this.program, 'u_smoothness'),
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

        // Gradient Type
        document.getElementById('gradientType').addEventListener('change', (e) => {
            this.params.gradientType = e.target.value;
            this.updateParamVisibility();
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
        ['angle', 'centerX', 'centerY', 'smoothness'].forEach(id => {
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

    updateParamVisibility() {
        const type = this.params.gradientType;

        // Show/hide parameters based on gradient type
        const angleGroup = document.getElementById('angleGroup');
        const centerXGroup = document.getElementById('centerXGroup');
        const centerYGroup = document.getElementById('centerYGroup');

        if (type === 'linear') {
            angleGroup.style.display = 'block';
            centerXGroup.style.display = 'none';
            centerYGroup.style.display = 'none';
        } else if (type === 'radial') {
            angleGroup.style.display = 'none';
            centerXGroup.style.display = 'block';
            centerYGroup.style.display = 'block';
        } else if (type === 'conic') {
            angleGroup.style.display = 'block';
            centerXGroup.style.display = 'block';
            centerYGroup.style.display = 'block';
        } else if (type === 'diamond') {
            angleGroup.style.display = 'none';
            centerXGroup.style.display = 'block';
            centerYGroup.style.display = 'block';
        }
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
        // Random gradient type
        const types = ['linear', 'radial', 'conic', 'diamond'];
        this.params.gradientType = types[Math.floor(Math.random() * types.length)];
        document.getElementById('gradientType').value = this.params.gradientType;

        // Random colors
        const count = 2 + Math.floor(Math.random() * 4);
        this.params.colors = [];
        for (let i = 0; i < count; i++) {
            this.params.colors.push({ r: Math.random(), g: Math.random(), b: Math.random() });
        }
        this.updateColorUI();

        // Random parameters
        this.params.angle = Math.random() * 360;
        this.params.centerX = 20 + Math.random() * 60;
        this.params.centerY = 20 + Math.random() * 60;
        this.params.smoothness = Math.random() * 100;

        ['angle', 'centerX', 'centerY', 'smoothness'].forEach(id => {
            document.getElementById(id).value = this.params[id];
            document.getElementById(id + 'Value').textContent = Math.floor(this.params[id]);
        });

        this.updateParamVisibility();
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
        a.download = `gradient_${Date.now()}.${fileExt}`;
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

        // Gradient type
        const typeMap = { 'linear': 0, 'radial': 1, 'conic': 2, 'diamond': 3 };
        gl.uniform1i(this.uniforms.gradientType, typeMap[this.params.gradientType]);

        gl.uniform1f(this.uniforms.angle, this.params.angle);
        gl.uniform2f(this.uniforms.center, this.params.centerX / 100.0, this.params.centerY / 100.0);
        gl.uniform1f(this.uniforms.smoothness, this.params.smoothness / 100.0);

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
    new GradientGenerator();
});
