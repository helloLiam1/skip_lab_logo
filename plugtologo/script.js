// Global variable to control the intensity of the metaball effect
const METABALL_INTENSITY = 0.7;

const canvas = document.getElementById('patternCanvas');
const ctx = canvas.getContext('2d');

const offCanvas = document.createElement('canvas');
const offCtx = offCanvas.getContext('2d');

const patternTypeInput = document.getElementById('patternType');
const arrowDirectionInput = document.getElementById('arrowDirection');

const inputs = {
    count: document.getElementById('elementCount'),
    spacing: document.getElementById('elementSpacing'),
    radius: document.getElementById('circleRadius'),
    thinStroke: document.getElementById('thinStrokeWeight'),
    thickStroke: document.getElementById('thickStrokeWeight'),
    waveAmplitude: document.getElementById('waveAmplitude'),
    waveFrequency: document.getElementById('waveFrequency')
};

// Value display elements
const displays = {
    count: document.getElementById('elementCountVal'),
    spacing: document.getElementById('elementSpacingVal'),
    radius: document.getElementById('circleRadiusVal'),
    thinStroke: document.getElementById('thinStrokeWeightVal'),
    thickStroke: document.getElementById('thickStrokeWeightVal'),
    waveAmplitude: document.getElementById('waveAmplitudeVal'),
    waveFrequency: document.getElementById('waveFrequencyVal')
};

// Labels that change text based on mode
const countLabel = document.getElementById('countLabel');
const spacingLabel = document.getElementById('spacingLabel');

// Toggle UI elements based on pattern type
function updateUI() {
    const type = patternTypeInput.value;
    const waveControls = document.querySelectorAll('.wave-control');
    const arrowControls = document.querySelectorAll('.arrow-control');

    // Hide all specific controls first
    waveControls.forEach(el => el.style.display = 'none');
    arrowControls.forEach(el => el.style.display = 'none');

    if (type === 'circles') {
        countLabel.textContent = 'Connecting Circles';
        spacingLabel.textContent = 'Total Distance Factor';
    } else if (type === 'wave') {
        waveControls.forEach(el => el.style.display = 'flex');
        countLabel.textContent = 'Number of Lines';
        spacingLabel.textContent = 'Total Distance Factor';
    } else if (type === 'squiggly') {
        waveControls.forEach(el => el.style.display = 'flex');
        countLabel.textContent = 'Squiggle Detail';
        spacingLabel.textContent = 'Total Distance Factor';
    } else if (type === 'dna') {
        waveControls.forEach(el => el.style.display = 'flex');
        if (inputs.waveAmplitude) inputs.waveAmplitude.closest('.control-group').style.display = 'none';
        countLabel.textContent = 'Number of Strands';
        spacingLabel.textContent = 'Total Distance Factor';
    } else if (type === 'random-lines') {
        countLabel.textContent = 'Number of Rectangles';
        spacingLabel.textContent = 'Total Distance Factor';
    } else if (type === 'dots') {
        countLabel.textContent = 'Number of Dots';
        spacingLabel.textContent = 'Total Distance Factor';
    } else if (type === 'spring') {
        countLabel.textContent = 'Number of Coils';
        spacingLabel.textContent = 'Total Distance Factor';
    } else if (type === 'pipe') {
        countLabel.textContent = 'Number of Bubbles';
        spacingLabel.textContent = 'Total Distance Factor';
    } else if (type === 'pills') {
        countLabel.textContent = 'Number of Pills';
        spacingLabel.textContent = 'Total Distance Factor';
    } else if (type === 'arrows') {
        arrowControls.forEach(el => el.style.display = 'flex');
        countLabel.textContent = 'Number of Arrows';
        spacingLabel.textContent = 'Total Distance Factor';
    }
    draw();
}

patternTypeInput.addEventListener('change', updateUI);
if (arrowDirectionInput) {
    arrowDirectionInput.addEventListener('change', draw);
}

let width, height;

function resize() {
    const container = canvas.parentElement;
    width = container.clientWidth;
    height = container.clientHeight;

    // Support high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    offCanvas.width = canvas.width;
    offCanvas.height = canvas.height;
    offCtx.scale(dpr, dpr);

    draw();
}

window.addEventListener('resize', resize);

