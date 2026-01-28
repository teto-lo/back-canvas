/**
 * Tech Generator - WebGL Controller
 * Cyberpunk / Circuit Board Patterns
 */

class TechGenerator {
    constructor() {
        this.canvas = document.getElementById('techCanvas');
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
            color1: { r: 0.0, g: 1.0, b: 0.8 }, // Cyan
            colorBg: { r: 0.02, g: 0.02, b: 0.06 }, // Dark Blue/Black
            scale: 50,
            complexity: 50,
            speed: 20
        };

        this.time = 0;
        this.animationId = null;

        this.init();
        this.setupEventListeners();
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
            uniform vec3 u_color1;
            uniform vec3 u_bg;
            uniform float u_scale;
            uniform float u_complexity;
            uniform float u_time;
            
            // Hash function
            float hash21(vec2 p) {
                p = fract(p * vec2(123.34, 456.21));
                p += dot(p, p + 45.32);
                return fract(p.x * p.y);
            }
            
            float line(vec2 p, vec2 a, vec2 b) {
                vec2 pa = p - a;
                vec2 ba = b - a;
                float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
                return length(pa - ba * t);
            }
            
            void main() {
                vec2 uv = v_texCoord;
                float aspect = u_resolution.x / u_resolution.y;
                uv.x *= aspect;
                
                // Grid
                float scale = u_scale / 10.0; // 5..20
                vec2 gv = fract(uv * scale) - 0.5;
                vec2 id = floor(uv * scale);
                
                float mask = 0.0;
                
                // Randomly creating lines in grid cells
                float n = hash21(id); // random value for this cell
                
                // Complexity threshold
                float threshold = 1.0 - (u_complexity / 100.0 * 0.8 + 0.1);
                
                if (n > threshold) {
                    // Draw circuit lines
                    float width = 0.05;
                    
                    // Simple cross or angle
                    // Use n to decide orientation
                    if (n > 0.85) {
                         // Cross
                         float d1 = abs(gv.x);
                         float d2 = abs(gv.y);
                         mask += smoothstep(width, width-0.01, min(d1, d2));
                    } else if (n > 0.6) {
                         // L shape
                         vec2 p = gv - sign(vec2(n-0.7, n-0.75)) * 0.5; 
                         // Logic for corner, simplified:
                         // Just draw lines from center to edges
                         
                         // Determine direction based on n
                         vec2 dir = vec2(0.0);
                         if (n > 0.72) dir = vec2(0.5, 0.0); // right
                         else if (n > 0.68) dir = vec2(-0.5, 0.0); // left
                         else if (n > 0.64) dir = vec2(0.0, 0.5); // up
                         else dir = vec2(0.0, -0.5); // down
                         
                         // Line from center to dir
                         float d = line(gv, vec2(0.0), dir);
                         mask += smoothstep(width, width-0.01, d);
                         
                         // Dot at center
                         float dot = length(gv);
                         mask += smoothstep(width*2.0, width*2.0-0.01, dot);
                    } else {
                         // Horizontal or vertical line
                         if (fract(n*10.0) > 0.5) {
                             mask += smoothstep(width, width-0.01, abs(gv.x));
                         } else {
                             mask += smoothstep(width, width-0.01, abs(gv.y));
                         }
                    }
                }
                
                // Pulse effect
                float pulse = abs(sin(u_time * 2.0 + id.x + id.y));
                mask *= (0.5 + 0.5 * pulse);

                // Grid points
                float d = length(gv - vec2(0.5));
                // mask += smoothstep(0.1, 0.05, d) * 0.5;
                
                vec3 color = mix(u_bg, u_color1, mask);
                
                // Add faint grid
                // float gridLine = smoothstep(0.48, 0.5, abs(gv.x)) + smoothstep(0.48, 0.5, abs(gv.y));
                // color = mix(color, u_color1 * 0.2, gridLine * 0.3);
                
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
            color1: gl.getUniformLocation(this.program, 'u_color1'),
            bg: gl.getUniformLocation(this.program, 'u_bg'),
            scale: gl.getUniformLocation(this.program, 'u_scale'),
            complexity: gl.getUniformLocation(this.program, 'u_complexity'),
            time: gl.getUniformLocation(this.program, 'u_time')
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
        });
        document.getElementById('height').addEventListener('input', (e) => {
            this.params.height = parseInt(e.target.value);
            this.updateCanvasSize();
        });

        document.getElementById('color1').addEventListener('input', (e) => {
            this.params.color1 = this.hexToRgb(e.target.value);
        });
        document.getElementById('colorBg').addEventListener('input', (e) => {
            this.params.colorBg = this.hexToRgb(e.target.value);
        });

        ['scale', 'complexity', 'speed'].forEach(id => {
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

    updateCanvasSize() {
        this.canvas.width = this.params.width;
        this.canvas.height = this.params.height;
        this.gl.viewport(0, 0, this.params.width, this.params.height);
        document.getElementById('canvasInfo').textContent = `${this.params.width} × ${this.params.height} px`;
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
        this.params.color1 = { r: Math.random(), g: Math.random(), b: Math.random() };
        document.getElementById('color1').value = this.rgbToHex(this.params.color1);

        this.params.scale = 20 + Math.floor(Math.random() * 100);
        this.params.complexity = Math.floor(Math.random() * 100);
        this.params.speed = Math.floor(Math.random() * 100);

        ['scale', 'complexity', 'speed'].forEach(id => {
            document.getElementById(id).value = this.params[id];
            document.getElementById(id + 'Value').textContent = Math.floor(this.params[id]);
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
        a.download = `tech_${Date.now()}.${fileExt}`;
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
        gl.uniform3f(this.uniforms.color1, this.params.color1.r, this.params.color1.g, this.params.color1.b);
        gl.uniform3f(this.uniforms.bg, this.params.colorBg.r, this.params.colorBg.g, this.params.colorBg.b);

        gl.uniform1f(this.uniforms.scale, this.params.scale);
        gl.uniform1f(this.uniforms.complexity, this.params.complexity);
        gl.uniform1f(this.uniforms.time, this.time);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TechGenerator();
});
