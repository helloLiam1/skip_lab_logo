/**
 * SKIP LAB - Generative Logo Designer
 * Core Application Logic - Light Theme & Straight Lines Only
 */

// Application State
const state = {
  gridSize: 8,
  text: "SKIP LAB",
  points: [],          // Active list of points: { id, char, x, y, labelPos }
  pathOrder: [],       // Ordered list of point IDs defining the path
  pathMode: 'zigzag',  // zigzag, tsp, ltr, random, entry
  strokeWidth: 4,
  dotRadius: 24,
  dotStrokeWidth: 2.5,
  patternType: 'straight',
  patternCount: 10,
  patternSpacing: 1.8,
  patternAmplitude: 20,
  patternFrequency: 2.0,
  patternArrowDir: 'right',
  fontFamily: "'Outfit', sans-serif",
  fontSize: 24,
  showGrid: true,
  showLabels: true,    // Toggle rendering of letter labels (SKIP LAB text)
  labelOffset: 25,
  activeDragId: null,
  animationIntervalMs: 1000,
  debugMode: false,
  genTarget: 'path'    // path (permutations) or position (dot coordinate randomizer)
};

// SVG Canvas dimensions (fixed internal coordinates)
const CANVAS_SIZE = 800;
const CANVAS_PADDING = 120; // Margin around the grid

// Element Selectors
const svgEl = document.getElementById('logo-svg');
const gridGroup = document.getElementById('grid-lines');
const logoPath = document.getElementById('logo-path');
const dotsGroup = document.getElementById('logo-dots');
const labelsGroup = document.getElementById('logo-labels');
const logoPatternConnections = document.getElementById('logo-pattern-connections');

// Pattern Inputs
const selectPatternType = document.getElementById('select-pattern-type');
const patternSettingsGroup = document.getElementById('pattern-settings-group');
const rangePatternCount = document.getElementById('range-pattern-count');
const valPatternCount = document.getElementById('val-pattern-count');
const rangePatternSpacing = document.getElementById('range-pattern-spacing');
const valPatternSpacing = document.getElementById('val-pattern-spacing');
const rangePatternAmplitude = document.getElementById('range-pattern-amplitude');
const valPatternAmplitude = document.getElementById('val-pattern-amplitude');
const rangePatternFrequency = document.getElementById('range-pattern-frequency');
const valPatternFrequency = document.getElementById('val-pattern-frequency');
const selectPatternArrowDir = document.getElementById('select-pattern-arrow-dir');

const lblPatternCount = document.getElementById('lbl-pattern-count');
const lblPatternSpacing = document.getElementById('lbl-pattern-spacing');

// Control Inputs
const inputText = document.getElementById('input-text');
const btnUpdateText = document.getElementById('btn-update-text');
const selectPathMode = document.getElementById('select-path-mode');
const btnShufflePath = document.getElementById('btn-shuffle-path');
const btnAnimatePath = document.getElementById('btn-animate-path');
const chkAnimateDraw = document.getElementById('chk-animate-draw');
const btnToggleText = document.getElementById('btn-toggle-text');
const btnToggleDebug = document.getElementById('btn-toggle-debug');
const rangeAnimationSpeed = document.getElementById('range-animation-speed');
const valAnimationSpeed = document.getElementById('val-animation-speed');
const radioGenTargets = document.getElementsByName('gen-target');
let animationInterval = null;
const rangeStrokeWidth = document.getElementById('range-stroke-width');
const valStrokeWidth = document.getElementById('val-stroke-width');
const rangeDotRadius = document.getElementById('range-dot-radius');
const valDotRadius = document.getElementById('val-dot-radius');
const rangeDotStrokeWidth = document.getElementById('range-dot-stroke-width');
const valDotStrokeWidth = document.getElementById('val-dot-stroke-width');
const selectFont = document.getElementById('select-font');
const rangeFontSize = document.getElementById('range-font-size');
const valFontSize = document.getElementById('val-font-size');
const selectGridSize = document.getElementById('select-grid-size');
const btnToggleGrid = document.getElementById('btn-toggle-grid');
const btnResetPoints = document.getElementById('btn-reset-points');
const variationsGrid = document.getElementById('variations-grid');
const coordDisplay = document.getElementById('coord-display');
const pathInfoDisplay = document.getElementById('path-info');

// Export Elements
const btnExportSvg = document.getElementById('btn-export-svg');
const btnExportPng = document.getElementById('btn-export-png');
const btnCopySvg = document.getElementById('btn-copy-svg');

// Global variable controlling the coordinate dot scaling intensity (0.3 = 30% scale increase)
let dotScaleAmount = 0.1; // scaling of the dot

// Init application
function init() {
  setupEventListeners();
  resetPointsToDefault();
  recomputePathOrder(state.points, state.pathMode);
  render();
  updateVariationsGallery();
}

// Convert grid coordinate (e.g. 0-8) to SVG canvas pixels (0-800)
function gridToPixel(gridX, gridY, customGridSize = state.gridSize) {
  const gridWidth = CANVAS_SIZE - 2 * CANVAS_PADDING;
  const step = gridWidth / customGridSize;
  return {
    x: CANVAS_PADDING + gridX * step,
    y: CANVAS_PADDING + gridY * step
  };
}

// Convert SVG canvas pixels (0-800) to snapped grid coordinates (e.g. 0-8)
function pixelToGrid(pixelX, pixelY, customGridSize = state.gridSize) {
  const gridWidth = CANVAS_SIZE - 2 * CANVAS_PADDING;
  const step = gridWidth / customGridSize;

  let gridX = Math.round((pixelX - CANVAS_PADDING) / step);
  let gridY = Math.round((pixelY - CANVAS_PADDING) / step);

  // Clamp to grid dimensions (excluding outer edges)
  gridX = Math.max(1, Math.min(customGridSize - 1, gridX));
  gridY = Math.max(1, Math.min(customGridSize - 1, gridY));

  return { gridX, gridY };
}

// Default initial layouts mapping
function resetPointsToDefault() {
  state.points = distributeTextPoints(state.text, state.gridSize);
}

// Auto-position points on grid based on lettering
function distributeTextPoints(text, gridSize) {
  const words = text.trim().split(/\s+/);
  const points = [];
  const midY = Math.floor(gridSize / 2);
  const rowUpper = midY;
  const rowLower = midY + 1;

  if (words.length >= 2) {
    // Interleave Word 1 (odd columns on upper row) and Word 2 (even columns on lower row)
    const w1 = words[0].toUpperCase();
    const w2 = words[1].toUpperCase();

    let id = 0;
    // Word 1 columns: 1, 3, 5, 7... labels are always ABOVE
    for (let i = 0; i < w1.length; i++) {
      const col = 1 + i * 2;
      if (col < gridSize) {
        points.push({ id: id++, char: w1[i], x: col, y: rowUpper, labelPos: 'above' });
      }
    }
    // Word 2 columns: 2, 4, 6... labels are always BELOW (excludes edge column 8)
    for (let i = 0; i < w2.length; i++) {
      const col = 2 + i * 2;
      if (col < gridSize) {
        points.push({ id: id++, char: w2[i], x: col, y: rowLower, labelPos: 'below' });
      }
    }
  } else {
    // Single word: interleave columns linearly, alternating labels above and below
    const word = words[0].toUpperCase();
    let id = 0;
    for (let i = 0; i < word.length; i++) {
      const col = 1 + i;
      if (col < gridSize) {
        const isAbove = (i % 2 === 0);
        points.push({
          id: id++,
          char: word[i],
          x: col,
          y: isAbove ? rowUpper : rowLower,
          labelPos: isAbove ? 'above' : 'below'
        });
      }
    }
  }
  return points;
}

// --- Self-Avoiding Path and Point-Collision Checking Helpers ---

// Distance from point (px, py) to line segment (x1, y1) -> (x2, y2)
function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);

  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t)); // clamp to segment

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

// Checks if the line segment p1-p2 passes through/crosses any other dot in the grid
function lineCrossesAnyDot(p1, p2, allPoints) {
  for (const p of allPoints) {
    if (p.id === p1.id || p.id === p2.id) continue;
    // 0.2 grid units is the threshold (close enough to count as passing through the dot)
    const dist = pointToSegmentDistance(p.x, p.y, p1.x, p1.y, p2.x, p2.y);
    if (dist < 0.2) {
      return true;
    }
  }
  return false;
}

