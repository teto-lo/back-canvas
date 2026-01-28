/**
 * Topography Generator - WebGL Controller
 * Organic Contour Lines and Waves
 */

class TopographyGenerator {
    constructor() {
        this.canvas = document.getElementById('topographyCanvas');
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
            colors: [
                { r: 0.2, g: 0.25, b: 0.33 },
                { r: 0.05, g: 0.58, b: 0.53 }
            ],
            colorBg: { r: 0.94, g: 0.99, b: 0.98 },
            bgTransparent: false,
            scale: 50,      // Zoom / Noise Scale
            elevation: 50,  // Lines density
            distortion: 20, // Warp amount
            lineWidth: 20   // Line thickness
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
            
            // Colors
            uniform vec3 u_colors[10];
            uniform int u_colorCount;
            uniform vec3 u_bg;
            uniform float u_bgTransparent;
            
            uniform float u_scale;
            uniform float u_elevation; // Density of lines
            uniform float u_distortion;
            uniform float u_lineWidth;
            
            // --- NOISE FUNCTIONS ---
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy) );
                vec2 x0 = v -   i + dot(i, C.xx);
                vec2 i1;
                i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod289(i);
                vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m ;
                m = m*m ;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                vec3 g;
                g.x  = a0.x  * x0.x  + h.x  * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            // FBM
            float fbm(vec2 st) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 0.0;
                for(int i=0; i<4; i++) {
                    value += amplitude * snoise(st);
                    st *= 2.0;
                    amplitude *= 0.5;
                }
                return value * 0.5 + 0.5;
            }
            
            // Domain Warping
            float pattern(vec2 p, out vec2 q, out vec2 r) {
                q.x = fbm(p + vec2(0.0, 0.0));
                q.y = fbm(p + vec2(5.2, 1.3));
                
                float dist = u_distortion / 50.0; // 0.0 - 2.0
                
                r.x = fbm(p + 4.0*q + vec2(1.7, 9.2));
                r.y = fbm(p + 4.0*q + vec2(8.3, 2.8));
                
                return fbm(p + dist*r);
            }
            
            // Color Mapping
            vec3 getColor(float t) {
                // Map t (0.0 - 1.0) to color array
                if (u_colorCount <= 1) return u_colors[0];
                
                float scaledT = t * float(u_colorCount - 1);
                int idx = int(floor(scaledT));
                float f = fract(scaledT);
                
                vec3 c1 = vec3(0.0);
                vec3 c2 = vec3(0.0);
                
                // Manual array access
                for(int i=0; i<10; i++) {
                    if (i == idx) c1 = u_colors[i];
                    if (i == idx + 1) c2 = u_colors[i];
                }
                
                // Handle last index
                if (idx >= u_colorCount - 1) {
                    // Loop or Clamp? Clamp.
                    for(int i=0; i<10; i++) {
                        if (i == u_colorCount - 1) { c1 = u_colors[i]; c2 = u_colors[i]; }
                    }
                }
                
                return mix(c1, c2, f);
            }

            void main() {
                vec2 uv = v_texCoord;
                float aspect = u_resolution.x / u_resolution.y;
                vec2 coord = uv;
                coord.x *= aspect;
                
                float scale = 1.0 + u_scale / 20.0; // 1.0 to 6.0
                vec2 st = coord * scale;
                
                vec2 q, r;
                float h = pattern(st, q, r);
                
                // Contour Lines
                // h is approx 0.0 to 1.0
                float density = 10.0 + u_elevation; // 10 to 110 lines
                float val = h * density;
                
                float fraction = fract(val);
                // Line thickness
                float w = u_lineWidth / 200.0; // 0.0 to 0.5
                
                // Smoothstep for anti-aliased lines
                // We want peak at integer values? NO, lines happen at intervals.
                // fract(val) goes 0->1. We want a line when it is near 0 or 0.5?
                // Let's say line is at fract < w
                
                // Better line: smoothstep around threshold
                // Triangle wave for smooth lines?
                // 1.0 - abs(2.0*fraction - 1.0) is a triangle 0..1..0
                // Use smoothstep to sharpen
                float line = smoothstep(0.0, w, fraction) - smoothstep(w, w*2.0, fraction);
                
                // Better: 
                // float df = fwidth(val); // OES_standard_derivatives extension needed? GLSL 100 doesn't have it standard without ext.
                // Fallback: simple proximity
                
                // Let's just use simple threshold for now.
                // Center line around 0.5?
                float distMetric = abs(fraction - 0.5);
                float thickness = w;
                float alpha = 1.0 - smoothstep(thickness, thickness + 0.05, distMetric);
                
                // Colored Lines or Filled Map?
                // Usually Topography is lines on background.
                // Color of line depends on Height (val or h)
                
                vec3 lineColor = getColor(h);
                
                vec4 finalColor;
                
                if (alpha > 0.01) {
                    finalColor = vec4(lineColor, alpha); // Alpha blending
                } else {
                    finalColor = vec4(0.0);
                }
                
                // Composite
                vec3 bg = u_bg;
                if (u_bgTransparent > 0.5) {
                    // If transparent, we only output lines
                    gl_FragColor = finalColor;
                } else {
                    // Mix
                    gl_FragColor = vec4(mix(bg, lineColor, alpha), 1.0);
                }
            }
        `;

        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) {
            console.error('Failed to create shaders');
            alert('Shader compilation failed. Check console for details.');
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
            // params
            scale: gl.getUniformLocation(this.program, 'u_scale'),
            elevation: gl.getUniformLocation(this.program, 'u_elevation'),
            distortion: gl.getUniformLocation(this.program, 'u_distortion'),
            lineWidth: gl.getUniformLocation(this.program, 'u_lineWidth'),

            bg: gl.getUniformLocation(this.program, 'u_bg'),
            bgTransparent: gl.getUniformLocation(this.program, 'u_bgTransparent'),

            colorCount: gl.getUniformLocation(this.program, 'u_colorCount')
        };

        // Colors
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

        // Sliders
        ['scale', 'elevation', 'distortion', 'lineWidth'].forEach(id => {
            const slider = document.getElementById(id);
            const display = document.getElementById(id + 'Value');
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.params[id] = val;
                display.textContent = val;
                this.render();
            });
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
        // Random Colors
        const count = 2 + Math.floor(Math.random() * 3);
        this.params.colors = [];
        for (let i = 0; i < count; i++) {
            this.params.colors.push({ r: Math.random(), g: Math.random(), b: Math.random() });
        }
        this.updateColorUI();

        // Random Params
        this.params.scale = 20 + Math.random() * 80;
        this.params.elevation = 20 + Math.random() * 80;
        this.params.distortion = Math.random() * 80;
        this.params.lineWidth = 10 + Math.random() * 50;

        ['scale', 'elevation', 'distortion', 'lineWidth'].forEach(id => {
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
        a.download = `topography_${Date.now()}.${fileExt}`;
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

        gl.uniform1f(this.uniforms.scale, this.params.scale);
        gl.uniform1f(this.uniforms.elevation, this.params.elevation);
        gl.uniform1f(this.uniforms.distortion, this.params.distortion);
        gl.uniform1f(this.uniforms.lineWidth, this.params.lineWidth);

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
    new TopographyGenerator();
});
