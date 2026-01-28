/**
 * Wagara Generator - WebGL Controller
 * Traditional Japanese Patterns
 */

class WagaraGenerator {
    constructor() {
        this.canvas = document.getElementById('wagaraCanvas');
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
            patternType: 0,
            color1: { r: 0.16, g: 0.25, b: 0.45 }, // Indigo
            colorBg: { r: 0.95, g: 0.95, b: 0.95 }, // Off-white
            scale: 50,
            lineWidth: 10
        };

        this.init();
        this.setupEventListeners();
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
            uniform vec3 u_color1;
            uniform vec3 u_bg;
            uniform float u_scale;
            uniform float u_lineWidth;
            
            #define PI 3.14159265359
            
            // SEIGAIHA (Waves)
            float patternSeigaiha(vec2 uv, float s, float w) {
                // Adjust UV for pattern repeating
                uv *= s / 200.0 * 10.0;
                
                vec2 grid = floor(uv);
                vec2 f = fract(uv);
                
                // Offset every other row
                if (mod(grid.y, 2.0) == 1.0) {
                    f.x = fract(uv.x + 0.5);
                }
                
                // Circles
                float d = length(f - vec2(0.5, 0.0));
                
                // Concentric rings
                // Map d (0..1) to rings
                float rings = fract(d * 4.0); // 4 rings per unit
                // Thickness
                float thick = w / 100.0;
                float line = smoothstep(thick, thick + 0.05, abs(rings - 0.5));
                
                // Override: Simple concentric arcs
                // Actually Seigaiha is overlapping circles.
                // Simplified approach:
                float r = length(f - vec2(0.5, 0.0));
                
                // Multiple rings
                // We want values where mod(r, spacing) is close to 0
                // spacing = 1.0/4.0 = 0.25
                
                float repeat = 4.0;
                float v = abs(fract(r * repeat) - 0.5);
                // Line width dependent on w
                float th = 0.1 + (w / 100.0) * 0.3;
                
                float mask = smoothstep(0.4 - th, 0.4, v) - smoothstep(0.6, 0.6 + th, v);
                
                // Only top half of circles effectively visible due to overlap? 
                // In standard shader seigaiha, it is tricky.
                // Let's stick to a simpler concentric circle pattern for now.
                
                return mask;
            }
            
             // SHIPPO (Seven Treasures - Overlapping circles)
            float patternShippo(vec2 uv, float s, float w) {
                uv *= s / 200.0 * 5.0;
                vec2 f = fract(uv);
                
                // Distance to 4 corners
                float d1 = length(f);
                float d2 = length(f - vec2(1.0, 0.0));
                float d3 = length(f - vec2(0.0, 1.0));
                float d4 = length(f - vec2(1.0, 1.0));
                
                float th = w / 200.0;
                
                float c1 = smoothstep(0.5 - th, 0.5, d1) - smoothstep(0.5, 0.5 + th, d1);
                float c2 = smoothstep(0.5 - th, 0.5, d2) - smoothstep(0.5, 0.5 + th, d2);
                float c3 = smoothstep(0.5 - th, 0.5, d3) - smoothstep(0.5, 0.5 + th, d3);
                float c4 = smoothstep(0.5 - th, 0.5, d4) - smoothstep(0.5, 0.5 + th, d4);
                
                return clamp(c1 + c2 + c3 + c4, 0.0, 1.0);
            }
            
            // ICHIMATSU (Checkered)
            float patternIchimatsu(vec2 uv, float s) {
                uv *= s / 200.0 * 10.0;
                vec2 grid = floor(uv);
                float check = mod(grid.x + grid.y, 2.0);
                return check;
            }
            
            // YAGASURI (Arrow Feathers)
            float patternYagasuri(vec2 uv, float s, float w) {
                 uv *= s / 200.0 * 5.0;
                 
                 // Vertical stripes of patterns
                 float col = floor(uv.x);
                 float row = uv.y;
                 
                 // Flip y every other column
                 if (mod(col, 2.0) == 1.0) {
                     row = -row;
                 }
                 
                 // Diagonal lines logic
                 float f = fract(row + (fract(uv.x) - 0.5)); // Skew
                 // Pattern stripe
                 float v = step(0.5, f);
                 
                 return v;
            }

            void main() {
                vec2 uv = v_texCoord;
                float aspect = u_resolution.x / u_resolution.y;
                uv.x *= aspect;
                
                float mask = 0.0;
                
                if (u_patternType == 0) {
                     mask = patternSeigaiha(uv, u_scale, u_lineWidth);
                } else if (u_patternType == 1) {
                     mask = patternShippo(uv, u_scale, u_lineWidth);
                } else if (u_patternType == 2) {
                     mask = patternIchimatsu(uv, u_scale);
                } else if (u_patternType == 3) {
                     mask = patternYagasuri(uv, u_scale, u_lineWidth);
                }
                
                vec3 color = mix(u_bg, u_color1, mask);
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
            patternType: gl.getUniformLocation(this.program, 'u_patternType'),
            color1: gl.getUniformLocation(this.program, 'u_color1'),
            bg: gl.getUniformLocation(this.program, 'u_bg'),
            scale: gl.getUniformLocation(this.program, 'u_scale'),
            lineWidth: gl.getUniformLocation(this.program, 'u_lineWidth')
        };

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

        document.getElementById('patternType').addEventListener('change', (e) => {
            this.params.patternType = parseInt(e.target.value);
            this.render();
        });

        document.getElementById('color1').addEventListener('input', (e) => {
            this.params.color1 = this.hexToRgb(e.target.value);
            this.render();
        });
        document.getElementById('colorBg').addEventListener('input', (e) => {
            this.params.colorBg = this.hexToRgb(e.target.value);
            this.render();
        });

        document.getElementById('swapColorsBtn').addEventListener('click', () => {
            const temp = this.params.color1;
            this.params.color1 = this.params.colorBg;
            this.params.colorBg = temp;

            document.getElementById('color1').value = this.rgbToHex(this.params.color1);
            document.getElementById('colorBg').value = this.rgbToHex(this.params.colorBg);
            this.render();
        });

        ['scale', 'lineWidth'].forEach(id => {
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
        this.params.patternType = Math.floor(Math.random() * 4);
        document.getElementById('patternType').value = this.params.patternType;

        this.params.color1 = { r: Math.random(), g: Math.random(), b: Math.random() };
        this.params.colorBg = { r: Math.random(), g: Math.random(), b: Math.random() };
        document.getElementById('color1').value = this.rgbToHex(this.params.color1);
        document.getElementById('colorBg').value = this.rgbToHex(this.params.colorBg);

        this.params.scale = 20 + Math.floor(Math.random() * 100);
        this.params.lineWidth = 1 + Math.floor(Math.random() * 40);

        ['scale', 'lineWidth'].forEach(id => {
            document.getElementById(id).value = this.params[id];
            document.getElementById(id + 'Value').textContent = Math.floor(this.params[id]);
        });

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
        a.download = `wagara_${Date.now()}.${fileExt}`;
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
        gl.uniform1i(this.uniforms.patternType, this.params.patternType);

        gl.uniform3f(this.uniforms.color1, this.params.color1.r, this.params.color1.g, this.params.color1.b);
        gl.uniform3f(this.uniforms.bg, this.params.colorBg.r, this.params.colorBg.g, this.params.colorBg.b);

        gl.uniform1f(this.uniforms.scale, this.params.scale);
        gl.uniform1f(this.uniforms.lineWidth, this.params.lineWidth);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WagaraGenerator();
});
