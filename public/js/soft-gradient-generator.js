
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('softGradientCanvas');
    const ctx = canvas.getContext('2d');
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const baseColorInput = document.getElementById('baseColor');
    const blurInput = document.getElementById('blur');
    const bubbleCountInput = document.getElementById('bubbleCount');
    const colorContainer = document.getElementById('colorContainer');
    const addColorBtn = document.getElementById('addColorBtn');
    const exportFormat = document.getElementById('exportFormat');

    // State
    let colors = ['#a2d2ff', '#cdb4db', '#ffc8dd']; // Initial pastel colors

    // Resize
    function resizeCanvas() {
        const w = parseInt(widthInput.value) || 1600;
        const h = parseInt(heightInput.value) || 1200;
        canvas.width = w;
        canvas.height = h;
        document.getElementById('canvasInfo').textContent = `${w} × ${h} px`;
        draw();
    }

    // Color Inputs Management
    function renderColorInputs() {
        colorContainer.innerHTML = '';
        colors.forEach((color, index) => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.gap = '5px';

            const input = document.createElement('input');
            input.type = 'color';
            input.value = color;
            input.style.height = '36px';
            input.style.border = 'none';
            input.style.borderRadius = '4px';
            input.style.cursor = 'pointer';
            input.style.flex = '1';
            input.addEventListener('input', (e) => {
                colors[index] = e.target.value;
                draw();
            });

            const delBtn = document.createElement('button');
            delBtn.textContent = '×';
            delBtn.style.border = '1px solid #ddd';
            delBtn.style.background = 'white';
            delBtn.style.borderRadius = '4px';
            delBtn.style.cursor = 'pointer';
            delBtn.style.padding = '0 10px';
            delBtn.style.color = 'red';
            delBtn.addEventListener('click', () => {
                if (colors.length > 1) {
                    colors.splice(index, 1);
                    renderColorInputs();
                    draw();
                }
            });

            div.appendChild(input);
            div.appendChild(delBtn);
            colorContainer.appendChild(div);
        });
    }

    addColorBtn.addEventListener('click', () => {
        if (colors.length < 10) {
            colors.push('#ffffff');
            renderColorInputs();
            // Randomize new color
            const inputs = colorContainer.querySelectorAll('input[type="color"]');
            const last = inputs[inputs.length - 1];
            // Random pastel
            const h = Math.floor(Math.random() * 360);
            last.value = hslToHex(h, 80, 80);
            colors[colors.length - 1] = last.value;
            draw();
        }
    });

    function hslToHex(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    // Draw
    function draw() {
        const w = canvas.width;
        const h = canvas.height;

        // Base background
        ctx.fillStyle = baseColorInput.value;
        ctx.fillRect(0, 0, w, h);

        // Filter for blur
        const blurAmount = parseInt(blurInput.value) || 100;
        // Check if context filter is supported
        // Using filter is expensive but effective for this style
        ctx.filter = `blur(${blurAmount}px)`;

        const count = parseInt(bubbleCountInput.value) || 5;

        // Draw multiple gradient circles/blobs
        // Deterministic random based on... actually let's just use simple random for "Random Generate" logic.
        // But for "Draw" triggered by param change, we need consistent seeds?
        // Since we don't have a seed input easily available, we'll just redraw random positions ONLY on randomBtn or load, and keep positions in memory?
        // For simplicity: We will just redraw randomly each time for now, or store positions.

        // BETTER: Store bubbles state
        if (!window.bubbles || window.bubbles.length !== count) {
            regenerateBubbles(w, h, count);
        }

        window.bubbles.forEach((b, i) => {
            const color = colors[i % colors.length];
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.filter = 'none'; // Reset filter
    }

    function regenerateBubbles(w, h, count) {
        window.bubbles = [];
        for (let i = 0; i < count; i++) {
            window.bubbles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                r: Math.random() * (Math.min(w, h) / 2) + 200 // Large radius
            });
        }
    }

    // Event Listeners
    [widthInput, heightInput].forEach(i => i.addEventListener('change', () => { resizeCanvas(); regenerateBubbles(canvas.width, canvas.height, parseInt(bubbleCountInput.value)); draw(); }));
    [baseColorInput, blurInput].forEach(i => i.addEventListener('input', draw));
    bubbleCountInput.addEventListener('input', () => { regenerateBubbles(canvas.width, canvas.height, parseInt(bubbleCountInput.value)); draw(); });

    // Randomize
    document.getElementById('randomBtn').addEventListener('click', () => {
        // Random colors
        colors = [];
        const numColors = 3 + Math.floor(Math.random() * 3);
        const baseH = Math.floor(Math.random() * 360);

        for (let i = 0; i < numColors; i++) {
            // Harmonies
            const h = (baseH + i * 30 + Math.random() * 20) % 360;
            colors.push(hslToHex(h, 70 + Math.random() * 20, 75 + Math.random() * 20));
        }
        renderColorInputs();

        // Random params
        baseColorInput.value = hslToHex((baseH + 180) % 360, 20, 95); // Very light complementary
        blurInput.value = 80 + Math.floor(Math.random() * 100);
        bubbleCountInput.value = 4 + Math.floor(Math.random() * 6);

        regenerateBubbles(canvas.width, canvas.height, parseInt(bubbleCountInput.value));
        draw();
    });

    // Export
    document.getElementById('exportBtn').addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = `soft_gradient_${Date.now()}.jpg`;
        // Always JPEG for this style usually, but check select
        const format = exportFormat.value;
        link.download = `soft_gradient_${Date.now()}.${format === 'jpeg' ? 'jpg' : 'png'}`;
        link.href = canvas.toDataURL(`image/${format}`, 0.95);
        link.click();
    });

    // Init
    renderColorInputs();
    regenerateBubbles(1600, 1200, 5);
    draw();
});