function draw() {
    ctx.clearRect(0, 0, width, height);

    const type = patternTypeInput.value;

    // Get values from inputs
    const count = parseInt(inputs.count.value);
    const spacing = parseFloat(inputs.spacing.value);
    const radius = parseFloat(inputs.radius.value);
    const thinStrokeWeight = parseFloat(inputs.thinStroke.value);
    const thickStrokeWeight = parseFloat(inputs.thickStroke.value);

    const strokeColor = '#f8fafc'; // light text color
    const bgColor = '#0f172a'; // match background to hide lines inside circles

    // Calculate total width of the pattern to center it
    // Use a constant multiplier (40) so the distance factor is independent of count
    const totalWidth = spacing * 40;
    const startX = (width - totalWidth) / 2;
    const y = height / 2;
    const endX = startX + totalWidth;
    const actualSpacing = count > 0 ? totalWidth / count : 0;

    // Draw connecting elements
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = thinStrokeWeight;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (type === 'circles') {
        for (let i = 1; i < count; i++) {
            ctx.beginPath();
            ctx.arc(startX + i * actualSpacing, y, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    } else if (type === 'wave') {
        const amplitude = parseFloat(inputs.waveAmplitude.value);
        const frequency = parseFloat(inputs.waveFrequency.value);

        // In wave mode, spacing determines the distance between the two end circles
        for (let i = 0; i < count; i++) {
            // Space lines along the vertical diameter of the circle
            // using a sine function to simulate a 3D tube projection
            const t = count > 1 ? i / (count - 1) : 0.5;
            // Angle from -PI/2 (top) to PI/2 (bottom)
            const angle = -Math.PI / 2 + t * Math.PI;

            const yOffset = radius * Math.sin(angle);
            const xOffset = radius * Math.cos(angle);

            const lineStartX = startX + xOffset;
            const lineEndX = endX - xOffset;

            if (lineStartX <= lineEndX) {
                ctx.beginPath();

                // Draw line with sine wave
                // We use a small step for smoothness
                const step = 2;
                for (let x = lineStartX; x <= lineEndX; x += step) {
                    const nx = (x - lineStartX) / (lineEndX - lineStartX);
                    // Sine wave starts and ends at 0 if frequency is a multiple of 0.5
                    const waveY = y + yOffset + Math.sin(nx * Math.PI * 2 * frequency) * amplitude;

                    if (x === lineStartX) {
                        ctx.moveTo(x, waveY);
                    } else {
                        ctx.lineTo(x, waveY);
                    }
                }
                // Ensure it connects exactly to the end
                ctx.lineTo(lineEndX, y + yOffset);
                ctx.stroke();
            }
        }
    } else if (type === 'squiggly') {
        const amplitude = parseFloat(inputs.waveAmplitude.value);

        // Smooth continuous noise function instead of erratic jitter
        const noise = (val) => {
            return (Math.sin(val) + Math.sin(val * 2.13) + Math.sin(val * 3.73)) / 3;
        };

        const startXEdge = startX + radius * 0.5; // Start slightly inside
        const endXEdge = endX - radius * 0.5;

        if (startXEdge < endXEdge) {
            const numLoops = Math.max(2, Math.floor(count / 1.5));
            const pointsPerLoop = 20;
            const totalPoints = numLoops * pointsPerLoop;

            const points = [{ x: startXEdge, y: y }];

            for (let i = 1; i < totalPoints; i++) {
                const t = i / totalPoints;

                // Add smooth variation to the forward progression
                const progressT = t + noise(t * 10) * 0.03;
                const clampedT = Math.max(0, Math.min(1, progressT));
                const baseX = startXEdge + clampedT * (endXEdge - startXEdge);

                // Noise to phase (loops slightly irregular)
                const phaseNoise = noise(t * 15) * 0.3;
                const loopAngle = (t * numLoops + phaseNoise) * Math.PI * 2;

                // Smoothly varying width and height of loops
                const rx = (spacing * 1.5) * (1 + noise(t * 12 + 100) * 0.4);
                const ry = amplitude * (0.8 + noise(t * 8 + 200) * 0.4);

                // Base loop coordinates
                const offsetX = -Math.cos(loopAngle) * rx;
                const offsetY = Math.sin(loopAngle) * ry;

                // Tilted loops to simulate handwriting slant
                const slant = noise(t * 5 + 300) * 0.4;
                const tiltedX = offsetX * Math.cos(slant) - offsetY * Math.sin(slant);
                const tiltedY = offsetX * Math.sin(slant) + offsetY * Math.cos(slant);

                // Center wobble
                const centerWobble = noise(t * 7 + 400) * (amplitude * 0.2);

                points.push({
                    x: baseX + tiltedX,
                    y: y + centerWobble + tiltedY
                });
            }

            points.push({ x: endXEdge, y: y });

            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length - 1; i++) {
                const xc = (points[i].x + points[i + 1].x) / 2;
                const yc = (points[i].y + points[i + 1].y) / 2;
                ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }

            ctx.quadraticCurveTo(
                points[points.length - 2].x,
                points[points.length - 2].y,
                points[points.length - 1].x,
                points[points.length - 1].y
            );

            ctx.stroke();
        }
    } else if (type === 'dna') {
        // Amplitude equals radius so the wave peak-to-peak equals the circle diameter
        const amplitude = radius;
        const frequency = parseFloat(inputs.waveFrequency.value);

        // Start exactly at the centers so the waves emerge from underneath the filled circles
        const startXEdge = startX;
        const endXEdge = endX;

        if (startXEdge < endXEdge) {
            const step = 2;
            for (let i = 0; i < count; i++) {
                // Phase shift each strand evenly
                const phase = count > 1 ? (i / count) * Math.PI * 2 : 0;

                ctx.beginPath();
                for (let x = startXEdge; x <= endXEdge; x += step) {
                    const nx = (x - startXEdge) / (endXEdge - startXEdge);
                    const waveY = y + Math.sin(nx * Math.PI * 2 * frequency + phase) * amplitude;

                    if (x === startXEdge) {
                        ctx.moveTo(x, waveY);
                    } else {
                        ctx.lineTo(x, waveY);
                    }
                }

                // Ensure it connects exactly to the end edge
                const endY = y + Math.sin(Math.PI * 2 * frequency + phase) * amplitude;
                ctx.lineTo(endXEdge, endY);
                ctx.stroke();
            }
        }
    } else if (type === 'random-lines') {
        const pseudoRandom = (seed) => {
            let x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };

        // Clear offscreen canvas
        offCtx.clearRect(0, 0, width, height);

        offCtx.fillStyle = strokeColor;
        const rectHeight = thinStrokeWeight * 3 + 2;
        const cornerRadius = Math.min(3, rectHeight / 3); // Smaller corner radius, closer to rectangle

        // Ensure rectangles are vertically constrained within the circles' height
        const maxRandY = Math.max(0, radius - rectHeight / 2);

        for (let i = 0; i < count; i++) {
            // Spread them vertically strictly within the maxRandY bounds
            const randY = (pseudoRandom(i * 1.1) * 2 - 1) * maxRandY;
            const lineY = y + randY;

            // Give them a fixed horizontal area between the circles
            const minX = startX + radius + 10;
            const maxX = endX - radius - 10;

            if (minX < maxX) {
                const availableWidth = maxX - minX;

                // Calculate length independently of availableWidth so they don't stretch when spacing increases
                // Generates an absolute width between 8 and ~200 pixels
                const absoluteLength = 8 + 200 * pseudoRandom(i * 2.2);

                // Cap the maximum length to 1/4th the distance between the two big circles
                const lineLength = Math.min(absoluteLength, availableWidth * 0.25);

                // Position rectangle randomly within the available width (this spreads them out)
                const startPos = minX + pseudoRandom(i * 3.3) * (availableWidth - lineLength);

                offCtx.beginPath();
                if (offCtx.roundRect) {
                    offCtx.roundRect(startPos, lineY - rectHeight / 2, lineLength, rectHeight, cornerRadius);
                } else {
                    offCtx.rect(startPos, lineY - rectHeight / 2, lineLength, rectHeight);
                }
                offCtx.fill();
            }
        }

        // Apply the metaball intensity global variable
        const filterEl = document.getElementById('goo');
        if (filterEl) {
            const blurEl = filterEl.querySelector('feGaussianBlur');
            const desiredBlur = 4 * METABALL_INTENSITY;
            if (parseFloat(blurEl.getAttribute('stdDeviation')) !== desiredBlur) {
                blurEl.setAttribute('stdDeviation', desiredBlur);
                // Force Canvas to re-evaluate the SVG filter by briefly detaching it from the DOM
                const parent = filterEl.parentNode;
                const nextSibling = filterEl.nextSibling;
                parent.removeChild(filterEl);
                parent.insertBefore(filterEl, nextSibling);
            }
        }

        // Now draw the offscreen canvas to the main canvas with the gooey filter!
        ctx.save();
        if (METABALL_INTENSITY > 0) {
            ctx.filter = 'url(#goo)';
        } else {
            ctx.filter = 'none'; // Completely disable the filter if intensity is 0
        }
        // Reset transform so we can draw the pixel-perfect offCanvas properly
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(offCanvas, 0, 0);
        ctx.restore();

    } else if (type === 'dots') {
        const pseudoRandom = (seed) => {
            let x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };

        // Make dots slightly larger
        const dotRadius = thinStrokeWeight * 2 + 1.5;
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = strokeColor;
        ctx.lineWidth = Math.max(0.5, thinStrokeWeight * 0.7);

        // Draw top and bottom jagged connections
        const drawJaggedEdge = (startYOffset, seedOffset) => {
            const numSegments = Math.max(5, Math.floor(count / 2));
            const segmentWidth = (endX - startX) / numSegments;

            ctx.beginPath();
            const points = [];
            for (let i = 0; i <= numSegments; i++) {
                const px = startX + i * segmentWidth;
                let py = y + startYOffset;
                // Add random Y offset except for first and last point
                if (i > 0 && i < numSegments) {
                    // Decreased the variation amplitude to make the line flatter
                    py += (pseudoRandom(i * 1.1 + seedOffset) * 2 - 1) * (radius * 0.04);
                }
                points.push({ x: px, y: py });
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();

            points.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2);
                ctx.fill();
            });
        };

        if (count > 0) {
            drawJaggedEdge(-radius, 100); // Top
            drawJaggedEdge(radius, 200);  // Bottom
        }

    } else if (type === 'spring') {
        const coils = Math.max(1, count); // Number of loops
        const points = 100 * coils; // Resolution for smoothness

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = thinStrokeWeight;

        const startSpringX = startX + radius;
        const endSpringX = endX - radius;
        const springWidth = endSpringX - startSpringX;

        const Ry = radius; // Height of spring matches circles
        const Rx = radius * 0.4; // Width of loops

        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
            const t = i / points;
            // Shift phase by -PI/2 so it starts at the vertical center
            const angle = t * coils * Math.PI * 2 - Math.PI / 2;

            // Parametric equation for a helix projected in 2D
            const px = startSpringX + springWidth * t - Rx * Math.sin(angle) - Rx;
            const py = y + Ry * Math.cos(angle);

            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.stroke();

    } else if (type === 'pipe') {
        const pseudoRandom = (seed) => {
            let x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };

        // Draw top and bottom thick lines connecting the circles
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = thickStrokeWeight;

        ctx.beginPath();
        // Top line
        ctx.moveTo(startX, y - radius);
        ctx.lineTo(endX, y - radius);
        // Bottom line
        ctx.moveTo(startX, y + radius);
        ctx.lineTo(endX, y + radius);
        ctx.stroke();

        // Draw scattered filled circles of random sizes inside the pipe
        ctx.fillStyle = strokeColor;
        for (let i = 0; i < count; i++) {
            const seed = i * 7.3;
            // Vary bubble size: heavily skew towards smaller dots with occasional large   
            const bubbleRadius = 2 + Math.pow(pseudoRandom(seed), 4) * (radius * 0.2);

            // Keep strictly between the two big end circles horizontally
            const minX = startX + radius + bubbleRadius + 5;
            const maxX = endX - radius - bubbleRadius - 5;

            if (minX < maxX) {
                const bx = minX + pseudoRandom(seed + 1) * (maxX - minX);

                // Keep strictly inside the top and bottom borders vertically
                const topBound = y - radius + thickStrokeWeight / 2 + bubbleRadius + 2;
                const bottomBound = y + radius - thickStrokeWeight / 2 - bubbleRadius - 2;

                if (topBound < bottomBound) {
                    const by = topBound + pseudoRandom(seed + 2) * (bottomBound - topBound);

                    ctx.beginPath();
                    ctx.arc(bx, by, bubbleRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

    } else if (type === 'pills') {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = thinStrokeWeight;
        
        // Compensate for the thinner stroke weight so the outer boundary perfectly aligns with the big circles
        const pillRadius = radius + (thickStrokeWeight - thinStrokeWeight) / 2;
        
        ctx.beginPath();
        // Top line
        ctx.moveTo(startX, y - pillRadius);
        ctx.lineTo(endX, y - pillRadius);
        // Bottom line
        ctx.moveTo(startX, y + pillRadius);
        ctx.lineTo(endX, y + pillRadius);
        
        const centerX = (startX + endX) / 2;
        // The maximum offset of the arc centers from the true center.
        // It ensures the outermost arcs perfectly touch the inner edges of the big circles.
        const maxOffset = Math.max(0, (endX - startX) / 2 - 2 * radius);
        
        for (let i = 0; i < count; i++) {
            let offset = 0;
            if (count > 1) {
                const progress = i / (count - 1);
                offset = progress * maxOffset;
            }
            
            const leftArcCx = centerX - offset;
            const rightArcCx = centerX + offset;
            
            // Left arc (bulges left, endpoints on the right)
            ctx.moveTo(leftArcCx, y - pillRadius);
            ctx.arc(leftArcCx, y, pillRadius, -Math.PI / 2, Math.PI / 2, true);
            
            // Right arc (bulges right, endpoints on the left)
            ctx.moveTo(rightArcCx, y + pillRadius);
            ctx.arc(rightArcCx, y, pillRadius, Math.PI / 2, -Math.PI / 2, true);
        }
        ctx.stroke();

    } else if (type === 'arrows') {
        const direction = arrowDirectionInput ? arrowDirectionInput.value : 'right';

        const arrowHeight = radius; // Length equals diameter
        const arrowWidth = radius; // 45 degree angle for clean nesting

        const pointySideGap = 10; // Gap when the pointy side faces the circle
        const openSideGap = -20;  // Gap when the open side faces the circle (can be negative to pull it closer)

        const firstArrowDir = (direction === 'left') ? 'left' : 'right';
        const lastArrowDir = (direction === 'right') ? 'right' : 'left';

        let startXEdge, endXEdge;

        if (firstArrowDir === 'right') {
            // First arrow is >. Left side is OPEN.
            startXEdge = startX + radius + openSideGap + arrowWidth / 2;
        } else {
            // First arrow is <. Left side is POINTY.
            startXEdge = startX + radius + pointySideGap + arrowWidth / 2;
        }

        if (lastArrowDir === 'right') {
            // Last arrow is >. Right side is POINTY.
            endXEdge = endX - radius - pointySideGap - arrowWidth / 2;
        } else {
            // Last arrow is <. Right side is OPEN.
            endXEdge = endX - radius - openSideGap - arrowWidth / 2;
        }

        if (startXEdge < endXEdge) {
            ctx.beginPath();

            const availableWidth = endXEdge - startXEdge;
            // Spread arrows evenly. If count is 1, put it in the middle.
            const arrowSpacing = count > 1 ? availableWidth / (count - 1) : 0;

            for (let i = 0; i < count; i++) {
                const cx = count > 1 ? startXEdge + i * arrowSpacing : startXEdge + availableWidth / 2;

                let drawLeft = false;
                let drawRight = false;

                if (direction === 'right') {
                    drawRight = true;
                } else if (direction === 'left') {
                    drawLeft = true;
                } else if (direction === 'center') {
                    const midIndex = (count - 1) / 2;
                    if (i < midIndex) {
                        drawRight = true;
                    } else if (i > midIndex) {
                        drawLeft = true;
                    } else {
                        // Exact middle when count is odd
                        drawRight = true;
                        drawLeft = true;
                    }
                }

                if (drawRight) {
                    ctx.moveTo(cx - arrowWidth / 2, y - arrowHeight);
                    ctx.lineTo(cx + arrowWidth / 2, y);
                    ctx.lineTo(cx - arrowWidth / 2, y + arrowHeight);
                }

                if (drawLeft) {
                    ctx.moveTo(cx + arrowWidth / 2, y - arrowHeight);
                    ctx.lineTo(cx - arrowWidth / 2, y);
                    ctx.lineTo(cx + arrowWidth / 2, y + arrowHeight);
                }
            }
            ctx.stroke();
        }
    }

    // Draw the two big end circles
    ctx.lineWidth = thickStrokeWeight;
    ctx.fillStyle = bgColor; // Fill so it hides the wave lines that might overlap

    // Left circle
    ctx.beginPath();
    ctx.arc(startX, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right circle
    if (count > 0 || type === 'wave') {
        ctx.beginPath();
        ctx.arc(endX, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}


// Add event listeners to update values and redraw
Object.keys(inputs).forEach(key => {
    if (inputs[key]) {
        inputs[key].addEventListener('input', (e) => {
            if (displays[key]) {
                displays[key].textContent = e.target.value;
            }
            // Request animation frame for smooth drawing during drag
            requestAnimationFrame(draw);
        });
    }
});

// Initial setup
updateUI();
resize();