// Checks if two line segments p1-p2 and p3-p4 cross each other (self-intersection check)
function segmentsIntersect(p1, p2, p3, p4) {
  // If segments share a common vertex, they are connected at an endpoint but don't cross
  if (p1.id === p3.id || p1.id === p4.id || p2.id === p3.id || p2.id === p4.id) {
    return false;
  }

  const ccw = (A, B, C) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

// Validates if connecting p1 -> p2 is self-avoiding and does not cross other dots
function isNewSegmentValid(p1, p2, pathSoFar, allPoints) {
  // Ensure the line does not pass through another dot (prevents parallel/collinear overlaps)
  return !lineCrossesAnyDot(p1, p2, allPoints);
}

// Backtracking DFS to find a random continuous, self-avoiding path that visits all dots
function generateRandomValidPath(points) {
  if (points.length <= 1) return [...points];

  const unvisited = new Set(points.map(p => p.id));
  const path = [];

  // Try starting from random points
  const startPoints = [...points].sort(() => Math.random() - 0.5);

  function dfs(current) {
    path.push(current);
    unvisited.delete(current.id);

    if (unvisited.size === 0) {
      return true; // Complete path found!
    }

    // Sort next candidates randomly
    const candidates = points.filter(p => unvisited.has(p.id))
      .sort(() => Math.random() - 0.5);

    for (const next of candidates) {
      if (isNewSegmentValid(current, next, path, points)) {
        if (dfs(next)) return true;
      }
    }

    // Backtrack
    path.pop();
    unvisited.add(current.id);
    return false;
  }

  for (const start of startPoints) {
    if (dfs(start)) {
      return path;
    }
  }

  // Fallback: If no self-avoiding tour exists, return spatial-sorted zigzag
  return [...points].sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    return a.y - b.y;
  });
}

// Get ordered points based on routing algorithm
function getRoutedPoints(pointsArray, mode = state.pathMode, updateState = true) {
  if (pointsArray.length <= 1) return [...pointsArray];

  let order = [];
  if (updateState) {
    if (state.pathOrder.length !== pointsArray.length) {
      recomputePathOrder(pointsArray, mode);
    }
    order = state.pathOrder;
  } else {
    order = getPathOrderForMode(pointsArray, mode);
  }

  const pointMap = new Map(pointsArray.map(p => [p.id, p]));
  const routed = [];
  order.forEach(id => {
    if (pointMap.has(id)) {
      routed.push(pointMap.get(id));
    }
  });

  // Guard: if somehow size mismatch, append missing points
  if (routed.length !== pointsArray.length) {
    pointsArray.forEach(p => {
      if (!routed.includes(p)) routed.push(p);
    });
  }

  return routed;
}

function getPathOrderForMode(pointsArray, mode) {
  let orderedPoints = [];
  switch (mode) {
    case 'zigzag':
      orderedPoints = [...pointsArray].sort((a, b) => {
        if (a.x !== b.x) return a.x - b.x;
        return a.y - b.y;
      });
      break;

    case 'ltr':
      orderedPoints = [...pointsArray].sort((a, b) => {
        if (a.x !== b.x) return a.x - b.x;
        return a.y - b.y;
      });
      break;

    case 'tsp':
      orderedPoints = solveTSP(pointsArray);
      break;

    case 'random':
      orderedPoints = generateRandomValidPath(pointsArray);
      break;

    case 'entry':
    default:
      orderedPoints = [...pointsArray].sort((a, b) => a.id - b.id);
      break;
  }
  return orderedPoints.map(p => p.id);
}

function recomputePathOrder(pointsArray, mode = state.pathMode) {
  state.pathOrder = getPathOrderForMode(pointsArray, mode);
}

// traveling salesperson solver (Brute-force for <= 8 points, Greedy Nearest Neighbor for > 8 points)
function solveTSP(points) {
  if (points.length <= 2) return [...points];

  const getDist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

  if (points.length > 8) {
    // Greedy approach for performance (Nearest Neighbor)
    const unvisited = [...points];
    const path = [];

    // Start at left-most point
    unvisited.sort((a, b) => a.x - b.x);
    let current = unvisited.shift();
    path.push(current);

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const d = getDist(current, unvisited[i]);
        if (d < minDist) {
          minDist = d;
          nearestIdx = i;
        }
      }
      current = unvisited.splice(nearestIdx, 1)[0];
      path.push(current);
    }
    return path;
  } else {
    // Exact Brute Force search to minimize total path distance
    let bestPath = [];
    let minDistance = Infinity;

    function permute(currentPath, remaining) {
      if (remaining.length === 0) {
        let dist = 0;
        for (let i = 0; i < currentPath.length - 1; i++) {
          dist += getDist(currentPath[i], currentPath[i + 1]);
        }
        if (dist < minDistance) {
          minDistance = dist;
          bestPath = [...currentPath];
        }
        return;
      }
      for (let i = 0; i < remaining.length; i++) {
        const nextPath = [...currentPath, remaining[i]];
        const nextRemaining = remaining.filter((_, idx) => idx !== i);
        permute(nextPath, nextRemaining);
      }
    }

    permute([], points);
    return bestPath;
  }
}

// Calculate the label positions (Constant offset: SKIP text is always ABOVE the dot, LAB text is always BELOW)
function getLabelPositions(routedPoints, offsetDistance = state.labelOffset) {
  const offsets = [];
  routedPoints.forEach(p => {
    const currPx = gridToPixel(p.x, p.y);
    const isAbove = (p.labelPos === 'above');
    const dirX = 0;
    const dirY = isAbove ? -1 : 1;

    offsets.push({
      x: currPx.x,
      y: currPx.y + dirY * offsetDistance,
      dirX,
      dirY
    });
  });
  return offsets;
}

// Transform local segment coordinate (x, y) where start = (0, 0) and end = (L, 0)
// to global SVG coordinates between point A (ax, ay) and point B (bx, by)
function transformLocalToGlobal(x, y, A, B, L) {
  if (L === 0) return { x: A.x, y: A.y };
  const ux = (B.x - A.x) / L;
  const uy = (B.y - A.y) / L;
  const vx = -uy;
  const vy = ux;
  return {
    x: A.x + x * ux + y * vx,
    y: A.y + x * uy + y * vy
  };
}

