/**
 * SKIP LAB - Generative Logo Designer
 * Core Application Logic - Light Theme & Straight Lines Only
 */

// Application State
const state = {
  gridSize: 8,
  text: "SKIP LAB",
  points: [],          // Active list of points: { id, char, x, y, labelPos }
  pathMode: 'zigzag',  // zigzag, tsp, ltr, random, entry
  strokeWidth: 4,
  dotRadius: 8,
  fontFamily: "'Outfit', sans-serif",
  fontSize: 28,
  showGrid: true,
  labelOffset: 25,
  activeDragId: null
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

// Init application
function init() {
  setupEventListeners();
  resetPointsToDefault();
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
  
  // Clamp to grid dimensions
  gridX = Math.max(0, Math.min(customGridSize, gridX));
  gridY = Math.max(0, Math.min(customGridSize, gridY));
  
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
      if (col <= gridSize) {
        points.push({ id: id++, char: w1[i], x: col, y: rowUpper, labelPos: 'above' });
      }
    }
    // Word 2 columns: 2, 4, 6, 8... labels are always BELOW
    for (let i = 0; i < w2.length; i++) {
      const col = 2 + i * 2;
      if (col <= gridSize) {
        points.push({ id: id++, char: w2[i], x: col, y: rowLower, labelPos: 'below' });
      }
    }
  } else {
    // Single word: interleave columns linearly, alternating labels above and below
    const word = words[0].toUpperCase();
    let id = 0;
    for (let i = 0; i < word.length; i++) {
      const col = 1 + i;
      if (col <= gridSize) {
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

// Sort points based on routing algorithm
function getRoutedPoints(pointsArray, mode = state.pathMode) {
  if (pointsArray.length <= 1) return [...pointsArray];

  switch (mode) {
    case 'zigzag':
      // Sort primarily by X. If X matches, sort by Y to form a vertical interleave
      return [...pointsArray].sort((a, b) => {
        if (a.x !== b.x) return a.x - b.x;
        return a.y - b.y;
      });
      
    case 'ltr':
      // Sorted directly from left to right (by x, then y)
      return [...pointsArray].sort((a, b) => {
        if (a.x !== b.x) return a.x - b.x;
        return a.y - b.y;
      });
      
    case 'tsp':
      // Traveling Salesperson Problem (Find shortest continuous tour visiting all nodes)
      return solveTSP(pointsArray);
      
    case 'random':
      // Returns points in state order (which gets shuffled via shuffle button)
      return [...pointsArray];
      
    case 'entry':
    default:
      // Sort by the original order they were inputted (ID sequence)
      return [...pointsArray].sort((a, b) => a.id - b.id);
  }
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
          dist += getDist(currentPath[i], currentPath[i+1]);
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
    length += Math.hypot(pixelPoints[i+1].x - pixelPoints[i].x, pixelPoints[i+1].y - pixelPoints[i].y);
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
    
    nodeGroup.appendChild(hitArea);
    nodeGroup.appendChild(visibleCircle);
    dotsGroup.appendChild(nodeGroup);
  });
  
  // 6. Render Labels (Letters - Constant Position relative to Dots)
  labelsGroup.innerHTML = '';
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
  
  // Update variable style properties in DOM
  document.documentElement.style.setProperty('--dot-radius', `${state.dotRadius}px`);
}

// Drag & Drop Handlers
function onDragStart(e) {
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
      variantPoints = [...state.points];
      // Generate a deterministic distinct shuffle for card preview
      const offset = v.mode === 'random_a' ? 2 : 4;
      for (let i = variantPoints.length - 1; i > 0; i--) {
        const j = (i + offset) % (i + 1);
        [variantPoints[i], variantPoints[j]] = [variantPoints[j], variantPoints[i]];
      }
    } else {
      variantPoints = getRoutedPoints(state.points, v.mode);
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
    variantPoints.forEach(p => {
      const pos = gridToPixel(p.x, p.y);
      const mCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      mCircle.setAttribute("cx", pos.x);
      mCircle.setAttribute("cy", pos.y);
      mCircle.setAttribute("r", "10");
      mCircle.setAttribute("fill", "var(--accent)");
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
        state.points = variantPoints; // Load this specific permutation
        state.pathMode = 'random';
        selectPathMode.value = 'random';
      } else {
        state.pathMode = v.mode;
        selectPathMode.value = v.mode;
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
    h.removeAttribute('class');
    h.setAttribute('fill', accent);
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
  
  img.onload = function() {
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
  
  shufflePoints();
  
  animationInterval = setInterval(() => {
    shufflePoints();
  }, 1000);
}

function stopAnimation() {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
  }
  btnAnimatePath.innerHTML = '<i data-lucide="play"></i> Animate';
  btnAnimatePath.classList.remove('active');
  lucide.createIcons();
}

function shufflePoints() {
  for (let i = state.points.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.points[i], state.points[j]] = [state.points[j], state.points[i]];
  }
  
  state.pathMode = 'random';
  selectPathMode.value = 'random';
  
  render();
  updateVariationsGallery();
}

// Event Listeners Setup
function setupEventListeners() {
  // Update Lettering Text
  btnUpdateText.addEventListener('click', () => {
    stopAnimation();
    const val = inputText.value.trim();
    if (val.length > 0) {
      state.text = val;
      resetPointsToDefault();
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
    if (e.target.value !== 'random') {
      stopAnimation();
    }
    state.pathMode = e.target.value;
    render();
  });
  
  // Shuffle path points sequence (only makes a visual difference in 'random' mode)
  btnShufflePath.addEventListener('click', () => {
    stopAnimation();
    shufflePoints();
  });

  // Animation button
  btnAnimatePath.addEventListener('click', toggleAnimation);
  
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
    state.gridSize = parseInt(e.target.value);
    resetPointsToDefault();
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
    resetPointsToDefault();
    state.pathMode = 'zigzag';
    selectPathMode.value = 'zigzag';
    render();
    updateVariationsGallery();
  });
}

// Start app on DOM load
window.addEventListener('DOMContentLoaded', init);
