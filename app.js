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
  dotRadius: 8,
  fontFamily: "'Outfit', sans-serif",
  fontSize: 28,
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
let dotScaleAmount = 0.08; // scaling of the dot

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

  // 3. Render Path (Straight lines only)
  const pathD = pixelPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  logoPath.setAttribute("d", pathD);
  logoPath.setAttribute("stroke-width", state.strokeWidth);

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

  // 6. Render Labels (Letters - Constant Position relative to Dots)
  labelsGroup.innerHTML = '';
  if (state.showLabels) {
    const labelPositions = getLabelPositions(routedPoints);

    routedPoints.forEach((p, i) => {
      const pos = labelPositions[i];
      const textLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textLabel.setAttribute("x", pos.x);
      textLabel.setAttribute("y", pos.y);
      textLabel.setAttribute("class", "node-label");
      textLabel.textContent = p.char;

      // Apply styling properties
      textLabel.style.fontFamily = state.fontFamily;
      textLabel.style.fontSize = `${state.fontSize}px`;

      // Position UP for 'above', DOWN for 'below'
      let dy = pos.dirY < 0 ? "-0.4em" : "0.9em";

      textLabel.setAttribute("text-anchor", "middle");
      textLabel.setAttribute("dy", dy);

      labelsGroup.appendChild(textLabel);
    });
  }

  // Update variable style properties in DOM
  document.documentElement.style.setProperty('--dot-radius', `${state.dotRadius}px`);
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

    // Render path (straight lines only)
    const pathD = pixelPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const mPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    mPath.setAttribute("d", pathD);
    mPath.setAttribute("fill", "none");
    mPath.setAttribute("stroke", "var(--accent)");
    mPath.setAttribute("stroke-width", "6");
    mPath.setAttribute("stroke-linecap", "round");
    mPath.setAttribute("stroke-linejoin", "round");
    miniSvg.appendChild(mPath);

    // Render points
    variantPoints.forEach((p, idx) => {
      const pos = gridToPixel(p.x, p.y);
      const mCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      mCircle.setAttribute("cx", pos.x);
      mCircle.setAttribute("cy", pos.y);
      mCircle.setAttribute("r", "10");

      let fillVal = "var(--accent)";
      if (state.debugMode && variantPoints.length > 0) {
        const t = variantPoints.length > 1 ? idx / (variantPoints.length - 1) : 0;
        const lightness = 30 + t * 55;
        fillVal = `hsl(0, 100%, ${lightness}%)`;
      }
      mCircle.setAttribute("fill", fillVal);
      miniSvg.appendChild(mCircle);
    });

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
    h.setAttribute('fill', customFill || accent);
    h.setAttribute('r', state.dotRadius);
  });

  const labels = clone.querySelectorAll('.node-label');
  labels.forEach(l => {
    l.removeAttribute('class');
    l.setAttribute('fill', text);
    l.style.fontFamily = state.fontFamily;
    l.style.fontSize = `${state.fontSize}px`;
    l.style.fontWeight = '500';
  });

  // Embed background color and default styling in exported SVG
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
    svg { background-color: ${bg}; }
    text { user-select: none; }
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
  let pathD = '';

  const speedFactor = state.animationIntervalMs / 1000.0;
  const currentPulseDuration = pathAnimation.pulseDuration * speedFactor;

  if (pathAnimation.state === 'drawing') {
    const pts = [];
    for (let i = 0; i <= pathAnimation.currentSegment; i++) {
      if (pixelPoints[i]) pts.push(pixelPoints[i]);
    }
    if (pathAnimation.currentSegment < numSegments) {
      const pStart = pixelPoints[pathAnimation.currentSegment];
      const pEnd = pixelPoints[pathAnimation.currentSegment + 1];
      if (pStart && pEnd) {
        const px = pStart.x + pathAnimation.progress * (pEnd.x - pStart.x);
        const py = pStart.y + pathAnimation.progress * (pEnd.y - pStart.y);
        pts.push({ x: px, y: py });
      }
    }
    pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }
  else if (pathAnimation.state === 'pause') {
    pathD = pixelPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }
  else if (pathAnimation.state === 'erasing') {
    const pts = [];
    if (pathAnimation.currentSegment < numSegments) {
      const pStart = pixelPoints[pathAnimation.currentSegment];
      const pEnd = pixelPoints[pathAnimation.currentSegment + 1];
      if (pStart && pEnd) {
        const px = pStart.x + pathAnimation.progress * (pEnd.x - pStart.x);
        const py = pStart.y + pathAnimation.progress * (pEnd.y - pStart.y);
        pts.push({ x: px, y: py });
      }
    }
    for (let i = pathAnimation.currentSegment + 1; i <= numSegments; i++) {
      if (pixelPoints[i]) pts.push(pixelPoints[i]);
    }
    pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }

  logoPath.setAttribute("d", pathD);
  logoPath.setAttribute("stroke-width", state.strokeWidth);
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
    const labelPositions = getLabelPositions(pointsArray);
    pointsArray.forEach((p, i) => {
      const pos = labelPositions[i];
      const textLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textLabel.setAttribute("x", pos.x);
      textLabel.setAttribute("y", pos.y);
      textLabel.setAttribute("class", "node-label");
      textLabel.textContent = p.char;

      textLabel.style.fontFamily = state.fontFamily;
      textLabel.style.fontSize = `${state.fontSize}px`;

      let dy = pos.dirY < 0 ? "-0.4em" : "0.9em";
      textLabel.setAttribute("text-anchor", "middle");
      textLabel.setAttribute("dy", dy);

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

// Event Listeners Setup
function setupEventListeners() {
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