// Generate the specific SVG elements / paths for the selected pattern between points A and B
function generatePatternMarkup(A, B, customType = state.patternType, customStrokeWidth = state.strokeWidth) {
  const L = Math.hypot(B.x - A.x, B.y - A.y);
  if (L === 0) return "";

  const type = customType;
  const count = state.patternCount;
  const spacing = state.patternSpacing;
  const radius = state.dotRadius;
  const thinStrokeWeight = customStrokeWidth;
  const thickStrokeWeight = customStrokeWidth * 1.5;

  let markup = "";

  if (type === 'straight') {
    markup += `<path d="M ${A.x} ${A.y} L ${B.x} ${B.y}" stroke-width="${thinStrokeWeight}" />`;
  } else if (type === 'circles') {
    const actualSpacing = count > 0 ? L / count : 0;
    for (let i = 1; i < count; i++) {
      const lx = i * actualSpacing;
      const g = transformLocalToGlobal(lx, 0, A, B, L);
      markup += `<circle cx="${g.x}" cy="${g.y}" r="${radius}" style="stroke: var(--accent); stroke-width: ${thinStrokeWeight}px; fill: none;" />`;
    }
  } else if (type === 'wave') {
    const amplitude = state.patternAmplitude;
    const frequency = state.patternFrequency;

    const startX = 0;
    const endX = L;

    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0.5;
      const angle = -Math.PI / 2 + t * Math.PI;
      const yOffset = radius * Math.sin(angle);
      const xOffset = radius * Math.cos(angle);

      const lineStartX = startX + xOffset;
      const lineEndX = endX - xOffset;

      if (lineStartX <= lineEndX) {
        let pathPoints = [];
        const step = 4;
        for (let lx = lineStartX; lx <= lineEndX; lx += step) {
          const nx = (lx - lineStartX) / (lineEndX - lineStartX);
          const waveY = yOffset + Math.sin(nx * Math.PI * 2 * frequency) * amplitude;
          const g = transformLocalToGlobal(lx, waveY, A, B, L);
          pathPoints.push(g);
        }
        const endG = transformLocalToGlobal(lineEndX, yOffset, A, B, L);
        pathPoints.push(endG);

        const dStr = pathPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        markup += `<path d="${dStr}" stroke-width="${thinStrokeWeight}" />`;
      }
    }
  } else if (type === 'squiggly') {
    const amplitude = state.patternAmplitude;
    const noise = (val) => (Math.sin(val) + Math.sin(val * 2.13) + Math.sin(val * 3.73)) / 3;

    const startXEdge = radius * 0.5;
    const endXEdge = L - radius * 0.5;

    if (startXEdge < endXEdge) {
      const numLoops = Math.max(2, Math.floor(count / 1.5));
      const pointsPerLoop = 15;
      const totalPoints = numLoops * pointsPerLoop;

      const pathPoints = [];
      const startG = transformLocalToGlobal(startXEdge, 0, A, B, L);
      pathPoints.push(startG);

      for (let i = 1; i < totalPoints; i++) {
        const t = i / totalPoints;
        const progressT = t + noise(t * 10) * 0.03;
        const clampedT = Math.max(0, Math.min(1, progressT));
        const baseX = startXEdge + clampedT * (endXEdge - startXEdge);

        const phaseNoise = noise(t * 15) * 0.3;
        const loopAngle = (t * numLoops + phaseNoise) * Math.PI * 2;

        const rx = (spacing * 12) * (1 + noise(t * 12 + 100) * 0.4);
        const ry = amplitude * (0.8 + noise(t * 8 + 200) * 0.4);

        const offsetX = -Math.cos(loopAngle) * rx;
        const offsetY = Math.sin(loopAngle) * ry;

        const slant = noise(t * 5 + 300) * 0.4;
        const tiltedX = offsetX * Math.cos(slant) - offsetY * Math.sin(slant);
        const tiltedY = offsetX * Math.sin(slant) + offsetY * Math.cos(slant);

        const centerWobble = noise(t * 7 + 400) * (amplitude * 0.2);

        const g = transformLocalToGlobal(baseX + tiltedX, centerWobble + tiltedY, A, B, L);
        pathPoints.push(g);
      }
      const endG = transformLocalToGlobal(endXEdge, 0, A, B, L);
      pathPoints.push(endG);

      let dStr = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
      for (let i = 1; i < pathPoints.length - 1; i++) {
        const xc = (pathPoints[i].x + pathPoints[i + 1].x) / 2;
        const yc = (pathPoints[i].y + pathPoints[i + 1].y) / 2;
        dStr += ` Q ${pathPoints[i].x} ${pathPoints[i].y}, ${xc} ${yc}`;
      }
      dStr += ` L ${pathPoints[pathPoints.length - 1].x} ${pathPoints[pathPoints.length - 1].y}`;
      markup += `<path d="${dStr}" stroke-width="${thinStrokeWeight}" />`;
    }
  } else if (type === 'dna') {
    const amplitude = radius;
    const frequency = state.patternFrequency;
    const step = 4;

    for (let i = 0; i < count; i++) {
      const phase = count > 1 ? (i / count) * Math.PI * 2 : 0;
      let pathPoints = [];
      for (let lx = 0; lx <= L; lx += step) {
        const nx = lx / L;
        const waveY = Math.sin(nx * Math.PI * 2 * frequency + phase) * amplitude;
        const g = transformLocalToGlobal(lx, waveY, A, B, L);
        pathPoints.push(g);
      }
      const endY = Math.sin(Math.PI * 2 * frequency + phase) * amplitude;
      const endG = transformLocalToGlobal(L, endY, A, B, L);
      pathPoints.push(endG);

      const dStr = pathPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      markup += `<path d="${dStr}" stroke-width="${thinStrokeWeight}" />`;
    }
  } else if (type === 'random-lines') {
    const pseudoRandom = (seed) => {
      let x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    const rectHeight = thinStrokeWeight * 3 + 2;
    const maxRandY = Math.max(0, radius - rectHeight / 2);

    markup += `<g filter="url(#goo)">`;
    for (let i = 0; i < count; i++) {
      const randY = (pseudoRandom(i * 1.1) * 2 - 1) * maxRandY;
      const minX = radius + 10;
      const maxX = L - radius - 10;

      if (minX < maxX) {
        const availableWidth = maxX - minX;
        const absoluteLength = 8 + 200 * pseudoRandom(i * 2.2);
        const lineLength = Math.min(absoluteLength, availableWidth * 0.25);
        const startPos = minX + pseudoRandom(i * 3.3) * (availableWidth - lineLength);

        const p1 = transformLocalToGlobal(startPos, randY - rectHeight / 2, A, B, L);
        const p2 = transformLocalToGlobal(startPos + lineLength, randY - rectHeight / 2, A, B, L);
        const p3 = transformLocalToGlobal(startPos + lineLength, randY + rectHeight / 2, A, B, L);
        const p4 = transformLocalToGlobal(startPos, randY + rectHeight / 2, A, B, L);

        markup += `<path d="M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} Z" style="fill: var(--accent); stroke: none;" />`;
      }
    }
    markup += `</g>`;
  } else if (type === 'dots') {
    const pseudoRandom = (seed) => {
      let x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    const dotRadius = thinStrokeWeight * 2 + 1.5;

    const drawJaggedEdgeMarkup = (startYOffset, seedOffset) => {
      const numSegments = Math.max(5, Math.floor(count / 2));
      const segmentWidth = L / numSegments;
      const pathPoints = [];
      let circleMarkup = "";

      for (let i = 0; i <= numSegments; i++) {
        let lx = i * segmentWidth;
        let ly = startYOffset;

        if (i > 0 && i < numSegments) {
          // Add random X offset so dots are not equidistant
          lx += (pseudoRandom(i * 1.3 + seedOffset) * 2 - 1) * (segmentWidth * 0.4);
          // Add random Y offset so they don't form a perfectly straight line
          ly += (pseudoRandom(i * 1.1 + seedOffset) * 2 - 1) * (radius * 0.18);
        }

        const g = transformLocalToGlobal(lx, ly, A, B, L);
        pathPoints.push(g);

        // Only draw dots for internal points (offset from the circle boundaries)
        if (i > 0 && i < numSegments) {
          const isFilled = pseudoRandom(i * 1.5 + seedOffset) < 0.6;
          if (isFilled) {
            circleMarkup += `<circle cx="${g.x}" cy="${g.y}" r="${dotRadius}" style="fill: var(--accent); stroke: none;" />`;
          } else {
            circleMarkup += `<circle cx="${g.x}" cy="${g.y}" r="${dotRadius}" style="fill: none; stroke: var(--accent); stroke-width: ${thinStrokeWeight}px;" />`;
          }
        }
      }
      const dStr = pathPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      return `<path d="${dStr}" stroke-width="${Math.max(0.5, thinStrokeWeight * 0.7)}" />` + circleMarkup;
    };

    if (count > 0) {
      markup += drawJaggedEdgeMarkup(-radius, 100);
      markup += drawJaggedEdgeMarkup(radius, 200);
    }
  } else if (type === 'spring') {
    const coils = Math.max(1, count);
    const totalPoints = 100 * coils;
    const startSpringX = radius;
    const endSpringX = L - radius;
    const springWidth = endSpringX - startSpringX;

    const Ry = radius;
    const Rx = radius * 0.4;
    const pathPoints = [];

    for (let i = 0; i <= totalPoints; i++) {
      const t = i / totalPoints;
      const angle = t * coils * Math.PI * 2 - Math.PI / 2;
      const lx = startSpringX + springWidth * t - Rx * Math.sin(angle) - Rx;
      const ly = Ry * Math.cos(angle);
      const g = transformLocalToGlobal(lx, ly, A, B, L);
      pathPoints.push(g);
    }
    const dStr = pathPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    markup += `<path d="${dStr}" stroke-width="${thinStrokeWeight}" />`;
  } else if (type === 'pipe') {
    const pseudoRandom = (seed) => {
      let x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    const t1 = transformLocalToGlobal(0, -radius, A, B, L);
    const t2 = transformLocalToGlobal(L, -radius, A, B, L);
    const b1 = transformLocalToGlobal(0, radius, A, B, L);
    const b2 = transformLocalToGlobal(L, radius, A, B, L);

    markup += `<path d="M ${t1.x} ${t1.y} L ${t2.x} ${t2.y} M ${b1.x} ${b1.y} L ${b2.x} ${b2.y}" stroke-width="${thickStrokeWeight}" />`;

    for (let i = 0; i < count; i++) {
      const seed = i * 7.3;
      const bubbleRadius = 2 + Math.pow(pseudoRandom(seed), 4) * (radius * 0.2);
      const minX = radius + bubbleRadius + 5;
      const maxX = L - radius - bubbleRadius - 5;

      if (minX < maxX) {
        const lx = minX + pseudoRandom(seed + 1) * (maxX - minX);
        const topBound = -radius + thickStrokeWeight / 2 + bubbleRadius + 2;
        const bottomBound = radius - thickStrokeWeight / 2 - bubbleRadius - 2;

        if (topBound < bottomBound) {
          const ly = topBound + pseudoRandom(seed + 2) * (bottomBound - topBound);
          const g = transformLocalToGlobal(lx, ly, A, B, L);
          markup += `<circle cx="${g.x}" cy="${g.y}" r="${bubbleRadius}" style="fill: var(--accent); stroke: none;" />`;
        }
      }
    }
  } else if (type === 'pills') {
    const pillRadius = radius + (thickStrokeWeight - thinStrokeWeight) / 2;

    const t1 = transformLocalToGlobal(0, -pillRadius, A, B, L);
    const t2 = transformLocalToGlobal(L, -pillRadius, A, B, L);
    const b1 = transformLocalToGlobal(0, pillRadius, A, B, L);
    const b2 = transformLocalToGlobal(L, pillRadius, A, B, L);

    markup += `<path d="M ${t1.x} ${t1.y} L ${t2.x} ${t2.y} M ${b1.x} ${b1.y} L ${b2.x} ${b2.y}" stroke-width="${thinStrokeWeight}" />`;

    const centerX = L / 2;
    const maxOffset = Math.max(0, L / 2 - 2 * radius);

    for (let i = 0; i < count; i++) {
      let offset = 0;
      if (count > 1) {
        const progress = i / (count - 1);
        offset = progress * maxOffset;
      }

      const leftArcCx = centerX - offset;
      const rightArcCx = centerX + offset;

      const lStart = transformLocalToGlobal(leftArcCx, -pillRadius, A, B, L);
      const lEnd = transformLocalToGlobal(leftArcCx, pillRadius, A, B, L);
      const rStart = transformLocalToGlobal(rightArcCx, pillRadius, A, B, L);
      const rEnd = transformLocalToGlobal(rightArcCx, -pillRadius, A, B, L);

      markup += `<path d="M ${lStart.x} ${lStart.y} A ${pillRadius} ${pillRadius} 0 0 0 ${lEnd.x} ${lEnd.y}" stroke-width="${thinStrokeWeight}" />`;
      markup += `<path d="M ${rStart.x} ${rStart.y} A ${pillRadius} ${pillRadius} 0 0 0 ${rEnd.x} ${rEnd.y}" stroke-width="${thinStrokeWeight}" />`;
    }
  } else if (type === 'arrows') {
    const direction = state.patternArrowDir;
    const arrowHeight = radius;
    const arrowWidth = radius;

    const pointySideGap = 10;
    const openSideGap = -20;

    const firstArrowDir = (direction === 'left') ? 'left' : 'right';
    const lastArrowDir = (direction === 'right') ? 'right' : 'left';

    let startXEdge, endXEdge;
    if (firstArrowDir === 'right') {
      startXEdge = radius + openSideGap + arrowWidth / 2;
    } else {
      startXEdge = radius + pointySideGap + arrowWidth / 2;
    }

    if (lastArrowDir === 'right') {
      endXEdge = L - radius - pointySideGap - arrowWidth / 2;
    } else {
      endXEdge = L - radius - openSideGap - arrowWidth / 2;
    }

    if (startXEdge < endXEdge) {
      const availableWidth = endXEdge - startXEdge;
      const arrowSpacing = count > 1 ? availableWidth / (count - 1) : 0;

      let dStr = "";
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
            drawRight = true;
            drawLeft = true;
          }
        }

        if (drawRight) {
          const p1 = transformLocalToGlobal(cx - arrowWidth / 2, -arrowHeight, A, B, L);
          const p2 = transformLocalToGlobal(cx + arrowWidth / 2, 0, A, B, L);
          const p3 = transformLocalToGlobal(cx - arrowWidth / 2, arrowHeight, A, B, L);
          dStr += ` M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`;
        }
        if (drawLeft) {
          const p1 = transformLocalToGlobal(cx + arrowWidth / 2, -arrowHeight, A, B, L);
          const p2 = transformLocalToGlobal(cx - arrowWidth / 2, 0, A, B, L);
          const p3 = transformLocalToGlobal(cx + arrowWidth / 2, arrowHeight, A, B, L);
          dStr += ` M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`;
        }
      }
      markup += `<path d="${dStr}" stroke-width="${thinStrokeWeight}" />`;
    }
  }

  const startCircleG = transformLocalToGlobal(0, 0, A, B, L);
  const endCircleG = transformLocalToGlobal(L, 0, A, B, L);

  const masks = `<circle cx="${startCircleG.x}" cy="${startCircleG.y}" r="${radius}" style="fill: #ffffff; stroke: none;" />` +
    `<circle cx="${endCircleG.x}" cy="${endCircleG.y}" r="${radius}" style="fill: #ffffff; stroke: none;" />`;

  return masks + markup;
}

