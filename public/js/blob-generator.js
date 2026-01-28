/**
 * Blob Generator - WebGL Controller
 * Organic Metaball Shapes with Animation
 */

class BlobGenerator {
    constructor() {
        this.canvas = document.getElementById('blobCanvas');
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
                { r: 0.93, g: 0.28, b: 0.6 },  // Pink
                { r: 0.55, g: 0.36, b: 0.96 },  // Purple
                { r: 0.4, g: 0.76, b: 0.95 }    // Blue
            ],
            colorBg: { r: 0.97, g: 0.98, b: 0.99 },
            bgTransparent: false,
            blobCount: 5,
            blobSize: 30,
            smoothness: 50,
            animSpeed: 0
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
            uniform float u_time;
            
            uniform vec3 u_colors[10];
            uniform int u_colorCount;
            uniform vec3 u_bg;
            uniform float u_bgTransparent;
            
            uniform int u_blobCount;
            uniform float u_blobSize;
            uniform float u_smoothness;
            uniform float u_animSpeed;
            
            // Pseudo-random function
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }
            
            vec2 random2(vec2 st) {
                return vec2(
                    random(st),
                    random(st + vec2(1.0, 1.0))
                );
            }
            
            void main() {
                vec2 uv = v_texCoord;
                float aspect = u_resolution.x / u_resolution.y;
                vec2 coord = uv;
                coord.x *= aspect;
                
                float metaball = 0.0;
                vec3 color = u_bg;
                
                float closestDist = 999.0;
                int closestIdx = 0;
                
                // Metaball calculation
                for(int i = 0; i < 8; i++) {
                    if (i >= u_blobCount) break;
                    
                    // Generate blob position (deterministic + animated)
                    vec2 seed = vec2(float(i) * 0.3, float(i) * 0.7);
                    vec2 basePos = random2(seed);
                    
                    // Animation offset
                    float animTime = u_time * u_animSpeed * 0.5;
                    vec2 animOffset = vec2(
                        sin(animTime + float(i) * 2.0) * 0.15,
                        cos(animTime + float(i) * 1.5) * 0.15
                    );
                    
                    vec2 blobPos = basePos + animOffset;
                    blobPos.x *= aspect;
                    
                    // Distance to blob
                    float dist = length(coord - blobPos);
                    
                    // Track closest blob for color
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestIdx = i;
                    }
                    
                    // Metaball influence (inverse square)
                    float radius = u_blobSize / 100.0;
                    float influence = radius / (dist + 0.01);
                    metaball += influence;
                }
                
                // Threshold for metaball visibility
                float threshold = 1.0 + (1.0 - u_smoothness / 100.0) * 2.0;
                float alpha = smoothstep(threshold - 0.3, threshold + 0.3, metaball);
                
                // Get color from closest blob
                // Use modulo manually by subtracting colorCount repeatedly
                vec3 blobColor = u_colors[0];
                int idx = closestIdx;
                
                // Manual modulo for up to 8 blobs
                if (idx >= u_colorCount) idx = idx - u_colorCount;
                if (idx >= u_colorCount) idx = idx - u_colorCount;
                if (idx >= u_colorCount) idx = idx - u_colorCount;
                if (idx >= u_colorCount) idx = idx - u_colorCount;
                if (idx >= u_colorCount) idx = idx - u_colorCount;
                if (idx >= u_colorCount) idx = idx - u_colorCount;
                if (idx >= u_colorCount) idx = idx - u_colorCount;
                if (idx >= u_colorCount) idx = idx - u_colorCount;
                
                // Select color based on index
                for(int i = 0; i < 10; i++) {
                    if (i >= u_colorCount) break;
                    if (i == idx) blobColor = u_colors[i];
                }
                
                // Mix colors based on metaball strength
                color = mix(u_bg, blobColor, alpha);
                
                if (u_bgTransparent > 0.5) {
                    gl_FragColor = vec4(color, alpha);
                } else {
                    gl_FragColor = vec4(color, 1.0);
                }
            }
        `;

        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader) {
            console.error('Failed to create vertex shader - check console for compilation errors');
            return;
        }

        if (!fragmentShader) {
            console.error('Failed to create fragment shader - check console for compilation errors');
            return;
        }

        this.program = this.createProgram(vertexShader, fragmentShader);

        if (!this.program) {
            console.error('Failed to link program - check console for linking errors');
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
            time: gl.getUniformLocation(this.program, 'u_time'),
            blobCount: gl.getUniformLocation(this.program, 'u_blobCount'),
            blobSize: gl.getUniformLocation(this.program, 'u_blobSize'),
            smoothness: gl.getUniformLocation(this.program, 'u_smoothness'),
            animSpeed: gl.getUniformLocation(this.program, 'u_animSpeed'),
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
        });
        document.getElementById('height').addEventListener('input', (e) => {
            this.params.height = parseInt(e.target.value);
            this.updateCanvasSize();
        });

        // Colors
        document.getElementById('addColorBtn').addEventListener('click', () => {
            if (this.params.colors.length < 10) {
                this.params.colors.push({ r: Math.random(), g: Math.random(), b: Math.random() });
                this.updateColorUI();
            }
        });

        document.getElementById('colorBg').addEventListener('input', (e) => {
            this.params.colorBg = this.hexToRgb(e.target.value);
        });
        document.getElementById('bgTransparent').addEventListener('change', (e) => {
            this.params.bgTransparent = e.target.checked;
        });

        // Parameters
        ['blobCount', 'blobSize', 'smoothness', 'animSpeed'].forEach(id => {
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
        // Random colors
        const count = 3 + Math.floor(Math.random() * 3);
        this.params.colors = [];
        for (let i = 0; i < count; i++) {
            this.params.colors.push({ r: Math.random(), g: Math.random(), b: Math.random() });
        }
        this.updateColorUI();

        // Random parameters
        this.params.blobCount = 3 + Math.floor(Math.random() * 6);
        this.params.blobSize = 20 + Math.floor(Math.random() * 60);
        this.params.smoothness = Math.floor(Math.random() * 100);
        this.params.animSpeed = Math.floor(Math.random() * 80);

        ['blobCount', 'blobSize', 'smoothness', 'animSpeed'].forEach(id => {
            document.getElementById(id).value = this.params[id];
            document.getElementById(id + 'Value').textContent = Math.floor(this.params[id]);
        });
    }

    exportImage() {
        const formatSelect = document.getElementById('exportFormat');
        const format = formatSelect ? formatSelect.value : 'png';

        if (format === 'gif') {
            this.exportGIF();
        } else {
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
    }

    exportGIF() {
        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: this.canvas.width,
            height: this.canvas.height,
            workerScript: '/js/vendor/gif.worker.js'
        });

        const frameCount = 30;
        const duration = 3000; // 3 seconds
        const frameDelay = duration / frameCount;

        const captureFrame = (frameIndex) => {
            if (frameIndex >= frameCount) {
                gif.render();
                return;
            }

            this.time = (frameIndex / frameCount) * 6.28; // 0 to 2π
            this.render();

            setTimeout(() => {
                gif.addFrame(this.canvas, { copy: true, delay: frameDelay });
                captureFrame(frameIndex + 1);
            }, 50);
        };

        gif.on('finished', (blob) => {
            this.saveBlob(blob, 'gif');
        });

        captureFrame(0);
    }

    saveBlob(blob, fileExt) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `blob_${Date.now()}.${fileExt}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    startAnimation() {
        const animate = () => {
            if (this.params.animSpeed > 0) {
                this.time += 0.016 * (this.params.animSpeed / 50.0);
            }
            this.render();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
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
        gl.uniform1f(this.uniforms.time, this.time);

        gl.uniform1i(this.uniforms.blobCount, this.params.blobCount);
        gl.uniform1f(this.uniforms.blobSize, this.params.blobSize);
        gl.uniform1f(this.uniforms.smoothness, this.params.smoothness);
        gl.uniform1f(this.uniforms.animSpeed, this.params.animSpeed);

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
    new BlobGenerator();
});
