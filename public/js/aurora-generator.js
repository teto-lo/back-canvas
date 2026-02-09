/**
 * Aurora Generator - WebGL Controller
 * Dynamic Moving Gradient Mesh
 */

class AuroraGenerator {
    constructor() {
        this.canvas = document.getElementById('auroraCanvas');
        this.gl = this.canvas.getContext('webgl', {
            preserveDrawingBuffer: true,
            premultipliedAlpha: false
        });

        if (!this.gl) {
            alert('WebGL not supported');
            return;
        }

        this.widthInput = document.getElementById('width');
        this.heightInput = document.getElementById('height');

        this.params = {
            width: this.widthInput ? parseInt(this.widthInput.value) : 1600,
            height: this.heightInput ? parseInt(this.heightInput.value) : 1200,
            bgColor: { r: 0.06, g: 0.09, b: 0.16 }, // Slate 900
            speed: 20,
            size: 60,
            flow: 30
        };

        // Dynamic Colors State
        this.colors = [
            '#4F46E5', // Indigo
            '#C026D3', // Fuchsia
            '#06B6D4', // Cyan
            '#F59E0B'  // Amber
        ];
        this.maxColors = 10;

        this.startTime = Date.now();
        this.animationId = null;

        this.init();
        this.setupEventListeners();
        this.setupColorUI();
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
            uniform float u_time;
            
            uniform vec3 u_bg;
            uniform vec3 u_colors[10]; // Max 10 colors
            uniform int u_count;
            
            uniform float u_speed; // 0-100
            uniform float u_size;  // 0-100
            uniform float u_flow;  // 0-100
            
            // Random Hash
            float hash(vec2 p) {
                p = fract(p * vec2(443.897, 441.423));
                p += dot(p, p.yx + 19.19);
                return fract(p.x * p.y);
            }
            
            // Noise
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                           mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
            }