// Calculate the total pixel length of the drawn path (Straight lines only)
function calculatePathLength(pixelPoints) {
  if (pixelPoints.length <= 1) return 0;

  let length = 0;
  for (let i = 0; i < pixelPoints.length - 1; i++) {
    length += Math.hypot(pixelPoints[i + 1].x - pixelPoints[i].x, pixelPoints[i + 1].y - pixelPoints[i].y);
  }
  return Math.round(length);
}

// Render background grid
function renderGrid() {
  gridGroup.innerHTML = '';
  if (!state.showGrid) return;

  const step = (CANVAS_SIZE - 2 * CANVAS_PADDING) / state.gridSize;

  // Render grid lines
  for (let i = 0; i <= state.gridSize; i++) {
    const coord = CANVAS_PADDING + i * step;

    // Vertical lines
    const vLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    vLine.setAttribute("x1", coord);
    vLine.setAttribute("y1", CANVAS_PADDING);
    vLine.setAttribute("x2", coord);
    vLine.setAttribute("y2", CANVAS_SIZE - CANVAS_PADDING);
    vLine.setAttribute("class", (i === 0 || i === state.gridSize) ? "grid-line-boundary" : "grid-line-main");
    gridGroup.appendChild(vLine);

    // Horizontal lines
    const hLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    hLine.setAttribute("x1", CANVAS_PADDING);
    hLine.setAttribute("y1", coord);
    hLine.setAttribute("x2", CANVAS_SIZE - CANVAS_PADDING);
    hLine.setAttribute("y2", coord);
    hLine.setAttribute("class", (i === 0 || i === state.gridSize) ? "grid-line-boundary" : "grid-line-main");
    gridGroup.appendChild(hLine);
  }

  // Render little intersection dots for tech drafting board effect
  for (let x = 0; x <= state.gridSize; x++) {
    for (let y = 0; y <= state.gridSize; y++) {
      const pos = gridToPixel(x, y);
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", pos.x);
      dot.setAttribute("cy", pos.y);
      dot.setAttribute("class", "grid-intersection-dot");
      gridGroup.appendChild(dot);
    }
  }
}

// Main Rendering Cycle
function render() {
  if (pathAnimation.active) return;
  // 1. Draw Grid
  renderGrid();

  // 2. Sort/Route Points
  const routedPoints = getRoutedPoints(state.points);
  const pixelPoints = routedPoints.map(p => gridToPixel(p.x, p.y));

  // 3. Render Pattern Connections
  let patternMarkup = "";
  for (let i = 0; i < pixelPoints.length - 1; i++) {
    patternMarkup += generatePatternMarkup(pixelPoints[i], pixelPoints[i + 1]);
  }
  logoPatternConnections.innerHTML = patternMarkup;

  // 4. Update Path Length display
  const totalLength = calculatePathLength(pixelPoints);
  pathInfoDisplay.textContent = totalLength;

  // 5. Render Node Handles (Interactive Dots)
  dotsGroup.innerHTML = '';
  state.points.forEach(p => {
    const pos = gridToPixel(p.x, p.y);

    const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodeGroup.setAttribute("class", "node-group");
    nodeGroup.setAttribute("data-id", p.id);

    // Grab events
    nodeGroup.addEventListener('pointerdown', onDragStart);
    nodeGroup.addEventListener('pointerenter', () => {
      coordDisplay.textContent = `Letter "${p.char}" at Grid intersection (${p.x}, ${p.y})`;
    });
    nodeGroup.addEventListener('pointerleave', () => {
      if (state.activeDragId === null) {
        coordDisplay.textContent = 'Hover coordinates or drag nodes to position';
      }
    });

    // Invisible hover hit area circle for responsive dragging
    const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    hitArea.setAttribute("cx", pos.x);
    hitArea.setAttribute("cy", pos.y);
    hitArea.setAttribute("r", Math.max(24, state.dotRadius * 2));
    hitArea.setAttribute("class", "node-hit-area");

    // Visible circle point
    const visibleCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    visibleCircle.setAttribute("cx", pos.x);
    visibleCircle.setAttribute("cy", pos.y);
    visibleCircle.setAttribute("r", state.dotRadius);
    visibleCircle.setAttribute("class", "node-handle");

    // Gradient of red from darkest to lightest if debugMode is active
    let fillOverride = "";
    if (state.debugMode && routedPoints.length > 0) {
      const pathIndex = routedPoints.findIndex(rp => rp.id === p.id);
      if (pathIndex !== -1) {
        const t = routedPoints.length > 1 ? pathIndex / (routedPoints.length - 1) : 0;
        const lightness = 30 + t * 55; // 30% is dark red, 85% is light red
        fillOverride = `hsl(0, 100%, ${lightness}%)`;
      }
    }

    if (fillOverride) {
      visibleCircle.setAttribute("fill", fillOverride);
      visibleCircle.style.fill = fillOverride;
    } else {
      visibleCircle.removeAttribute("fill");
      visibleCircle.style.fill = "";
    }

    nodeGroup.appendChild(hitArea);
    nodeGroup.appendChild(visibleCircle);
    dotsGroup.appendChild(nodeGroup);
  });

  // 6. Render Labels (Letters - Centered inside Dots)
  labelsGroup.innerHTML = '';
  if (state.showLabels) {
    routedPoints.forEach((p) => {
      const pos = gridToPixel(p.x, p.y);
      const textLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textLabel.setAttribute("x", pos.x);
      textLabel.setAttribute("y", pos.y);
      textLabel.setAttribute("class", "node-label");
      textLabel.textContent = p.char;

      // Apply styling properties
      textLabel.style.fontFamily = state.fontFamily;
      textLabel.style.fontSize = `${state.fontSize}px`;

      textLabel.setAttribute("text-anchor", "middle");
      textLabel.setAttribute("dominant-baseline", "central");

      labelsGroup.appendChild(textLabel);
    });
  }

  // Update variable style properties in DOM
  document.documentElement.style.setProperty('--dot-radius', `${state.dotRadius}px`);
  document.documentElement.style.setProperty('--dot-stroke-width', `${state.dotStrokeWidth}px`);
}

