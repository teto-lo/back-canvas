
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('frameCanvas');
    const ctx = canvas.getContext('2d');
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const frameTypeSelect = document.getElementById('frameType');
    const thicknessInput = document.getElementById('thickness');
    const paddingInput = document.getElementById('padding');
    const colorInputs = [
        document.getElementById('color1'),
        document.getElementById('color2'),
        document.getElementById('color3')
    ];
    const exportFormat = document.getElementById('exportFormat');

    // Values
    let width = 1600;
    let height = 1200;

    // Resize
    function resizeCanvas() {
        width = parseInt(widthInput.value) || 1600;
        height = parseInt(heightInput.value) || 1200;
        canvas.width = width;
        canvas.height = height;
        document.getElementById('canvasInfo').textContent = `${width} × ${height} px`;
        draw();
    }

    // Draw
    function draw() {
        // Clear canvas to transparent
        ctx.clearRect(0, 0, width, height);

        const thickness = parseInt(thicknessInput.value) || 50;
        const padding = parseInt(paddingInput.value) || 40;
        const type = frameTypeSelect.value;
        const colors = colorInputs.map(c => c.value);

        // Fill white background ONLY for JPEG export
        const format = exportFormat.value;
        if (format === 'jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
        }
        // For PNG, canvas remains transparent (clearRect above)

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        if (type === 'simple') {
            ctx.lineWidth = thickness;
            ctx.strokeStyle = colors[0];
            ctx.strokeRect(padding + thickness / 2, padding + thickness / 2, width - padding * 2 - thickness, height - padding * 2 - thickness);
            ctx.lineWidth = 4;
            ctx.strokeStyle = colors[1];
            ctx.strokeRect(padding + thickness + 10, padding + thickness + 10, width - (padding + thickness) * 2 - 20, height - (padding + thickness) * 2 - 20);

        } else if (type === 'rounded') {
            const r = thickness;
            ctx.lineWidth = thickness;
            ctx.strokeStyle = colors[0];
            drawRoundedRect(ctx, padding + thickness / 2, padding + thickness / 2, width - padding * 2 - thickness, height - padding * 2 - thickness, r);

            ctx.fillStyle = colors[1];
            const dotSize = thickness / 4;
            ctx.beginPath();
            ctx.arc(padding + thickness / 2, padding + thickness / 2, dotSize, 0, Math.PI * 2);
            ctx.arc(width - padding - thickness / 2, padding + thickness / 2, dotSize, 0, Math.PI * 2);
            ctx.arc(width - padding - thickness / 2, height - padding - thickness / 2, dotSize, 0, Math.PI * 2);
            ctx.arc(padding + thickness / 2, height - padding - thickness / 2, dotSize, 0, Math.PI * 2);
            ctx.fill();

        } else if (type === 'circle-corner') {
            const r = thickness * 2;
            ctx.fillStyle = colors[0];
            ctx.beginPath(); ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = colors[1];
            ctx.beginPath(); ctx.arc(width, 0, r * 1.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = colors[2];
            ctx.beginPath(); ctx.arc(width, height, r * 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = colors[0];
            ctx.beginPath(); ctx.arc(0, height, r * 1.2, 0, Math.PI * 2); ctx.fill();

            ctx.lineWidth = thickness / 2;
            ctx.strokeStyle = colors[1];
            ctx.strokeRect(padding, padding, width - padding * 2, height - padding * 2);

        } else if (type === 'double') {
            ctx.lineWidth = thickness / 3;
            ctx.strokeStyle = colors[0];
            ctx.strokeRect(padding, padding, width - padding * 2, height - padding * 2);
            ctx.strokeStyle = colors[1];
            ctx.strokeRect(padding + thickness / 2, padding + thickness / 2, width - padding * 2 - thickness, height - padding * 2 - thickness);

        } else if (type === 'mixed') {
            // Scattered confetti style frame
            const shapes = ['circle', 'square', 'diamond', 'triangle', 'flower', 'star', 'heart'];

            // Draw a base line (optional, maybe make it very thin or dashed?)
            ctx.lineWidth = 2;
            ctx.strokeStyle = colors[1]; // Middle color
            ctx.setLineDash([5, 10]);
            ctx.strokeRect(padding + thickness / 2, padding + thickness / 2, width - padding * 2 - thickness, height - padding * 2 - thickness);
            ctx.setLineDash([]);

            // Scatter objects along the path
            const gap = thickness * 1.2; // Spacing

            // Function to draw shape at x,y
            const drawShape = (x, y) => {
                const shape = shapes[Math.floor(Math.random() * shapes.length)];
                const size = thickness * (0.4 + Math.random() * 0.6); // Random size
                const color = colors[Math.floor(Math.random() * colors.length)];
                const rot = Math.random() * Math.PI * 2;

                // Jitter position slightly
                x += (Math.random() - 0.5) * thickness * 0.5;
                y += (Math.random() - 0.5) * thickness * 0.5;

                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rot);
                ctx.fillStyle = color;

                if (shape === 'circle') {
                    ctx.beginPath(); ctx.arc(0, 0, size / 2, 0, Math.PI * 2); ctx.fill();
                } else if (shape === 'square') {
                    ctx.fillRect(-size / 2, -size / 2, size, size);
                } else if (shape === 'diamond') {
                    ctx.beginPath();
                    ctx.moveTo(0, -size / 1.5); ctx.lineTo(size / 1.5, 0); ctx.lineTo(0, size / 1.5); ctx.lineTo(-size / 1.5, 0);
                    ctx.fill();
                } else if (shape === 'triangle') {
                    ctx.beginPath();
                    ctx.moveTo(0, -size / 1.5); ctx.lineTo(size / 1.5, size / 1.5); ctx.lineTo(-size / 1.5, size / 1.5);
                    ctx.fill();
                } else if (shape === 'flower') {
                    ctx.beginPath();
                    for (let j = 0; j < 5; j++) {
                        ctx.rotate(Math.PI * 2 / 5);
                        ctx.ellipse(0, size / 2, size / 6, size / 1.5, 0, 0, Math.PI * 2);
                    }
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.beginPath(); ctx.arc(0, 0, size / 4, 0, Math.PI * 2); ctx.fill();
                } else if (shape === 'star') {
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * size / 1.5,
                            -Math.sin((18 + i * 72) * Math.PI / 180) * size / 1.5);
                        ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * size / 3,
                            -Math.sin((54 + i * 72) * Math.PI / 180) * size / 3);
                    }
                    ctx.closePath();
                    ctx.fill();
                } else if (shape === 'heart') {
                    ctx.beginPath();
                    const topCurveHeight = size * 0.3;
                    ctx.moveTo(0, topCurveHeight);
                    ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
                    ctx.bezierCurveTo(-size / 2, (size + topCurveHeight) / 2, 0, size, 0, size);
                    ctx.bezierCurveTo(0, size, size / 2, (size + topCurveHeight) / 2, size / 2, topCurveHeight);
                    ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
                    ctx.fill();
                }

                ctx.restore();
            };

            // Top edge
            for (let x = padding; x <= width - padding; x += gap) drawShape(x, padding + thickness / 2);
            // Bottom edge
            for (let x = padding; x <= width - padding; x += gap) drawShape(x, height - padding - thickness / 2);
            // Left edge
            for (let y = padding; y <= height - padding; y += gap) drawShape(padding + thickness / 2, y);
            // Right edge
            for (let y = padding; y <= height - padding; y += gap) drawShape(width - padding - thickness / 2, y);

        } else if (type === 'dots') {
            ctx.lineWidth = thickness / 5;
            ctx.strokeStyle = colors[2];
            ctx.strokeRect(padding + thickness / 2, padding + thickness / 2, width - padding * 2 - thickness, height - padding * 2 - thickness);

            const dotR = thickness / 1.5;
            const gap = thickness * 2;
            ctx.fillStyle = colors[0];

            for (let x = 0; x <= width; x += gap) {
                ctx.beginPath(); ctx.arc(x, padding, dotR, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(x, height - padding, dotR, 0, Math.PI * 2); ctx.fill();
            }
            for (let y = 0; y <= height; y += gap) {
                ctx.beginPath(); ctx.arc(padding, y, dotR, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(width - padding, y, dotR, 0, Math.PI * 2); ctx.fill();
            }
        }
    }

    function drawRoundedRect(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        ctx.stroke();
    }

    // Event Listeners
    [widthInput, heightInput].forEach(i => i.addEventListener('change', resizeCanvas));
    [frameTypeSelect, thicknessInput, paddingInput, exportFormat, ...colorInputs].forEach(i => i.addEventListener('input', draw));

    // Random Color
    document.getElementById('randomColorBtn').addEventListener('click', () => {
        const hslToHex = (h, s, l) => {
            l /= 100;
            const a = s * Math.min(l, 1 - l) / 100;
            const f = n => {
                const k = (n + h / 30) % 12;
                const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                return Math.round(255 * color).toString(16).padStart(2, '0');
            };
            return `#${f(0)}${f(8)}${f(4)}`;
        };

        const baseH = Math.floor(Math.random() * 360);

        colorInputs.forEach((input, i) => {
            const h = (baseH + i * 120 + Math.random() * 60) % 360;
            input.value = hslToHex(h, 60 + Math.random() * 35, 75 + Math.random() * 20);
        });
        draw();
    });

    // Randomize All
    document.getElementById('randomBtn').addEventListener('click', () => {
        // Random Type
        const types = ['simple', 'rounded', 'circle-corner', 'double', 'dots', 'mixed', 'mixed', 'mixed', 'mixed'];
        frameTypeSelect.value = types[Math.floor(Math.random() * types.length)];

        // Random Params
        thicknessInput.value = 20 + Math.floor(Math.random() * 100);
        paddingInput.value = 10 + Math.floor(Math.random() * 80);

        // Random Colors
        document.getElementById('randomColorBtn').click();
    });

    // Export
    document.getElementById('exportBtn').addEventListener('click', () => {
        draw();

        const format = exportFormat.value;
        const link = document.createElement('a');
        link.download = `frame_${Date.now()}.${format === 'jpeg' ? 'jpg' : 'png'}`;
        link.href = canvas.toDataURL(`image/${format}`, 0.9);
        link.click();
    });

    // Initial
    document.getElementById('randomColorBtn').click();
});