            void main() {
                vec2 uv = v_texCoord;
                float aspect = u_resolution.x / u_resolution.y;
                vec2 p = uv;
                p.x *= aspect;
                
                float time = u_time * (u_speed / 50.0);
                float flow = u_flow / 50.0;
                float size = mix(0.2, 1.5, u_size / 100.0);
                
                vec3 finalColor = u_bg;
                float totalWeight = 0.0;
                
                // Additive Mixing of "Orbs"
                for (int i = 0; i < 10; i++) {
                    if (i >= u_count) break;
                    
                    float fi = float(i);
                    // Generate unique motion for each orb
                    // Using sin/cos with different frequencies based on index
                    
                    vec2 pos = vec2(0.5 * aspect, 0.5); // Start center
                    
                    // Complex orbital movement
                    pos.x += sin(time * 0.3 + fi * 2.0) * 0.4 * aspect;
                    pos.y += cos(time * 0.4 + fi * 1.5) * 0.4;
                    
                    // Add noise flow
                    pos.x += (noise(vec2(time * 0.1, fi)) - 0.5) * flow;
                    pos.y += (noise(vec2(fi, time * 0.1)) - 0.5) * flow;
                    
                    // Distance field
                    float d = length(p - pos);
                    
                    // Radial gradient (Soft orb)
                    // The 'size' parameter controls the falloff
                    float glow = exp(-d * (3.0 / size));
                    
                    // Accumulate color
                    // Blend mode: Screen / Additive-ish but weighted
                    finalColor += u_colors[i] * glow;
                    totalWeight += glow;
                }
                
                // Normalize slightly to prevent blowout, but keep additive glow feeling
                // finalColor = finalColor / (1.0 + totalWeight * 0.5);
                
                // Mix with background based on total weight
                // Where no orbs are, show Bg. Where orbs are, show orbs.
                finalColor = mix(u_bg, finalColor, smoothstep(0.0, 1.0, totalWeight));
                
                // Dither to prevent banding
                finalColor += (hash(uv * time) - 0.5) * 0.02;
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
        this.program = this.createProgram(vertexShader, fragmentShader);

        // Buffers
        const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Uniforms
        this.uniforms = {
            resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            time: gl.getUniformLocation(this.program, 'u_time'),
            bg: gl.getUniformLocation(this.program, 'u_bg'),
            colors: gl.getUniformLocation(this.program, 'u_colors'),
            count: gl.getUniformLocation(this.program, 'u_count'),
            speed: gl.getUniformLocation(this.program, 'u_speed'),
            size: gl.getUniformLocation(this.program, 'u_size'),
            flow: gl.getUniformLocation(this.program, 'u_flow')
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

        if (container) {
            // Render initial colors
            container.innerHTML = '';
            this.colors.forEach((hex, index) => {
                this.createColorInput(hex, index);
            });
        }

        // Add Button
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                if (this.colors.length >= this.maxColors) return;
                // Add random bright color
                const hex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
                this.colors.push(hex);
                this.createColorInput(hex, this.colors.length - 1);
            });
        }

        // Background Color
        const bgInput = document.getElementById('colorBg');
        if (bgInput) {
            bgInput.addEventListener('input', (e) => {
                const hex = e.target.value;
                const rgb = this.hexToRgb(hex);
                this.params.bgColor = rgb;
            });
        }
    }

    createColorInput(hex, index) {
        const container = document.getElementById('colorContainer');

        const wrapper = document.createElement('div');
        wrapper.className = 'color-input-group';
        wrapper.dataset.index = index;
        wrapper.style.position = 'relative';

        const labelRow = document.createElement('div');
        labelRow.style.display = 'flex';
        labelRow.style.justifyContent = 'space-between';

        const label = document.createElement('span');
        label.className = 'color-label';
        label.textContent = `Orb ${index + 1}`;

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.style.border = 'none';
        removeBtn.style.background = 'none';
        removeBtn.style.color = '#94a3b8';
        removeBtn.style.cursor = 'pointer';
        removeBtn.onclick = () => this.removeColor(index);

        // Don't modify colors directly, rebuild UI

        labelRow.appendChild(label);
        labelRow.appendChild(removeBtn);

        const input = document.createElement('input');
        input.type = 'color';
        input.value = hex;
        input.addEventListener('input', (e) => {
            this.colors[index] = e.target.value;
        });

        wrapper.appendChild(labelRow);
        wrapper.appendChild(input);
        container.appendChild(wrapper);
    }

    removeColor(index) {
        if (this.colors.length <= 1) return; // Keep at least 1
        this.colors.splice(index, 1);
        this.setupColorUI(); // Rebuild UI to update indices
    }

    hexToRgb(hex) {
        return {
            r: parseInt(hex.slice(1, 3), 16) / 255,
            g: parseInt(hex.slice(3, 5), 16) / 255,
            b: parseInt(hex.slice(5, 7), 16) / 255
        };
    }

    setupEventListeners() {
        ['speed', 'size', 'flow'].forEach(id => {
            const slider = document.getElementById(id);
            const display = document.getElementById(id + 'Value');
            if (slider) {
                slider.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    this.params[id] = val;
                    if (display) display.textContent = val;
                });
            }
        });

        // Canvas Size Listeners
        if (this.widthInput) {
            this.widthInput.addEventListener('change', () => this.resize());
            this.widthInput.addEventListener('input', () => this.resize());
        }
        if (this.heightInput) {
            this.heightInput.addEventListener('change', () => this.resize());
            this.heightInput.addEventListener('input', () => this.resize());
        }

        const randomBtn = document.getElementById('randomBtn');
        if (randomBtn) randomBtn.addEventListener('click', () => this.randomize());

        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportImage());
    }

    resize() {
        const w = parseInt(this.widthInput.value) || 1600;
        const h = parseInt(this.heightInput.value) || 1200;

        this.params.width = w;
        this.params.height = h;
        this.canvas.width = w;
        this.canvas.height = h;

        // Update Viewport
        this.gl.viewport(0, 0, w, h);

        // Update Info Display
        const info = document.getElementById('canvasInfo');
        if (info) info.textContent = `${w} × ${h} px`;
    }

    randomize() {
        const randHex = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

        // Randomize count (2 to 6)
        const count = 2 + Math.floor(Math.random() * 5);
        this.colors = [];
        for (let i = 0; i < count; i++) this.colors.push(randHex());

        // Randomize bg
        // document.getElementById('colorBg').value = '#0F172A'; // Keep dark mostly? Or random

        this.setupColorUI();

        this.params.speed = Math.random() * 100;
        this.params.size = Math.random() * 100;
        this.params.flow = Math.random() * 100;

        ['speed', 'size', 'flow'].forEach(id => {
            const el = document.getElementById(id);
            const disp = document.getElementById(id + 'Value');
            if (el) el.value = this.params[id];
            if (disp) disp.textContent = Math.floor(this.params[id]);
        });
    }

    exportImage() {
        const formatSelect = document.getElementById('exportFormat');
        const format = formatSelect ? formatSelect.value : 'png';

        if (format === 'gif') {
            this.exportGIF();
            return;
        }

        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const fileExt = format === 'jpeg' ? 'jpg' : 'png';
        const quality = format === 'jpeg' ? 0.9 : undefined;

        this.canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aurora_${Date.now()}.${fileExt}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, mimeType, quality);
    }

    exportGIF() {
        if (!window.GIF) {
            alert('GIF library not loaded.');
            return;
        }

        const btn = document.getElementById('exportBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Recording...';
        btn.disabled = true;

        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: this.params.width,
            height: this.params.height,
            workerScript: '/js/vendor/gif.worker.js' // Path to worker
        });

        // Capture settings
        const duration = 3000; // 3 seconds
        const fps = 20; // 20 fps for GIF balance
        const interval = 1000 / fps;
        const totalFrames = duration / interval;

        let framesCaptured = 0;

        // We need to capture canvas state
        // Since we are using requestAnimationFrame, we can hook into render loop or just setInterval
        // But with WebGL, we need to make sure preserveDrawingBuffer is true (it is)

        const captureFrame = setInterval(() => {
            if (framesCaptured >= totalFrames) {
                clearInterval(captureFrame);
                btn.textContent = 'Encoding GIF...';
                gif.render();
                return;
            }

            gif.addFrame(this.canvas, { copy: true, delay: interval });
            framesCaptured++;
        }, interval);

        gif.on('finished', (blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aurora_${Date.now()}.gif`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            btn.textContent = originalText;
            btn.disabled = false;
        });
    }

    startAnimation() {
        const gl = this.gl;

        const animate = () => {
            const time = (Date.now() - this.startTime) / 1000;

            gl.useProgram(this.program);

            gl.uniform2f(this.uniforms.resolution, this.params.width, this.params.height);
            gl.uniform1f(this.uniforms.time, time);

            gl.uniform3f(this.uniforms.bg, this.params.bgColor.r, this.params.bgColor.g, this.params.bgColor.b);

            gl.uniform1f(this.uniforms.speed, this.params.speed);
            gl.uniform1f(this.uniforms.size, this.params.size);
            gl.uniform1f(this.uniforms.flow, this.params.flow);

            // Pass colors array
            gl.uniform1i(this.uniforms.count, this.colors.length);

            // Flatten colors
            const colorArray = new Float32Array(this.maxColors * 3);
            this.colors.forEach((hex, i) => {
                const rgb = this.hexToRgb(hex);
                colorArray[i * 3] = rgb.r;
                colorArray[i * 3 + 1] = rgb.g;
                colorArray[i * 3 + 2] = rgb.b;
            });
            gl.uniform3fv(this.uniforms.colors, colorArray);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            this.animationId = requestAnimationFrame(animate);
        };

        animate();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.auroraGen = new AuroraGenerator();
});