// Drag & Drop Handlers
function onDragStart(e) {
  stopAnimation();
  stopPathAnimation();
  e.preventDefault();
  const group = e.currentTarget;
  state.activeDragId = parseInt(group.getAttribute('data-id'));

  // Listen on window so dragging persists when DOM nodes are re-rendered
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragEnd);

  // Update state indicators
  document.body.style.cursor = 'grabbing';
}

function onDragMove(e) {
  if (state.activeDragId === null) return;
  e.preventDefault();

  // Retrieve coordinate relative to SVG container bounding box
  const rect = svgEl.getBoundingClientRect();

  // Convert mouse location to 0-800 SVG grid pixels
  const rawX = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
  const rawY = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;

  // Snap coordinates
  const snapped = pixelToGrid(rawX, rawY);

  // Update point position
  const targetPoint = state.points.find(p => p.id === state.activeDragId);
  if (targetPoint) {
    targetPoint.x = snapped.gridX;
    targetPoint.y = snapped.gridY;

    coordDisplay.textContent = `Dragging "${targetPoint.char}" to (${snapped.gridX}, ${snapped.gridY})`;
    render();
  }
}

function onDragEnd(e) {
  if (state.activeDragId === null) return;
  e.preventDefault();

  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', onDragEnd);

  const targetPoint = state.points.find(p => p.id === state.activeDragId);
  if (targetPoint) {
    coordDisplay.textContent = `Dropped "${targetPoint.char}" at Grid intersection (${targetPoint.x}, ${targetPoint.y})`;
  }

  state.activeDragId = null;
  document.body.style.cursor = '';

  // Update the mini variation gallery based on the new positions
  updateVariationsGallery();
}

// Variations Gallery Generator (Shows different permutations of routing)
function updateVariationsGallery() {
  variationsGrid.innerHTML = '';

  // Define 6 routing variations
  const variants = [
    { name: "Zigzag Route", mode: "zigzag" },
    { name: "Shortest Path (TSP)", mode: "tsp" },
    { name: "Left to Right", mode: "ltr" },
    { name: "Input Order", mode: "entry" },
    { name: "Alternative Tour A", mode: "random_a" },
    { name: "Alternative Tour B", mode: "random_b" }
  ];

  variants.forEach((v) => {
    // Create card container
    const card = document.createElement('div');
    card.setAttribute('class', 'variation-card');

    // Create inner SVG
    const svgBox = document.createElement('div');
    svgBox.setAttribute('class', 'variation-canvas-box');

    const miniSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    miniSvg.setAttribute("viewBox", "0 0 800 800");

    // Render static grid lines on mini SVG
    const mGrid = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const step = (CANVAS_SIZE - 2 * CANVAS_PADDING) / state.gridSize;
    for (let i = 0; i <= state.gridSize; i++) {
      const coord = CANVAS_PADDING + i * step;
      const vl = document.createElementNS("http://www.w3.org/2000/svg", "line");
      vl.setAttribute("x1", coord); vl.setAttribute("y1", CANVAS_PADDING);
      vl.setAttribute("x2", coord); vl.setAttribute("y2", CANVAS_SIZE - CANVAS_PADDING);
      vl.setAttribute("stroke", "rgba(0,0,0,0.05)");
      vl.setAttribute("stroke-width", "2");
      mGrid.appendChild(vl);

      const hl = document.createElementNS("http://www.w3.org/2000/svg", "line");
      hl.setAttribute("x1", CANVAS_PADDING); hl.setAttribute("y1", coord);
      hl.setAttribute("x2", CANVAS_SIZE - CANVAS_PADDING); hl.setAttribute("y2", coord);
      hl.setAttribute("stroke", "rgba(0,0,0,0.05)");
      hl.setAttribute("stroke-width", "2");
      mGrid.appendChild(hl);
    }
    miniSvg.appendChild(mGrid);

    // Calculate routing path for this variation
    let variantPoints = [];
    if (v.mode === 'random_a' || v.mode === 'random_b') {
      variantPoints = generateRandomValidPath(state.points);
    } else {
      variantPoints = getRoutedPoints(state.points, v.mode, false);
    }

    const pixelPoints = variantPoints.map(p => gridToPixel(p.x, p.y));

    // Render pattern connections
    const mPatternGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    let variantPatternMarkup = "";
    for (let i = 0; i < pixelPoints.length - 1; i++) {
      variantPatternMarkup += generatePatternMarkup(pixelPoints[i], pixelPoints[i + 1]);
    }
    mPatternGroup.innerHTML = variantPatternMarkup;
    miniSvg.appendChild(mPatternGroup);

    // Render points
    variantPoints.forEach((p, idx) => {
      const pos = gridToPixel(p.x, p.y);
      const mCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      mCircle.setAttribute("cx", pos.x);
      mCircle.setAttribute("cy", pos.y);
      mCircle.setAttribute("r", state.dotRadius);
      mCircle.setAttribute("stroke-width", state.dotStrokeWidth);

      let fillVal = "#ffffff";
      let strokeVal = "var(--accent)";
      if (state.debugMode && variantPoints.length > 0) {
        const t = variantPoints.length > 1 ? idx / (variantPoints.length - 1) : 0;
        const lightness = 30 + t * 55;
        fillVal = `hsl(0, 100%, ${lightness}%)`;
      }
      mCircle.setAttribute("fill", fillVal);
      mCircle.setAttribute("stroke", strokeVal);
      miniSvg.appendChild(mCircle);
    });

    // Render labels in mini-SVG
    if (state.showLabels) {
      const mLabelsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      variantPoints.forEach(p => {
        const pos = gridToPixel(p.x, p.y);
        const mLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        mLabel.setAttribute("x", pos.x);
        mLabel.setAttribute("y", pos.y);
        mLabel.setAttribute("fill", "var(--text-main)");
        mLabel.setAttribute("text-anchor", "middle");
        mLabel.setAttribute("dominant-baseline", "central");
        mLabel.style.fontFamily = state.fontFamily;
        mLabel.style.fontSize = `${state.fontSize}px`;
        mLabel.style.fontWeight = "500";
        mLabel.textContent = p.char;
        mLabelsGroup.appendChild(mLabel);
      });
      miniSvg.appendChild(mLabelsGroup);
    }

    svgBox.appendChild(miniSvg);
    card.appendChild(svgBox);

    // Label Title
    const title = document.createElement('div');
    title.setAttribute('class', 'variation-title');
    title.textContent = v.name;
    card.appendChild(title);

    // Interaction: Load variant details into active state on click
    card.addEventListener('click', () => {
      stopAnimation();
      if (v.mode === 'random_a' || v.mode === 'random_b') {
        state.pathOrder = variantPoints.map(p => p.id);
        state.pathMode = 'random';
        selectPathMode.value = 'random';
      } else {
        state.pathMode = v.mode;
        selectPathMode.value = v.mode;
        recomputePathOrder(state.points, v.mode);
      }

      render();
    });

    variationsGrid.appendChild(card);
  });
}

