/**
 * Watercolor Generator - WebGL Controller
 * Domain Warping FBM for organic, wet-on-wet watercolor effects
 */

class WatercolorGenerator {
    constructor() {
        this.canvas = document.getElementById('watercolorCanvas');
        this.gl = this.canvas.getContext('webgl', {
            preserveDrawingBuffer: true,
            premultipliedAlpha: false
        });

        if (!this.gl) {
            alert('WebGL not supported');
            return;
        }

        this.params = {
            width: 1600,
            height: 1200,
            colorBg: { r: 1.0, g: 1.0, b: 1.0 },   // White Paper
            moisture: 50,  // Softness / Blur
            bleed: 50,     // Distortion amount
            contrast: 50,  // Opacity / Intensity
            roughness: 30  // Paper texture
        };

        // Dynamic Colors State
        this.colors = [
            '#FFB7B2', // Pastel Red
            '#B5EAD7', // Pastel Green
            '#C7CEEA'  // Pastel Blue
        ];
        this.maxColors = 10;

        this.seed = Math.random() * 100;

        this.init();
        this.setupEventListeners();
        this.setupColorUI();
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

        // Watercolor Fragment Shader
        const fragmentShaderSource = `
            precision highp float;
            
            varying vec2 v_texCoord;
            
            uniform vec2 u_resolution;
            // Dynamic Colors
            uniform vec3 u_colors[10];
            uniform int u_count;
            uniform vec3 u_bg;
            
            uniform float u_moisture;  // Softness (0-100)
            uniform float u_bleed;     // Distortion (0-100)
            uniform float u_contrast;  // Pigment load (0-100)
            uniform float u_roughness; // Texture (0-100)
            uniform float u_seed;      // Random seed
            
            // Random Hash
            float hash(vec2 p) {
                p = fract(p * vec2(443.897, 441.423));
                p += dot(p, p.yx + 19.19);
                return fract(p.x * p.y);
            }
            
            // 2D Noise
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
                return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), 
                           mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
            }
            
            // FBM
            float fbm(vec2 p, int octaves) {
                float value = 0.0;
                float amplitude = 0.5;
                for (int i = 0; i < 8; i++) {
                    if (i >= octaves) break;
                    value += amplitude * noise(p);
                    p *= 2.0;
                    amplitude *= 0.5;
                }
                return value;
            }
            
            // Domain Warping
            float domainWarp(vec2 p, float bleedStrength, float seedOffset) {
                vec2 p2 = p + vec2(seedOffset * 5.2, seedOffset * 1.3);
                vec2 q = vec2(
                    fbm(p2 + vec2(0.0, 0.0), 4),
                    fbm(p2 + vec2(5.2, 1.3), 4)
                );
                vec2 r = vec2(
                    fbm(p2 + 4.0 * q + vec2(1.7, 9.2), 4),
                    fbm(p2 + 4.0 * q + vec2(8.3, 2.8), 4)
                );
                return fbm(p + bleedStrength * r, 4);
            }

            void main() {
                vec2 uv = v_texCoord;
                vec2 coord = uv * (u_resolution.x / u_resolution.y); 
                
                float moisture = u_moisture / 100.0;
                float bleed = u_bleed / 100.0;
                float contrast = u_contrast / 100.0;
                
                float scale = 3.0; // Zoom
                
                vec3 finalColor = u_bg;
                float opacity = 0.5 + 0.5 * contrast;
                
                // Iterate through colors
                for (int i = 0; i < 10; i++) {
                    if (i >= u_count) break;
                    
                    float fi = float(i);
                    // Generate unique pattern for each color layer
                    // Offset coord slightly per layer
                    vec2 layerCoord = coord * scale + vec2(fi * 2.3, fi * -1.7);
                    
                    float n = domainWarp(layerCoord, 3.0 + bleed * 2.0, u_seed + fi);
                    
                    // Soft edge mask based on moisture
                    float mask = smoothstep(0.3, 0.3 + 0.4 * moisture, n);
                    
                    // Simple Mix (Simulate painterly overlap)
                    // mix(current, target, mask * opacity)
                    // If we want multiply-ish effect:
                    // finalColor = mix(finalColor, u_colors[i] * finalColor, mask * opacity); // Darkens
                    
                    // Let's try a hybrid approach:
                    // Color is mixed in, but tends to darken
                    finalColor = mix(finalColor, u_colors[i] * finalColor, mask * opacity);
                }
                
                // Paper Grain
                float grain = noise(coord * 150.0);
                float roughness = mix(1.0, 0.8 + 0.4 * grain, u_roughness / 100.0);
                finalColor *= roughness;
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
        this.program = this.createProgram(vertexShader, fragmentShader);

        const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        this.uniforms = {
            resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            colors: gl.getUniformLocation(this.program, 'u_colors'),
            count: gl.getUniformLocation(this.program, 'u_count'),
            bg: gl.getUniformLocation(this.program, 'u_bg'),
            moisture: gl.getUniformLocation(this.program, 'u_moisture'),
            bleed: gl.getUniformLocation(this.program, 'u_bleed'),
            contrast: gl.getUniformLocation(this.program, 'u_contrast'),
            roughness: gl.getUniformLocation(this.program, 'u_roughness'),
            seed: gl.getUniformLocation(this.program, 'u_seed')
        };
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

    setupColorUI() {
        const container = document.getElementById('colorContainer');
        const addBtn = document.getElementById('addColorBtn');

        container.innerHTML = '';
        this.colors.forEach((hex, index) => {
            this.createColorInput(hex, index);
        });

        addBtn.onclick = () => {
            if (this.colors.length >= this.maxColors) return;
            const hex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
            this.colors.push(hex);
            this.createColorInput(hex, this.colors.length - 1);
            this.render();
        };

        // Background
        document.getElementById('colorBg').addEventListener('input', (e) => {
            const hex = e.target.value;
            this.params.colorBg = this.hexToRgb(hex);
            this.render();
        });
    }

    createColorInput(hex, index) {
        const container = document.getElementById('colorContainer');
        const wrapper = document.createElement('div');
        wrapper.className = 'color-input-group';

        const labelRow = document.createElement('div');
        labelRow.style.display = 'flex';
        labelRow.style.justifyContent = 'space-between';

        const label = document.createElement('span');
        label.className = 'color-label';
        label.textContent = `Color ${index + 1}`;

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.style.border = 'none';
        removeBtn.style.background = 'none';
        removeBtn.style.color = '#94a3b8';
        removeBtn.style.cursor = 'pointer';
        removeBtn.onclick = () => {
            if (this.colors.length <= 1) return;
            this.colors.splice(index, 1);
            this.setupColorUI();
            this.render();
        };

        labelRow.appendChild(label);
        labelRow.appendChild(removeBtn);

        const input = document.createElement('input');
        input.type = 'color';
        input.value = hex;
        input.addEventListener('input', (e) => {
            this.colors[index] = e.target.value;
            this.render();
        });

        wrapper.appendChild(labelRow);
        wrapper.appendChild(input);
        container.appendChild(wrapper);
    }

    hexToRgb(hex) {
        return {
            r: parseInt(hex.slice(1, 3), 16) / 255,
            g: parseInt(hex.slice(3, 5), 16) / 255,
            b: parseInt(hex.slice(5, 7), 16) / 255
        };
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

        ['moisture', 'bleed', 'contrast', 'roughness'].forEach(id => {
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

    updateCanvasSize() {
        this.canvas.width = this.params.width;
        this.canvas.height = this.params.height;
        this.gl.viewport(0, 0, this.params.width, this.params.height);
        document.getElementById('canvasInfo').textContent = `${this.params.width} × ${this.params.height} px`;
    }

    randomize() {
        const randHex = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

        const count = 2 + Math.floor(Math.random() * 4); // 2-5 colors
        this.colors = [];
        for (let i = 0; i < count; i++) this.colors.push(randHex());

        this.params.moisture = Math.random() * 100;
        this.params.bleed = Math.random() * 100;
        this.params.contrast = Math.random() * 100;
        this.seed = Math.random() * 100;

        this.setupColorUI();

        ['moisture', 'bleed', 'contrast'].forEach(id => {
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
        const quality = format === 'jpeg' ? 0.9 : undefined;

        // Use temp white canvas for JPEG transparency fix
        if (format === 'jpeg') {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            const ctx = tempCanvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            ctx.drawImage(this.canvas, 0, 0);
            tempCanvas.toBlob(blob => this.saveBlob(blob, fileExt), mimeType, quality);
        } else {
            this.canvas.toBlob(blob => this.saveBlob(blob, fileExt), mimeType, quality);
        }
    }

    saveBlob(blob, fileExt) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `watercolor_${Date.now()}.${fileExt}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    render() {
        const gl = this.gl;
        gl.useProgram(this.program);

        gl.uniform2f(this.uniforms.resolution, this.params.width, this.params.height);

        gl.uniform1i(this.uniforms.count, this.colors.length);
        const colorArray = new Float32Array(this.maxColors * 3);
        this.colors.forEach((hex, i) => {
            const rgb = this.hexToRgb(hex);
            colorArray[i * 3] = rgb.r;
            colorArray[i * 3 + 1] = rgb.g;
            colorArray[i * 3 + 2] = rgb.b;
        });
        gl.uniform3fv(this.uniforms.colors, colorArray);

        gl.uniform3f(this.uniforms.bg, this.params.colorBg.r, this.params.colorBg.g, this.params.colorBg.b);

        gl.uniform1f(this.uniforms.moisture, this.params.moisture);
        gl.uniform1f(this.uniforms.bleed, this.params.bleed);
        gl.uniform1f(this.uniforms.contrast, this.params.contrast);
        gl.uniform1f(this.uniforms.roughness, this.params.roughness);
        gl.uniform1f(this.uniforms.seed, this.seed);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WatercolorGenerator();
});