// Generate standalone SVG for export (resolved to simple light theme hex values)
function generateStandaloneSVG() {
  const clone = svgEl.cloneNode(true);
  clone.removeAttribute('id');
  clone.setAttribute('width', '800');
  clone.setAttribute('height', '800');
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Remove interactive hit areas
  const hitAreas = clone.querySelectorAll('.node-hit-area');
  hitAreas.forEach(node => node.remove());

  // Resolve theme light values
  const bg = '#ffffff';
  const text = '#18181b';
  const gridLine = 'rgba(24, 24, 27, 0.06)';
  const gridBorder = 'rgba(24, 24, 27, 0.15)';
  const accent = '#18181b';

  // Reset path color link
  const path = clone.querySelector('#logo-path');
  if (path) {
    path.setAttribute('stroke', accent);
    path.removeAttribute('class');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', state.strokeWidth);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
  }

  // Apply hardcoded styles inline to grid, handles and labels
  const gridLines = clone.querySelectorAll('#grid-lines line');
  gridLines.forEach(line => {
    const isBoundary = line.getAttribute('class') === 'grid-line-boundary';
    line.removeAttribute('class');
    line.setAttribute('stroke', isBoundary ? gridBorder : gridLine);
    line.setAttribute('stroke-width', isBoundary ? '1.5' : '1');
    if (!isBoundary) line.setAttribute('stroke-dasharray', '4 4');
  });

  const gridDots = clone.querySelectorAll('.grid-intersection-dot');
  gridDots.forEach(dot => {
    dot.removeAttribute('class');
    dot.setAttribute('fill', gridLine);
    dot.setAttribute('r', '2');
  });

  const handles = clone.querySelectorAll('.node-handle');
  handles.forEach(h => {
    // Check if the element already has a custom fill (like red/blue debug highlights)
    const customFill = h.getAttribute('fill') || h.style.fill;
    h.removeAttribute('class');
    h.setAttribute('fill', customFill || '#ffffff');
    h.setAttribute('stroke', accent);
    h.setAttribute('stroke-width', state.dotStrokeWidth);
    h.setAttribute('r', state.dotRadius);
  });

  const labels = clone.querySelectorAll('.node-label');
  labels.forEach(l => {
    l.removeAttribute('class');
    l.setAttribute('fill', text);
    l.setAttribute('text-anchor', 'middle');
    l.setAttribute('dominant-baseline', 'central');
    l.style.fontFamily = state.fontFamily;
    l.style.fontSize = `${state.fontSize}px`;
    l.style.fontWeight = '500';
  });

  // Embed background color and default styling in exported SVG
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
    svg { background-color: ${bg}; }
    text { user-select: none; }
    #logo-pattern-connections path {
      fill: none;
      stroke: ${accent};
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    #logo-pattern-connections circle {
      fill: none;
      stroke: ${accent};
    }
  `;
  clone.insertBefore(style, clone.firstChild);

  return clone;
}

// Action: Export SVG File
function exportSVG() {
  const standaloneSvg = generateStandaloneSVG();
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(standaloneSvg);

  const filename = `${state.text.toLowerCase().replace(/\s+/g, '-')}-logo.svg`;
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Action: Copy SVG Code to Clipboard
function copySVGCode() {
  const standaloneSvg = generateStandaloneSVG();
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(standaloneSvg);

  navigator.clipboard.writeText(source)
    .then(() => {
      const originalText = btnCopySvg.innerHTML;
      btnCopySvg.innerHTML = '<i data-lucide="check"></i> Copied to Clipboard!';
      lucide.createIcons();
      setTimeout(() => {
        btnCopySvg.innerHTML = originalText;
        lucide.createIcons();
      }, 2000);
    })
    .catch(err => {
      console.error("Clipboard copy failed: ", err);
      alert("Failed to copy SVG code to clipboard.");
    });
}

// Action: Export PNG File (Draws SVG onto Canvas to Rasterize)
function exportPNG() {
  const standaloneSvg = generateStandaloneSVG();
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(standaloneSvg);

  // Canvas export size (Retina size 1600x1600 for sharp scaling)
  const exportSize = 1600;
  const canvas = document.createElement('canvas');
  canvas.width = exportSize;
  canvas.height = exportSize;
  const ctx = canvas.getContext('2d');

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();

  img.onload = function () {
    ctx.drawImage(img, 0, 0, exportSize, exportSize);
    URL.revokeObjectURL(url);

    // Download PNG link
    const filename = `${state.text.toLowerCase().replace(/\s+/g, '-')}-logo.png`;
    const pngUrl = canvas.toDataURL('image/png');

    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  img.src = url;
}

// --- Path Animation Engine ---

const pathAnimation = {
  active: false,
  state: 'idle', // 'drawing', 'pause', 'erasing'
  startTime: 0,
  currentSegment: 0,
  progress: 0.0,
  pulseIndex: -1,
  pulseStartTime: 0,
  pulseDuration: 250,    // ms for coordinate dot scale pulse
  onComplete: null
};

let animFrameId = null;

function startPathAnimation(onCycleComplete = null) {
  stopPathAnimation();

  pathAnimation.active = true;
  pathAnimation.state = 'drawing';
  pathAnimation.currentSegment = 0;
  pathAnimation.progress = 0.0;
  pathAnimation.pulseIndex = 0; // Pulse first dot immediately
  pathAnimation.pulseStartTime = performance.now();
  pathAnimation.startTime = performance.now();
  pathAnimation.onComplete = onCycleComplete;

  tickAnimation(performance.now());
}

function stopPathAnimation() {
  pathAnimation.active = false;
  pathAnimation.state = 'idle';
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

function tickAnimation(now) {
  if (!pathAnimation.active) return;

  const pointsArray = getRoutedPoints(state.points);
  if (pointsArray.length <= 1) {
    stopPathAnimation();
    render();
    return;
  }

  const numSegments = pointsArray.length - 1;

  // Calculate dynamic durations based on speed slider
  const speedFactor = state.animationIntervalMs / 1000.0;
  const segmentDuration = 350 * speedFactor;
  const eraseDuration = 180 * speedFactor; // speed of erasing
  const pauseDuration = 1000 * speedFactor;

  if (pathAnimation.state === 'drawing') {
    const elapsed = Math.max(0, now - pathAnimation.startTime);
    const totalDrawTime = numSegments * segmentDuration;

    if (elapsed >= totalDrawTime) {
      pathAnimation.state = 'pause';
      pathAnimation.startTime = now;
      pathAnimation.currentSegment = numSegments;
      pathAnimation.progress = 1.0;

      // Pulse the final dot when the line reaches it!
      pathAnimation.pulseIndex = numSegments;
      pathAnimation.pulseStartTime = now;
    } else {
      // Clamp newSeg to valid index bounds [0, numSegments - 1] to prevent negative or overflow values
      const newSeg = Math.max(0, Math.min(numSegments - 1, Math.floor(elapsed / segmentDuration)));
      pathAnimation.progress = (elapsed % segmentDuration) / segmentDuration;

      if (pathAnimation.currentSegment !== newSeg) {
        pathAnimation.currentSegment = newSeg;
        // Trigger pulse on the dot we just reached!
        pathAnimation.pulseIndex = newSeg;
        pathAnimation.pulseStartTime = now;
      }
    }
  }
  else if (pathAnimation.state === 'pause') {
    const elapsed = Math.max(0, now - pathAnimation.startTime);
    if (elapsed >= pauseDuration) {
      if (animationInterval) { // Auto-advance interval flag is active
        pathAnimation.state = 'erasing';
        pathAnimation.startTime = now;
        pathAnimation.currentSegment = 0;
        pathAnimation.progress = 0.0;
      } else {
        stopPathAnimation();
        render(); // static final render
        return;
      }
    }
  }
  else if (pathAnimation.state === 'erasing') {
    const elapsed = Math.max(0, now - pathAnimation.startTime);
    const totalEraseTime = numSegments * eraseDuration;

    if (elapsed >= totalEraseTime) {
      stopPathAnimation();
      if (pathAnimation.onComplete) {
        pathAnimation.onComplete();
      }
      return;
    } else {
      pathAnimation.currentSegment = Math.max(0, Math.min(numSegments - 1, Math.floor(elapsed / eraseDuration)));
      const segElapsed = elapsed % eraseDuration;
      pathAnimation.progress = segElapsed / eraseDuration;
    }
  }

  renderAnimatedFrame(pointsArray, now);
  animFrameId = requestAnimationFrame(tickAnimation);
}

function renderAnimatedFrame(pointsArray, now) {
  renderGrid();

  const numSegments = pointsArray.length - 1;
  const pixelPoints = pointsArray.map(p => gridToPixel(p.x, p.y));
  const speedFactor = state.animationIntervalMs / 1000.0;
  const currentPulseDuration = pathAnimation.pulseDuration * speedFactor;

  let patternMarkup = "";
  if (pathAnimation.state === 'drawing') {
    for (let i = 0; i < pathAnimation.currentSegment; i++) {
      if (pixelPoints[i] && pixelPoints[i + 1]) {
        patternMarkup += generatePatternMarkup(pixelPoints[i], pixelPoints[i + 1]);
      }
    }
    if (pathAnimation.currentSegment < numSegments) {
      const pStart = pixelPoints[pathAnimation.currentSegment];
      const pEnd = pixelPoints[pathAnimation.currentSegment + 1];
      if (pStart && pEnd) {
        const px = pStart.x + pathAnimation.progress * (pEnd.x - pStart.x);
        const py = pStart.y + pathAnimation.progress * (pEnd.y - pStart.y);
        patternMarkup += generatePatternMarkup(pStart, { x: px, y: py });
      }
    }
  } else if (pathAnimation.state === 'pause') {
    for (let i = 0; i < numSegments; i++) {
      if (pixelPoints[i] && pixelPoints[i + 1]) {
        patternMarkup += generatePatternMarkup(pixelPoints[i], pixelPoints[i + 1]);
      }
    }
  } else if (pathAnimation.state === 'erasing') {
    if (pathAnimation.currentSegment < numSegments) {
      const pStart = pixelPoints[pathAnimation.currentSegment];
      const pEnd = pixelPoints[pathAnimation.currentSegment + 1];
      if (pStart && pEnd) {
        const px = pStart.x + pathAnimation.progress * (pEnd.x - pStart.x);
        const py = pStart.y + pathAnimation.progress * (pEnd.y - pStart.y);
        patternMarkup += generatePatternMarkup({ x: px, y: py }, pEnd);
      }
    }
    for (let i = pathAnimation.currentSegment + 1; i < numSegments; i++) {
      if (pixelPoints[i] && pixelPoints[i + 1]) {
        patternMarkup += generatePatternMarkup(pixelPoints[i], pixelPoints[i + 1]);
      }
    }
  }

  logoPatternConnections.innerHTML = patternMarkup;
  pathInfoDisplay.textContent = calculatePathLength(pixelPoints);

  // Render Dots (with scale pulse)
  dotsGroup.innerHTML = '';
  state.points.forEach((p) => {
    const pos = gridToPixel(p.x, p.y);

    const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodeGroup.setAttribute("class", "node-group");
    nodeGroup.setAttribute("data-id", p.id);

    nodeGroup.addEventListener('pointerenter', () => {
      coordDisplay.textContent = `Letter "${p.char}" at Grid intersection (${p.x}, ${p.y})`;
    });
    nodeGroup.addEventListener('pointerleave', () => {
      if (state.activeDragId === null) {
        coordDisplay.textContent = 'Hover coordinates or drag nodes to position';
      }
    });

    const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    hitArea.setAttribute("cx", pos.x);
    hitArea.setAttribute("cy", pos.y);
    hitArea.setAttribute("r", Math.max(24, state.dotRadius * 2));
    hitArea.setAttribute("class", "node-hit-area");

    const visibleCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    visibleCircle.setAttribute("cx", pos.x);
    visibleCircle.setAttribute("cy", pos.y);

    let scale = 1.0;
    if (pathAnimation.active && pathAnimation.state === 'drawing' && pathAnimation.pulseIndex >= 0) {
      const pulsingPoint = pointsArray[pathAnimation.pulseIndex];
      if (pulsingPoint && pulsingPoint.id === p.id) {
        const pulseElapsed = now - pathAnimation.pulseStartTime;
        const u = Math.min(1.0, pulseElapsed / currentPulseDuration);
        scale = 1.0 + dotScaleAmount * Math.sin(u * Math.PI); // Pulse up using global scale factor
      }
    }

    visibleCircle.setAttribute("r", state.dotRadius * scale);
    visibleCircle.setAttribute("class", "node-handle");

    let fillOverride = "";
    if (state.debugMode && pointsArray.length > 0) {
      const pathIndex = pointsArray.findIndex(rp => rp.id === p.id);
      if (pathIndex !== -1) {
        const t = pointsArray.length > 1 ? pathIndex / (pointsArray.length - 1) : 0;
        const lightness = 30 + t * 55;
        fillOverride = `hsl(0, 100%, ${lightness}%)`;
      }
    }

    if (fillOverride) {
      visibleCircle.setAttribute("fill", fillOverride);
      visibleCircle.style.fill = fillOverride;
    }

    nodeGroup.appendChild(hitArea);
    nodeGroup.appendChild(visibleCircle);
    dotsGroup.appendChild(nodeGroup);
  });

  // Render Labels (always visible, never get erased)
  labelsGroup.innerHTML = '';
  if (state.showLabels) {
    pointsArray.forEach((p) => {
      const pos = gridToPixel(p.x, p.y);
      const textLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textLabel.setAttribute("x", pos.x);
      textLabel.setAttribute("y", pos.y);
      textLabel.setAttribute("class", "node-label");
      textLabel.textContent = p.char;

      textLabel.style.fontFamily = state.fontFamily;
      textLabel.style.fontSize = `${state.fontSize}px`;

      textLabel.setAttribute("text-anchor", "middle");
      textLabel.setAttribute("dominant-baseline", "central");

      labelsGroup.appendChild(textLabel);
    });
  }
}

// Animation Helper Functions
function toggleAnimation() {
  if (animationInterval) {
    stopAnimation();
  } else {
    startAnimation();
  }
}

function startAnimation() {
  btnAnimatePath.innerHTML = '<i data-lucide="square"></i> Stop';
  btnAnimatePath.classList.add('active');
  lucide.createIcons();

  animationInterval = true;
  runNextAnimationCycle();
}

function stopAnimation() {
  animationInterval = false;
  stopPathAnimation();
  btnAnimatePath.innerHTML = '<i data-lucide="play"></i> Animate';
  btnAnimatePath.classList.remove('active');
  lucide.createIcons();
}

function runNextAnimationCycle() {
  if (!animationInterval) return;

  triggerGenerativeStepDataOnly();
  updateVariationsGallery();

  if (chkAnimateDraw && chkAnimateDraw.checked) {
    // Animate the path drawing, then loop
    startPathAnimation(() => {
      runNextAnimationCycle();
    });
  } else {
    // Instantly render the new path, then schedule next cycle after the interval
    render();
    setTimeout(runNextAnimationCycle, state.animationIntervalMs);
  }
}

function triggerGenerativeStepDataOnly() {
  if (state.genTarget === 'position') {
    randomizeDotPositionsDataOnly();
  } else {
    shufflePointsDataOnly();
  }
}

function triggerGenerativeStep() {
  triggerGenerativeStepDataOnly();
  render();
  updateVariationsGallery();
}

function randomizeDotPositionsDataOnly() {
  const skipPoints = state.points.filter(p => p.labelPos === 'above');
  const labPoints = state.points.filter(p => p.labelPos === 'below');

  const mid = Math.ceil(state.points.length / 2);
  const group1 = skipPoints.length > 0 ? skipPoints : state.points.slice(0, mid);
  const group2 = labPoints.length > 0 ? labPoints : state.points.slice(mid);

  const midGrid = state.gridSize / 2;
  const yUpperMax = Math.floor(midGrid) - 1;
  const yLowerMin = Math.ceil(midGrid) + 1;

  let attempts = 0;
  let success = false;
  const backupCoords = state.points.map(p => ({ id: p.id, x: p.x, y: p.y }));

  while (attempts < 100 && !success) {
    const occupied = new Set();

    function getUniqueCoord(yMin, yMax) {
      let cellAttempts = 0;
      while (cellAttempts < 100) {
        const x = Math.floor(Math.random() * (state.gridSize - 1)) + 1;
        const y = Math.floor(Math.random() * (yMax - yMin + 1)) + yMin;
        const key = `${x},${y}`;
        if (!occupied.has(key)) {
          occupied.add(key);
          return { x, y };
        }
        cellAttempts++;
      }
      return { x: Math.floor(Math.random() * (state.gridSize - 1)) + 1, y: yMin };
    }

    group1.forEach(p => {
      const coords = getUniqueCoord(1, yUpperMax);
      p.x = coords.x;
      p.y = coords.y;
    });

    group2.forEach(p => {
      const coords = getUniqueCoord(yLowerMin, state.gridSize - 1);
      p.x = coords.x;
      p.y = coords.y;
    });

    const routed = getRoutedPoints(state.points, state.pathMode, false);
    let hasOverlap = false;
    for (let i = 0; i < routed.length - 1; i++) {
      if (lineCrossesAnyDot(routed[i], routed[i + 1], state.points)) {
        hasOverlap = true;
        break;
      }
    }

    if (!hasOverlap) {
      success = true;
    }
    attempts++;
  }

  if (!success) {
    state.points.forEach(p => {
      const backup = backupCoords.find(bc => bc.id === p.id);
      if (backup) {
        p.x = backup.x;
        p.y = backup.y;
      }
    });
  }

  recomputePathOrder(state.points, state.pathMode);
}

function randomizeDotPositions() {
  randomizeDotPositionsDataOnly();
  render();
  updateVariationsGallery();
}

function shufflePointsDataOnly() {
  state.pathMode = 'random';
  selectPathMode.value = 'random';
  recomputePathOrder(state.points, 'random');
}

function shufflePoints() {
  shufflePointsDataOnly();
  render();
  updateVariationsGallery();
}

function updatePatternUI() {
  const type = state.patternType;

  if (type === 'straight') {
    patternSettingsGroup.style.display = 'none';
    return;
  }

  patternSettingsGroup.style.display = 'flex';

  const waveCtrls = document.querySelectorAll('.wave-control');
  const arrowCtrls = document.querySelectorAll('.arrow-control');
  waveCtrls.forEach(el => el.style.display = 'none');
  arrowCtrls.forEach(el => el.style.display = 'none');

  document.getElementById('ctrl-pattern-count').style.display = 'flex';
  document.getElementById('ctrl-pattern-spacing').style.display = 'flex';

  if (type === 'circles') {
    lblPatternCount.textContent = 'Connecting Circles';
    lblPatternSpacing.textContent = 'Spacing Factor (unused)';
    document.getElementById('ctrl-pattern-spacing').style.display = 'none';
  } else if (type === 'wave') {
    waveCtrls.forEach(el => el.style.display = 'flex');
    lblPatternCount.textContent = 'Number of Lines';
    lblPatternSpacing.textContent = 'Spacing Factor (unused)';
    document.getElementById('ctrl-pattern-spacing').style.display = 'none';
  } else if (type === 'squiggly') {
    waveCtrls.forEach(el => el.style.display = 'flex');
    lblPatternCount.textContent = 'Squiggle Detail';
    lblPatternSpacing.textContent = 'Loop Size Factor';
  } else if (type === 'dna') {
    waveCtrls.forEach(el => el.style.display = 'flex');
    document.getElementById('ctrl-pattern-amplitude').style.display = 'none';
    lblPatternCount.textContent = 'Number of Strands';
    lblPatternSpacing.textContent = 'Spacing Factor (unused)';
    document.getElementById('ctrl-pattern-spacing').style.display = 'none';
  } else if (type === 'random-lines') {
    lblPatternCount.textContent = 'Number of Pills';
    lblPatternSpacing.textContent = 'Spacing Factor (unused)';
    document.getElementById('ctrl-pattern-spacing').style.display = 'none';
  } else if (type === 'dots') {
    lblPatternCount.textContent = 'Number of Dots';
    lblPatternSpacing.textContent = 'Spacing Factor (unused)';
    document.getElementById('ctrl-pattern-spacing').style.display = 'none';
  } else if (type === 'spring') {
    lblPatternCount.textContent = 'Number of Coils';
    lblPatternSpacing.textContent = 'Spacing Factor (unused)';
    document.getElementById('ctrl-pattern-spacing').style.display = 'none';
  } else if (type === 'pipe') {
    lblPatternCount.textContent = 'Number of Bubbles';
    lblPatternSpacing.textContent = 'Spacing Factor (unused)';
    document.getElementById('ctrl-pattern-spacing').style.display = 'none';
  } else if (type === 'pills') {
    lblPatternCount.textContent = 'Number of Pills';
    lblPatternSpacing.textContent = 'Spacing Factor (unused)';
    document.getElementById('ctrl-pattern-spacing').style.display = 'none';
  } else if (type === 'arrows') {
    arrowCtrls.forEach(el => el.style.display = 'flex');
    lblPatternCount.textContent = 'Number of Arrows';
    lblPatternSpacing.textContent = 'Spacing Factor (unused)';
    document.getElementById('ctrl-pattern-spacing').style.display = 'none';
  }
}

// Event Listeners Setup
function setupEventListeners() {
  // Connection Pattern Style Type Selection
  selectPatternType.addEventListener('change', (e) => {
    state.patternType = e.target.value;
    updatePatternUI();
    render();
  });

  rangePatternCount.addEventListener('input', (e) => {
    state.patternCount = parseInt(e.target.value);
    valPatternCount.textContent = state.patternCount;
    render();
  });

  rangePatternSpacing.addEventListener('input', (e) => {
    state.patternSpacing = parseFloat(e.target.value);
    valPatternSpacing.textContent = state.patternSpacing.toFixed(1);
    render();
  });

  rangePatternAmplitude.addEventListener('input', (e) => {
    state.patternAmplitude = parseInt(e.target.value);
    valPatternAmplitude.textContent = `${state.patternAmplitude}px`;
    render();
  });

  rangePatternFrequency.addEventListener('input', (e) => {
    state.patternFrequency = parseFloat(e.target.value);
    valPatternFrequency.textContent = state.patternFrequency.toFixed(1);
    render();
  });

  selectPatternArrowDir.addEventListener('change', (e) => {
    state.patternArrowDir = e.target.value;
    render();
  });

  // Initial update of Pattern UI
  updatePatternUI();
  // Update Lettering Text
  btnUpdateText.addEventListener('click', () => {
    stopAnimation();
    stopPathAnimation();
    const val = inputText.value.trim();
    if (val.length > 0) {
      state.text = val;
      resetPointsToDefault();
      recomputePathOrder(state.points, state.pathMode);
      render();
      updateVariationsGallery();
    }
  });

  inputText.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      btnUpdateText.click();
    }
  });

  // Path routing mode dropdown
  selectPathMode.addEventListener('change', (e) => {
    stopAnimation();
    stopPathAnimation();
    state.pathMode = e.target.value;
    recomputePathOrder(state.points, state.pathMode);
    render();
  });

  // Shuffle path points sequence (animated or instant depending on checkbox)
  btnShufflePath.addEventListener('click', () => {
    stopAnimation();
    triggerGenerativeStepDataOnly();
    updateVariationsGallery();
    if (chkAnimateDraw && chkAnimateDraw.checked) {
      startPathAnimation();
    } else {
      render();
    }
  });

  // Animation button
  btnAnimatePath.addEventListener('click', toggleAnimation);

  // Toggle Text Labels button
  btnToggleText.addEventListener('click', () => {
    state.showLabels = !state.showLabels;
    btnToggleText.classList.toggle('active', state.showLabels);
    render();
  });

  // Debug mode button
  btnToggleDebug.addEventListener('click', () => {
    state.debugMode = !state.debugMode;
    btnToggleDebug.classList.toggle('active', state.debugMode);
    render();
    updateVariationsGallery();
  });

  // Generative Target Radios
  radioGenTargets.forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.genTarget = e.target.value;
    });
  });

  // Animation speed slider
  rangeAnimationSpeed.addEventListener('input', (e) => {
    const sec = parseFloat(e.target.value);
    valAnimationSpeed.textContent = `${sec.toFixed(1)}s`;
    state.animationIntervalMs = sec * 1000;
  });

  // Stroke thickness slider
  rangeStrokeWidth.addEventListener('input', (e) => {
    state.strokeWidth = parseFloat(e.target.value);
    valStrokeWidth.textContent = `${state.strokeWidth}px`;
    render();
  });

  // Node handle size slider
  rangeDotRadius.addEventListener('input', (e) => {
    state.dotRadius = parseInt(e.target.value);
    valDotRadius.textContent = `${state.dotRadius}px`;
    render();
  });

  // Circle stroke thickness slider
  rangeDotStrokeWidth.addEventListener('input', (e) => {
    state.dotStrokeWidth = parseFloat(e.target.value);
    valDotStrokeWidth.textContent = `${state.dotStrokeWidth}px`;
    render();
  });

  // Typography font family selector
  selectFont.addEventListener('change', (e) => {
    state.fontFamily = e.target.value;
    render();
  });

  // Typography size selector
  rangeFontSize.addEventListener('input', (e) => {
    state.fontSize = parseInt(e.target.value);
    valFontSize.textContent = `${state.fontSize}px`;
    render();
  });

  // Grid size selector
  selectGridSize.addEventListener('change', (e) => {
    stopAnimation();
    stopPathAnimation();
    state.gridSize = parseInt(e.target.value);
    resetPointsToDefault();
    recomputePathOrder(state.points, state.pathMode);
    render();
    updateVariationsGallery();
  });

  // Toggle grid background visibility
  btnToggleGrid.addEventListener('click', () => {
    state.showGrid = !state.showGrid;
    btnToggleGrid.classList.toggle('active', state.showGrid);
    render();
  });

  // Reset nodes to default layout
  btnResetPoints.addEventListener('click', () => {
    stopAnimation();
    stopPathAnimation();
    resetPointsToDefault();
    state.pathMode = 'zigzag';
    selectPathMode.value = 'zigzag';
    recomputePathOrder(state.points, 'zigzag');
    render();
    updateVariationsGallery();
  });
}

// Start app on DOM load
window.addEventListener('DOMContentLoaded', init);
