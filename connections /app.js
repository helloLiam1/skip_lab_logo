/**
 * SKIP LAB - Shape Halftone Experiment
 * Interactive canvas demonstrating randomly scattered shapes
 * that shrink and disappear around the letters of SKIP LAB.
 */

// Application State
const state = {
  fieldType: 'lines',            // 'lines' or 'circles'
  distribution: 'jittered-grid', // 'jittered-grid' or 'pure-random'
  density: 38,                   // grid cells (38x38)
  jitter: 14,                    // jitter amount in pixels
  randomCount: 1200,             // total circles in pure random mode
  baseCircleRadius: 5.5,
  influenceRadius: 85,
  deadZoneRadius: 35,
  showZones: false,
  connectLetters: true,
  letterFont: "'Space Grotesque', sans-serif",
  letterSize: 32,
  circleColor: '#000000',
  letterColor: '#000000',

  // Seven letter spots for S-K-I-P-L-A-B
  nodes: [
    { id: 0, char: 'S', x: 130, y: 400 },
    { id: 1, char: 'K', x: 220, y: 400 },
    { id: 2, char: 'I', x: 310, y: 400 },
    { id: 3, char: 'P', x: 400, y: 400 },
    { id: 4, char: 'L', x: 490, y: 400 },
    { id: 5, char: 'A', x: 580, y: 400 },
    { id: 6, char: 'B', x: 670, y: 400 }
  ],

  circleField: [],  // Stored stable circle locations to prevent flickering on drag
  activeDragId: null,
  dragOffset: { x: 0, y: 0 },
  gravityLineCount: 8,
  gravityLineWeight: 1.5,
  ramificationBranches: 3,
  ramificationNodes: [],
  ramificationConnections: [],
  mindmapNodes: [],
  mindmapConnections: [],
  mindmapTextCircleSize: 25,
  mindmapBlackCircleSize: 5,
  mindmapLineWeight: 2.0,
  ovalCount: 20,
  ovalHeight: 80,
  ovalWidth: 25,
  ovalWeight: 1.5,
  ovalTilt: 0,
  elCount: 20,
  elLength: 80,
  elTilt: 0,
  elWeight: 1.5,
  elHorizontal: false,
  riverWidth: 30,
  riverIntensity: 1.5,
  swirlCount: 5,
  swirlSpread: 10,
  swirlCurviness: 60,
  swirlWeight: 1.5
};

// Helper to get active nodes based on connection mode
function getActiveNodes() {
  if (state.fieldType === 'ramification') return state.ramificationNodes;
  if (state.fieldType === 'mindmap') return state.mindmapNodes;
  return state.nodes;
}

/// Generate the mindmap tree structure dynamically with high randomness
function generateMindmapTree() {
  const newNodes = [];
  const connections = [];

  const cols = state.density;
  const rows = state.density;

  const startX = CANVAS_PADDING;
  const endX = CANVAS_SIZE - CANVAS_PADDING;
  const startY = CANVAS_PADDING;
  const endY = CANVAS_SIZE - CANVAS_PADDING;

  const stepX = (endX - startX) / (cols - 1);
  const stepY = (endY - startY) / (rows - 1);

  const occupied = new Set();

  function addNode(x, y) {
    let c = Math.round((x - startX) / stepX);
    let r = Math.round((y - startY) / stepY);
    c = Math.max(0, Math.min(cols - 1, c));
    r = Math.max(0, Math.min(rows - 1, r));

    let radius = 0;
    let found = false;
    while (radius < Math.max(cols, rows)) {
      for (let dc = -radius; dc <= radius; dc++) {
        for (let dr = -radius; dr <= radius; dr++) {
          if (Math.abs(dc) !== radius && Math.abs(dr) !== radius) continue;
          const tc = c + dc;
          const tr = r + dr;
          if (tc >= 0 && tc < cols && tr >= 0 && tr < rows) {
            const key = `${tc},${tr}`;
            if (!occupied.has(key)) {
              c = tc;
              r = tr;
              occupied.add(key);
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }
      if (found) break;
      radius++;
    }

    const finalX = startX + c * stepX;
    const finalY = startY + r * stepY;
    const node = {
      id: newNodes.length,
      x: finalX,
      y: finalY,
      isText: false,
      char: ''
    };
    newNodes.push(node);
    return node;
  }

  // Center root
  const root = addNode(400, 400);

  // Generate total nodes randomly (23 to 30 nodes)
  const targetCount = 23 + Math.floor(Math.random() * 8);

  for (let i = 0; i < targetCount; i++) {
    const rx = CANVAS_PADDING + Math.random() * (CANVAS_SIZE - 2 * CANVAS_PADDING);
    const ry = CANVAS_PADDING + Math.random() * (CANVAS_SIZE - 2 * CANVAS_PADDING);
    addNode(rx, ry);
  }

  // Connect neighbors by proximity
  for (let i = 1; i < newNodes.length; i++) {
    const node = newNodes[i];
    let nearestNode = null;
    let nearestDist = Infinity;

    for (let j = 0; j < newNodes.length; j++) {
      if (i === j) continue;
      const dist = Math.hypot(node.x - newNodes[j].x, node.y - newNodes[j].y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestNode = newNodes[j];
      }
    }

    if (nearestNode) {
      connections.push([node.id, nearestNode.id]);
    }
  }

  // Connect 2nd nearest neighbor with probability for forks
  for (let i = 0; i < newNodes.length; i++) {
    const node = newNodes[i];
    const neighbors = [];

    for (let j = 0; j < newNodes.length; j++) {
      if (i === j) continue;
      const dist = Math.hypot(node.x - newNodes[j].x, node.y - newNodes[j].y);
      neighbors.push({ id: newNodes[j].id, dist });
    }

    neighbors.sort((a, b) => a.dist - b.dist);

    if (neighbors.length > 1 && neighbors[1].dist < 220) {
      const alreadyConnected = connections.some(c => (c[0] === node.id && c[1] === neighbors[1].id) || (c[1] === node.id && c[0] === neighbors[1].id));
      if (!alreadyConnected && Math.random() < 0.75) {
        connections.push([node.id, neighbors[1].id]);
      }
    }
  }

  // Add dynamic cross-links (4 to 8 links)
  let extraCount = 0;
  const maxExtra = 4 + Math.floor(Math.random() * 5);
  const nodeIndices = Array.from({ length: newNodes.length }, (_, i) => i)
    .sort(() => Math.random() - 0.5);

  for (let idx1 = 0; idx1 < nodeIndices.length; idx1++) {
    for (let idx2 = idx1 + 1; idx2 < nodeIndices.length; idx2++) {
      const idA = nodeIndices[idx1];
      const idB = nodeIndices[idx2];
      const nA = newNodes[idA];
      const nB = newNodes[idB];

      const dist = Math.hypot(nA.x - nB.x, nA.y - nB.y);
      if (dist > 100 && dist < 240) {
        const alreadyConnected = connections.some(c => (c[0] === idA && c[1] === idB) || (c[1] === idA && c[0] === idB));
        if (!alreadyConnected && Math.random() < 0.25 && extraCount < maxExtra) {
          connections.push([idA, idB]);
          extraCount++;
        }
      }
    }
  }

  // Randomly assign 7 letters S-K-I-P-L-A-B
  if (newNodes.length >= 7) {
    const letters = ['S', 'K', 'I', 'P', 'L', 'A', 'B'];
    const indices = Array.from({ length: newNodes.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    for (let i = 0; i < 7; i++) {
      const idx = indices[i];
      newNodes[idx].isText = true;
      newNodes[idx].char = letters[i];
    }
  }

  state.mindmapNodes = newNodes;
  state.mindmapConnections = connections;
}

// Generate the ramification tree structure dynamically
function generateRamificationTree() {
  const newNodes = [];
  const connections = [];

  const cols = state.density;
  const rows = state.density;

  const startX = CANVAS_PADDING;
  const endX = CANVAS_SIZE - CANVAS_PADDING;
  const startY = CANVAS_PADDING;
  const endY = CANVAS_SIZE - CANVAS_PADDING;

  const stepX = (endX - startX) / (cols - 1);
  const stepY = (endY - startY) / (rows - 1);

  const occupied = new Set();

  function addNode(x, y) {
    let c = Math.round((x - startX) / stepX);
    let r = Math.round((y - startY) / stepY);
    c = Math.max(0, Math.min(cols - 1, c));
    r = Math.max(0, Math.min(rows - 1, r));

    // Spiral search outward to prevent overlaps on the grid
    let radius = 0;
    let found = false;
    while (radius < Math.max(cols, rows)) {
      for (let dc = -radius; dc <= radius; dc++) {
        for (let dr = -radius; dr <= radius; dr++) {
          if (Math.abs(dc) !== radius && Math.abs(dr) !== radius) continue;
          const tc = c + dc;
          const tr = r + dr;
          if (tc >= 0 && tc < cols && tr >= 0 && tr < rows) {
            const key = `${tc},${tr}`;
            if (!occupied.has(key)) {
              c = tc;
              r = tr;
              occupied.add(key);
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }
      if (found) break;
      radius++;
    }

    const finalX = startX + c * stepX;
    const finalY = startY + r * stepY;
    const node = {
      id: newNodes.length,
      x: finalX,
      y: finalY,
      isText: false,
      char: ''
    };
    newNodes.push(node);
    return node;
  }

  // Create organic tree starting from a slightly randomized center
  const rootX = 400 + (Math.random() - 0.5) * 60;
  const rootY = 400 + (Math.random() - 0.5) * 60;
  const root = addNode(rootX, rootY);

  const numPrimary = state.ramificationBranches + 1; // 2 to 6 primary spokes
  const primaryNodes = [];

  for (let i = 0; i < numPrimary; i++) {
    // Large random range for angle to create distinct branch directions
    const angle = (i / numPrimary) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
    // Vary the distances widely (from 90 to 220 px)
    const dist = 90 + Math.random() * 130;

    const px = root.x + dist * Math.cos(angle);
    const py = root.y + dist * Math.sin(angle);
    const pNode = addNode(px, py);
    primaryNodes.push(pNode);
    connections.push([root.id, pNode.id]);
  }

  // Secondary branches: 2 from each primary branch
  const secondaryNodes = [];
  primaryNodes.forEach(pNode => {
    const angleBase = Math.atan2(pNode.y - root.y, pNode.x - root.x);
    for (let i = 0; i < 2; i++) {
      // Substantial randomize offset for angle and distance
      const angleOffset = 0.4 + Math.random() * 0.8;
      const angle = angleBase + (i === 0 ? -angleOffset : angleOffset) + (Math.random() - 0.5) * 0.25;
      const dist = 65 + Math.random() * 80;

      const sx = pNode.x + dist * Math.cos(angle);
      const sy = pNode.y + dist * Math.sin(angle);
      const sNode = addNode(sx, sy);
      secondaryNodes.push(sNode);
      connections.push([pNode.id, sNode.id]);
    }
  });

  // Tertiary/leaf nodes: 2 from each secondary branch
  secondaryNodes.forEach(sNode => {
    const parentId = connections.find(c => c[1] === sNode.id)?.[0];
    const parentNode = parentId !== undefined ? newNodes[parentId] : root;
    const angleBase = Math.atan2(sNode.y - parentNode.y, sNode.x - parentNode.x);
    for (let i = 0; i < 2; i++) {
      const angleOffset = 0.5 + Math.random() * 0.9;
      const angle = angleBase + (i === 0 ? -angleOffset : angleOffset) + (Math.random() - 0.5) * 0.25;
      const dist = 45 + Math.random() * 55;

      const lx = sNode.x + dist * Math.cos(angle);
      const ly = sNode.y + dist * Math.sin(angle);
      const lNode = addNode(lx, ly);
      connections.push([sNode.id, lNode.id]);
    }
  });

  // Ensure we have at least 7 nodes to assign letters
  if (newNodes.length >= 7) {
    const letters = ['S', 'K', 'I', 'P', 'L', 'A', 'B'];
    const indices = Array.from({ length: newNodes.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    for (let i = 0; i < 7; i++) {
      const idx = indices[i];
      newNodes[idx].isText = true;
      newNodes[idx].char = letters[i];
    }
  }

  state.ramificationNodes = newNodes;
  state.ramificationConnections = connections;
}

// Canvas configuration
const CANVAS_SIZE = 800;
const CANVAS_PADDING = 30; // Margin from canvas edges for circle distribution

// DOM Elements
const svgEl = document.getElementById('halftone-svg');
const bgCirclesGroup = document.getElementById('bg-circles');
const influenceCirclesGroup = document.getElementById('influence-circles');
const connectionPathEl = document.getElementById('connection-path');
const letterNodesGroup = document.getElementById('letter-nodes');
const coordInfoEl = document.getElementById('coord-info');

// Input Controls
const btnPresetHorizontal = document.getElementById('btn-preset-horizontal');
const btnPresetCircular = document.getElementById('btn-preset-circular');
const btnPresetWave = document.getElementById('btn-preset-wave');
const btnPresetRandom = document.getElementById('btn-preset-random');
const btnRandomizeNodes = document.getElementById('btn-randomize-nodes');
const btnRandomizeLetters = document.getElementById('btn-randomize-letters');

const selectFieldType = document.getElementById('select-field-type');
const selectDistribution = document.getElementById('select-distribution');
const groupDensity = document.getElementById('group-density');
const valDensity = document.getElementById('val-density');
const rangeDensity = document.getElementById('range-density');

const groupJitter = document.getElementById('group-jitter');
const valJitter = document.getElementById('val-jitter');
const rangeJitter = document.getElementById('range-jitter');

const groupRandomCount = document.getElementById('group-random-count');
const valRandomCount = document.getElementById('val-random-count');
const rangeRandomCount = document.getElementById('range-random-count');

const valBaseRadius = document.getElementById('val-base-radius');
const rangeBaseRadius = document.getElementById('range-base-radius');

const valInfluence = document.getElementById('val-influence');
const rangeInfluence = document.getElementById('range-influence');

const valDeadZone = document.getElementById('val-dead-zone');
const rangeDeadZone = document.getElementById('range-dead-zone');

const chkShowZones = document.getElementById('chk-show-zones');
const chkConnectLetters = document.getElementById('chk-connect-letters');

const groupGravityLines = document.getElementById('group-gravity-lines');
const valGravityLines = document.getElementById('val-gravity-lines');
const rangeGravityLines = document.getElementById('range-gravity-lines');

const groupGravityWeight = document.getElementById('group-gravity-weight');
const valGravityWeight = document.getElementById('val-gravity-weight');
const rangeGravityWeight = document.getElementById('range-gravity-weight');

const groupRamificationBranches = document.getElementById('group-ramification-branches');
const valRamificationBranches = document.getElementById('val-ramification-branches');
const rangeRamificationBranches = document.getElementById('range-ramification-branches');

const groupMindmapTextSize = document.getElementById('group-mindmap-text-size');
const valMindmapTextSize = document.getElementById('val-mindmap-text-size');
const rangeMindmapTextSize = document.getElementById('range-mindmap-text-size');

const groupMindmapBlackSize = document.getElementById('group-mindmap-black-size');
const valMindmapBlackSize = document.getElementById('val-mindmap-black-size');
const rangeMindmapBlackSize = document.getElementById('range-mindmap-black-size');

const groupMindmapWeight = document.getElementById('group-mindmap-weight');
const valMindmapWeight = document.getElementById('val-mindmap-weight');
const rangeMindmapWeight = document.getElementById('range-mindmap-weight');

const groupOvalCount = document.getElementById('group-oval-count');
const valOvalCount = document.getElementById('val-oval-count');
const rangeOvalCount = document.getElementById('range-oval-count');

const groupOvalHeight = document.getElementById('group-oval-height');
const valOvalHeight = document.getElementById('val-oval-height');
const rangeOvalHeight = document.getElementById('range-oval-height');

const groupOvalWidth = document.getElementById('group-oval-width');
const valOvalWidth = document.getElementById('val-oval-width');
const rangeOvalWidth = document.getElementById('range-oval-width');

const groupOvalTilt = document.getElementById('group-oval-tilt');
const valOvalTilt = document.getElementById('val-oval-tilt');
const rangeOvalTilt = document.getElementById('range-oval-tilt');

const groupOvalWeight = document.getElementById('group-oval-weight');
const valOvalWeight = document.getElementById('val-oval-weight');
const rangeOvalWeight = document.getElementById('range-oval-weight');

const groupElCount = document.getElementById('group-el-count');
const valElCount = document.getElementById('val-el-count');
const rangeElCount = document.getElementById('range-el-count');

const groupElLength = document.getElementById('group-el-length');
const valElLength = document.getElementById('val-el-length');
const rangeElLength = document.getElementById('range-el-length');

const groupElTilt = document.getElementById('group-el-tilt');
const valElTilt = document.getElementById('val-el-tilt');
const rangeElTilt = document.getElementById('range-el-tilt');

const groupElWeight = document.getElementById('group-el-weight');
const valElWeight = document.getElementById('val-el-weight');
const rangeElWeight = document.getElementById('range-el-weight');

const groupElHorizontal = document.getElementById('group-el-horizontal');
const btnElVertical = document.getElementById('btn-el-vertical');
const btnElHorizontal = document.getElementById('btn-el-horizontal');

const groupSwirlCount = document.getElementById('group-swirl-count');
const valSwirlCount = document.getElementById('val-swirl-count');
const rangeSwirlCount = document.getElementById('range-swirl-count');

const groupSwirlSpread = document.getElementById('group-swirl-spread');
const valSwirlSpread = document.getElementById('val-swirl-spread');
const rangeSwirlSpread = document.getElementById('range-swirl-spread');

const groupSwirlCurviness = document.getElementById('group-swirl-curviness');
const valSwirlCurviness = document.getElementById('val-swirl-curviness');
const rangeSwirlCurviness = document.getElementById('range-swirl-curviness');

const groupSwirlWeight = document.getElementById('group-swirl-weight');
const valSwirlWeight = document.getElementById('val-swirl-weight');
const rangeSwirlWeight = document.getElementById('range-swirl-weight');

const groupRiverWidth = document.getElementById('group-river-width');
const valRiverWidth = document.getElementById('val-river-width');
const rangeRiverWidth = document.getElementById('range-river-width');

const groupRiverIntensity = document.getElementById('group-river-intensity');
const valRiverIntensity = document.getElementById('val-river-intensity');
const rangeRiverIntensity = document.getElementById('range-river-intensity');

const selectFont = document.getElementById('select-font');
const valFontSize = document.getElementById('val-font-size');
const rangeFontSize = document.getElementById('range-font-size');

const colorCircles = document.getElementById('color-circles');
const valColorCircles = document.getElementById('val-color-circles');
const colorLetters = document.getElementById('color-letters');
const valColorLetters = document.getElementById('val-color-letters');

const btnExportSvg = document.getElementById('btn-export-svg');
const btnExportPng = document.getElementById('btn-export-png');

// Initialize application
function init() {
  setupEventListeners();
  generateCircleField();
  updateConnectionControlsVisibility();
  applyPreset('horizontal'); // set initial positions
}

// Setup all event handlers
function setupEventListeners() {
  // Presets
  btnPresetHorizontal.addEventListener('click', () => applyPreset('horizontal'));
  btnPresetCircular.addEventListener('click', () => applyPreset('circular'));
  btnPresetWave.addEventListener('click', () => applyPreset('wave'));
  btnPresetRandom.addEventListener('click', () => applyPreset('random'));

  // Scramble letters randomly
  btnRandomizeLetters.addEventListener('click', () => {
    randomizeLetterPositions();
  });

  // Randomize / Jitter nodes
  btnRandomizeNodes.addEventListener('click', () => {
    // Generate new stable circle coordinates
    generateCircleField();
    render();
  });

  // Connection type selection
  selectFieldType.addEventListener('change', (e) => {
    state.fieldType = e.target.value;
    updateConnectionControlsVisibility();
    if (state.fieldType === 'ramification') {
      generateRamificationTree();
    } else if (state.fieldType === 'mindmap') {
      generateMindmapTree();
    }
    render();
  });

  // Distribution selection
  selectDistribution.addEventListener('change', (e) => {
    state.distribution = e.target.value;
    if (state.distribution === 'jittered-grid') {
      groupDensity.style.display = 'flex';
      groupJitter.style.display = 'flex';
      groupRandomCount.style.display = 'none';
    } else {
      groupDensity.style.display = 'none';
      groupJitter.style.display = 'none';
      groupRandomCount.style.display = 'flex';
    }
    generateCircleField();
    render();
  });

  // Density Slider
  rangeDensity.addEventListener('input', (e) => {
    state.density = parseInt(e.target.value);
    valDensity.textContent = `${state.density}x${state.density}`;

    // Re-snap existing nodes to the new grid density (resolving overlaps)
    const oldCoords = state.nodes.map(n => ({ id: n.id, x: n.x, y: n.y }));
    state.nodes.forEach(node => { node.x = -1000; node.y = -1000; });
    oldCoords.forEach(old => {
      const node = state.nodes.find(n => n.id === old.id);
      const snapped = findNearestFreeIntersection(old.x, old.y, old.id);
      node.x = snapped.x;
      node.y = snapped.y;
    });

    generateCircleField();
    render();
  });

  // Jitter Slider
  rangeJitter.addEventListener('input', (e) => {
    state.jitter = parseInt(e.target.value);
    valJitter.textContent = `${state.jitter}px`;
    generateCircleField();
    render();
  });

  // Random Count Slider
  rangeRandomCount.addEventListener('input', (e) => {
    state.randomCount = parseInt(e.target.value);
    valRandomCount.textContent = state.randomCount;
    generateCircleField();
    render();
  });

  // Base Circle Size Slider
  rangeBaseRadius.addEventListener('input', (e) => {
    state.baseCircleRadius = parseFloat(e.target.value);
    valBaseRadius.textContent = `${state.baseCircleRadius}px`;
    render();
  });

  // Influence Size Slider
  rangeInfluence.addEventListener('input', (e) => {
    state.influenceRadius = parseInt(e.target.value);
    valInfluence.textContent = `${state.influenceRadius}px`;
    render();
  });

  // Dead Zone Size Slider
  rangeDeadZone.addEventListener('input', (e) => {
    state.deadZoneRadius = parseInt(e.target.value);
    valDeadZone.textContent = `${state.deadZoneRadius}px`;
    render();
  });

  // Toggles
  chkShowZones.addEventListener('change', (e) => {
    state.showZones = e.target.checked;
    influenceCirclesGroup.style.display = state.showZones ? 'block' : 'none';
    render();
  });

  chkConnectLetters.addEventListener('change', (e) => {
    state.connectLetters = e.target.checked;
    render();
  });

  rangeGravityLines.addEventListener('input', (e) => {
    state.gravityLineCount = parseInt(e.target.value);
    valGravityLines.textContent = state.gravityLineCount;
    render();
  });

  rangeGravityWeight.addEventListener('input', (e) => {
    state.gravityLineWeight = parseFloat(e.target.value);
    valGravityWeight.textContent = `${state.gravityLineWeight}px`;
    render();
  });

  rangeRamificationBranches.addEventListener('input', (e) => {
    state.ramificationBranches = parseInt(e.target.value);
    valRamificationBranches.textContent = state.ramificationBranches;
    if (state.fieldType === 'ramification') {
      generateRamificationTree();
    } else if (state.fieldType === 'mindmap') {
      generateMindmapTree();
    }
    render();
  });

  rangeMindmapTextSize.addEventListener('input', (e) => {
    state.mindmapTextCircleSize = parseInt(e.target.value);
    valMindmapTextSize.textContent = `${state.mindmapTextCircleSize}px`;
    render();
  });

  rangeMindmapBlackSize.addEventListener('input', (e) => {
    state.mindmapBlackCircleSize = parseInt(e.target.value);
    valMindmapBlackSize.textContent = `${state.mindmapBlackCircleSize}px`;
    render();
  });

  rangeMindmapWeight.addEventListener('input', (e) => {
    state.mindmapLineWeight = parseFloat(e.target.value);
    valMindmapWeight.textContent = `${state.mindmapLineWeight}px`;
    render();
  });

  rangeOvalCount.addEventListener('input', (e) => {
    state.ovalCount = parseInt(e.target.value);
    valOvalCount.textContent = state.ovalCount;
    render();
  });

  rangeOvalHeight.addEventListener('input', (e) => {
    state.ovalHeight = parseInt(e.target.value);
    valOvalHeight.textContent = `${state.ovalHeight}px`;
    render();
  });

  rangeOvalWidth.addEventListener('input', (e) => {
    state.ovalWidth = parseInt(e.target.value);
    valOvalWidth.textContent = `${state.ovalWidth}px`;
    render();
  });

  rangeOvalTilt.addEventListener('input', (e) => {
    state.ovalTilt = parseInt(e.target.value);
    valOvalTilt.textContent = `${state.ovalTilt}°`;
    render();
  });

  rangeOvalWeight.addEventListener('input', (e) => {
    state.ovalWeight = parseFloat(e.target.value);
    valOvalWeight.textContent = `${state.ovalWeight}px`;
    render();
  });

  rangeElCount.addEventListener('input', (e) => {
    state.elCount = parseInt(e.target.value);
    valElCount.textContent = state.elCount;
    render();
  });

  rangeElLength.addEventListener('input', (e) => {
    state.elLength = parseInt(e.target.value);
    valElLength.textContent = `${state.elLength}px`;
    render();
  });

  rangeElTilt.addEventListener('input', (e) => {
    state.elTilt = parseInt(e.target.value);
    valElTilt.textContent = `${state.elTilt}°`;
    render();
  });

  rangeElWeight.addEventListener('input', (e) => {
    state.elWeight = parseFloat(e.target.value);
    valElWeight.textContent = `${state.elWeight.toFixed(1)}px`;
    render();
  });

  rangeSwirlCount.addEventListener('input', (e) => {
    state.swirlCount = parseInt(e.target.value);
    valSwirlCount.textContent = state.swirlCount;
    render();
  });

  rangeSwirlSpread.addEventListener('input', (e) => {
    state.swirlSpread = parseInt(e.target.value);
    valSwirlSpread.textContent = `${state.swirlSpread}px`;
    render();
  });

  rangeSwirlCurviness.addEventListener('input', (e) => {
    state.swirlCurviness = parseInt(e.target.value);
    valSwirlCurviness.textContent = `${state.swirlCurviness}px`;
    render();
  });

  rangeSwirlWeight.addEventListener('input', (e) => {
    state.swirlWeight = parseFloat(e.target.value);
    valSwirlWeight.textContent = `${state.swirlWeight.toFixed(1)}px`;
    render();
  });

  btnElVertical.addEventListener('click', () => {
    state.elHorizontal = false;
    btnElVertical.classList.add('active');
    btnElHorizontal.classList.remove('active');
    render();
  });

  btnElHorizontal.addEventListener('click', () => {
    state.elHorizontal = true;
    btnElHorizontal.classList.add('active');
    btnElVertical.classList.remove('active');
    render();
  });

  rangeRiverWidth.addEventListener('input', (e) => {
    state.riverWidth = parseInt(e.target.value);
    valRiverWidth.textContent = `${state.riverWidth}px`;
    render();
  });

  rangeRiverIntensity.addEventListener('input', (e) => {
    state.riverIntensity = parseFloat(e.target.value);
    valRiverIntensity.textContent = `${state.riverIntensity.toFixed(1)}x`;
    render();
  });

  // Font and Colors
  selectFont.addEventListener('change', (e) => {
    state.letterFont = e.target.value;
    render();
  });

  rangeFontSize.addEventListener('input', (e) => {
    state.letterSize = parseInt(e.target.value);
    valFontSize.textContent = `${state.letterSize}px`;
    render();
  });

  colorCircles.addEventListener('input', (e) => {
    state.circleColor = e.target.value;
    valColorCircles.textContent = state.circleColor.toUpperCase();
    render();
  });

  colorLetters.addEventListener('input', (e) => {
    state.letterColor = e.target.value;
    valColorLetters.textContent = state.letterColor.toUpperCase();
    render();
  });

  // Exports
  btnExportSvg.addEventListener('click', exportSVG);
  btnExportPng.addEventListener('click', exportPNG);
}

// Show/hide connection mode specific controls in sidebar
function updateConnectionControlsVisibility() {
  const allGroups = [
    groupGravityLines, groupGravityWeight,
    groupRamificationBranches,
    groupMindmapTextSize, groupMindmapBlackSize, groupMindmapWeight,
    groupOvalCount, groupOvalHeight, groupOvalWidth, groupOvalTilt, groupOvalWeight,
    groupElCount, groupElLength, groupElTilt, groupElWeight, groupElHorizontal,
    groupRiverWidth, groupRiverIntensity,
    groupSwirlCount, groupSwirlSpread, groupSwirlCurviness, groupSwirlWeight
  ];
  allGroups.forEach(g => g.style.display = 'none');

  if (state.fieldType === 'gravity') {
    groupGravityLines.style.display = 'flex';
    groupGravityWeight.style.display = 'flex';
  } else if (state.fieldType === 'ramification') {
    groupRamificationBranches.style.display = 'flex';
  } else if (state.fieldType === 'mindmap') {
    groupMindmapTextSize.style.display = 'flex';
    groupMindmapBlackSize.style.display = 'flex';
    groupMindmapWeight.style.display = 'flex';
  } else if (state.fieldType === 'ovals') {
    groupOvalCount.style.display = 'flex';
    groupOvalHeight.style.display = 'flex';
    groupOvalWidth.style.display = 'flex';
    groupOvalTilt.style.display = 'flex';
    groupOvalWeight.style.display = 'flex';
  } else if (state.fieldType === 'evolving-lines') {
    groupElCount.style.display = 'flex';
    groupElLength.style.display = 'flex';
    groupElTilt.style.display = 'flex';
    groupElWeight.style.display = 'flex';
    groupElHorizontal.style.display = 'flex';
  } else if (state.fieldType === 'lines' || state.fieldType === 'circles') {
    groupRiverWidth.style.display = 'flex';
    groupRiverIntensity.style.display = 'flex';
  } else if (state.fieldType === 'swirl') {
    groupSwirlCount.style.display = 'flex';
    groupSwirlCurviness.style.display = 'flex';
    groupSwirlWeight.style.display = 'flex';
  }
}

// Spiral search to find the closest grid intersection that is not occupied by other nodes
function findNearestFreeIntersection(pixelX, pixelY, excludeNodeId) {
  const cols = state.density;
  const rows = state.density;

  const startX = CANVAS_PADDING;
  const endX = CANVAS_SIZE - CANVAS_PADDING;
  const startY = CANVAS_PADDING;
  const endY = CANVAS_SIZE - CANVAS_PADDING;

  const stepX = (endX - startX) / (cols - 1);
  const stepY = (endY - startY) / (rows - 1);

  let c = Math.round((pixelX - startX) / stepX);
  let r = Math.round((pixelY - startY) / stepY);

  c = Math.max(0, Math.min(cols - 1, c));
  r = Math.max(0, Math.min(rows - 1, r));

  // Helper to check if a physical position is free of overlaps
  const isPositionFree = (tx, ty) => {
    return !getActiveNodes().some(n => {
      if (n.id === excludeNodeId) return false;
      const r1 = state.fieldType === 'mindmap' ? Math.max(state.mindmapTextCircleSize, state.mindmapBlackCircleSize) : 25;
      const r2 = state.fieldType === 'mindmap' ? Math.max(state.mindmapTextCircleSize, state.mindmapBlackCircleSize) : 25;
      const minDist = r1 + r2 + 4; // Radii sum + padding
      return Math.hypot(n.x - tx, n.y - ty) < minDist;
    });
  };

  // Quick check: if the snapped intersection is already free, return it immediately
  if (isPositionFree(startX + c * stepX, startY + r * stepY)) {
    return { x: startX + c * stepX, y: startY + r * stepY };
  }

  // Spiral search outwards
  let radius = 1;
  const maxRadius = Math.max(cols, rows);

  while (radius < maxRadius) {
    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        // Only inspect the border of the square at this radius
        if (Math.abs(dc) !== radius && Math.abs(dr) !== radius) continue;

        const targetC = c + dc;
        const targetR = r + dr;

        if (targetC >= 0 && targetC < cols && targetR >= 0 && targetR < rows) {
          const tx = startX + targetC * stepX;
          const ty = startY + targetR * stepY;

          if (isPositionFree(tx, ty)) {
            return { x: tx, y: ty };
          }
        }
      }
    }
    radius++;
  }

  // Fallback
  return { x: startX + c * stepX, y: startY + r * stepY };
}

// Generate the coordinates for circles in background based on settings
// Stored in state.circleField to avoid flickering/randomizing coordinates on node drags
function generateCircleField() {
  state.circleField = [];

  if (state.distribution === 'jittered-grid') {
    const cols = state.density;
    const rows = state.density;

    const startX = CANVAS_PADDING;
    const endX = CANVAS_SIZE - CANVAS_PADDING;
    const startY = CANVAS_PADDING;
    const endY = CANVAS_SIZE - CANVAS_PADDING;

    const stepX = (endX - startX) / (cols - 1);
    const stepY = (endY - startY) / (rows - 1);

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        // Base grid center coordinate
        const baseX = startX + c * stepX;
        const baseY = startY + r * stepY;

        // Add random scatter jitter
        const jitterX = (Math.random() - 0.5) * state.jitter * 2;
        const jitterY = (Math.random() - 0.5) * state.jitter * 2;

        const finalX = Math.max(0, Math.min(CANVAS_SIZE, baseX + jitterX));
        const finalY = Math.max(0, Math.min(CANVAS_SIZE, baseY + jitterY));

        state.circleField.push({ x: finalX, y: finalY });
      }
    }
  } else {
    // Pure Random Distribution
    const count = state.randomCount;
    for (let i = 0; i < count; i++) {
      const rx = CANVAS_PADDING + Math.random() * (CANVAS_SIZE - 2 * CANVAS_PADDING);
      const ry = CANVAS_PADDING + Math.random() * (CANVAS_SIZE - 2 * CANVAS_PADDING);
      state.circleField.push({ x: rx, y: ry });
    }
  }
}

// Snap coordinates to nearest background grid intersection
function snapNodeToGrid(pixelX, pixelY) {
  const cols = state.density;
  const rows = state.density;

  const startX = CANVAS_PADDING;
  const endX = CANVAS_SIZE - CANVAS_PADDING;
  const startY = CANVAS_PADDING;
  const endY = CANVAS_SIZE - CANVAS_PADDING;

  const stepX = (endX - startX) / (cols - 1);
  const stepY = (endY - startY) / (rows - 1);

  let c = Math.round((pixelX - startX) / stepX);
  let r = Math.round((pixelY - startY) / stepY);

  c = Math.max(0, Math.min(cols - 1, c));
  r = Math.max(0, Math.min(rows - 1, r));

  return {
    x: startX + c * stepX,
    y: startY + r * stepY
  };
}

// Apply one of the layout presets to letter nodes
function applyPreset(presetName) {
  // Reset active classes
  document.querySelectorAll('.btn-preset').forEach(btn => btn.classList.remove('active'));

  if (state.fieldType === 'ramification') {
    generateRamificationTree();
    render();
    return;
  } else if (state.fieldType === 'mindmap') {
    generateMindmapTree();
    render();
    return;
  }

  // Clear positions first so they don't block each other during nearest-free-intersection search
  state.nodes.forEach(node => { node.x = -1000; node.y = -1000; });

  if (presetName === 'horizontal') {
    btnPresetHorizontal.classList.add('active');

    const startX = 140;
    const endX = 660;
    const stepX = (endX - startX) / 6;
    const centerY = 400;

    state.nodes.forEach((node, i) => {
      const rawX = startX + i * stepX;
      const rawY = centerY;
      const snapped = findNearestFreeIntersection(rawX, rawY, node.id);
      node.x = snapped.x;
      node.y = snapped.y;
    });
  }
  else if (presetName === 'circular') {
    btnPresetCircular.classList.add('active');

    const centerX = 400;
    const centerY = 400;
    const radius = 220;

    // Arrange in circle, S at top, moving clockwise
    state.nodes.forEach((node, i) => {
      const angle = -Math.PI / 2 + (i / 7) * Math.PI * 2;
      const rawX = centerX + radius * Math.cos(angle);
      const rawY = centerY + radius * Math.sin(angle);
      const snapped = findNearestFreeIntersection(rawX, rawY, node.id);
      node.x = snapped.x;
      node.y = snapped.y;
    });
  }
  else if (presetName === 'wave') {
    btnPresetWave.classList.add('active');

    const startX = 130;
    const endX = 670;
    const stepX = (endX - startX) / 6;
    const amplitude = 95;

    state.nodes.forEach((node, i) => {
      const rawX = startX + i * stepX;
      // Sine wave layout
      const angle = (i / 6) * Math.PI * 2;
      const rawY = 400 + Math.sin(angle) * amplitude;
      const snapped = findNearestFreeIntersection(rawX, rawY, node.id);
      node.x = snapped.x;
      node.y = snapped.y;
    });
  }
  else if (presetName === 'random') {
    btnPresetRandom.classList.add('active');

    // Random placement but keeping a reasonable distance from boundaries and each other
    const padding = 150;
    state.nodes.forEach((node, i) => {
      let valid = false;
      let rx, ry;
      let attempts = 0;

      while (!valid && attempts < 100) {
        const rawX = padding + Math.random() * (CANVAS_SIZE - 2 * padding);
        const rawY = padding + Math.random() * (CANVAS_SIZE - 2 * padding);
        const snapped = findNearestFreeIntersection(rawX, rawY, node.id);
        rx = snapped.x;
        ry = snapped.y;

        // Ensure not too close to other placed nodes
        valid = true;
        for (let j = 0; j < i; j++) {
          const other = state.nodes[j];
          const dist = Math.hypot(rx - other.x, ry - other.y);
          if (dist < 80) { // slightly adjusted check since grid restriction limits layout space
            valid = false;
            break;
          }
        }
        attempts++;
      }

      node.x = rx;
      node.y = ry;
    });
  }

  render();
}

// Scramble positions of the seven letter boxes randomly
function randomizeLetterPositions() {
  if (state.fieldType === 'ramification') {
    generateRamificationTree();
    render();
    return;
  } else if (state.fieldType === 'mindmap') {
    generateMindmapTree();
    render();
    return;
  }

  // Clear positions first so they don't block each other during nearest-free-intersection search
  state.nodes.forEach(node => { node.x = -1000; node.y = -1000; });

  const padding = 120;
  state.nodes.forEach(node => {
    const rx = padding + Math.random() * (CANVAS_SIZE - 2 * padding);
    const ry = padding + Math.random() * (CANVAS_SIZE - 2 * padding);
    const snapped = findNearestFreeIntersection(rx, ry, node.id);
    node.x = snapped.x;
    node.y = snapped.y;
  });

  // Clear active preset buttons
  document.querySelectorAll('.btn-preset').forEach(btn => btn.classList.remove('active'));

  render();
}

// Render loops and calculations
function render() {
  renderBackgroundCircles();
  renderConnectionPath();
  renderLetterNodes();
}

// Calculate the radius scale factor at coordinate (cx, cy)
// Based on minimum distance to any letter attraction node
function getRadiusScale(cx, cy) {
  let minScale = 1.0;

  const dead = state.deadZoneRadius;
  const influence = state.influenceRadius;
  const diff = influence - dead;

  for (const node of state.nodes) {
    const dist = Math.hypot(cx - node.x, cy - node.y);

    let scale = 1.0;
    if (dist <= dead) {
      scale = 0;
    } else if (dist >= influence) {
      scale = 1.0;
    } else {
      scale = (dist - dead) / diff;
    }

    if (scale < minScale) {
      minScale = scale;
    }
  }

  return minScale;
}

// Draw the scattered halftone field of circles or lines
function renderBackgroundCircles() {
  bgCirclesGroup.innerHTML = '';

  if (state.fieldType === 'gravity' || state.fieldType === 'ramification' || state.fieldType === 'mindmap' || state.fieldType === 'ovals' || state.fieldType === 'evolving-lines' || state.fieldType === 'flowing-lines' || state.fieldType === 'swirl') {
    return; // direction lines and circles are erased/hidden
  }

  const color = state.circleColor;
  const baseRad = state.baseCircleRadius;
  const isLines = (state.fieldType === 'lines');

  const dead = state.deadZoneRadius;
  const influence = state.influenceRadius;
  const diff = influence - dead;

  const fragment = document.createDocumentFragment();

  state.circleField.forEach(pt => {
    // Find nearest node and minScale in a single pass
    let nearestNode = null;
    let minDistance = Infinity;
    let minScale = 1.0;

    state.nodes.forEach(node => {
      const dist = Math.hypot(pt.x - node.x, pt.y - node.y);
      if (dist < minDistance) {
        minDistance = dist;
        nearestNode = node;
      }

      let scale = 1.0;
      if (dist <= dead) {
        scale = 0;
      } else if (dist >= influence) {
        scale = 1.0;
      } else {
        scale = (dist - dead) / diff;
      }

      if (scale < minScale) {
        minScale = scale;
      }
    });

    if (minScale > 0.05) {
      if (isLines && state.nodes.length >= 2) {
        // --- Inverse-distance-weighted path-flow field ---
        // Every needle is pulled by ALL segments simultaneously.
        // Weight = 1 / (distToSegment² + ε²).
        // Result: direction continuously curves along the path, not just at junctions.
        // The flow is dominant and visually clear across the whole canvas.

        const nodes = state.nodes;
        const EPS2 = 60 * 60; // ε² controls how sharply influence drops off

        let wx = 0, wy = 0, totalW = 0;
        let minPathDist2 = Infinity; // track closest distance to path for river boost

        for (let i = 0; i < nodes.length - 1; i++) {
          const ax = nodes[i].x,   ay = nodes[i].y;
          const bx = nodes[i+1].x, by = nodes[i+1].y;
          const sdx = bx - ax, sdy = by - ay;
          const len2 = sdx * sdx + sdy * sdy;
          if (len2 < 0.001) continue;

          // Closest point on segment
          const tCl = Math.max(0, Math.min(1, ((pt.x - ax) * sdx + (pt.y - ay) * sdy) / len2));
          const cxCl = ax + tCl * sdx, cyCl = ay + tCl * sdy;
          const dist2 = Math.pow(pt.x - cxCl, 2) + Math.pow(pt.y - cyCl, 2);
          if (dist2 < minPathDist2) minPathDist2 = dist2;

          // Segment unit vector
          const segLen = Math.sqrt(len2);
          const ux = sdx / segLen, uy = sdy / segLen;

          // Weight: inverse square distance
          const w = 1 / (dist2 + EPS2);
          wx += ux * w;
          wy += uy * w;
          totalW += w;
        }

        // Normalise the weighted direction vector
        const wLen = Math.hypot(wx, wy);
        const dirX = wLen > 0 ? wx / wLen : 1;
        const dirY = wLen > 0 ? wy / wLen : 0;

        const angle = Math.atan2(dirY, dirX);

        // Needles are longer and maintain more visible size even far from nodes
        const lineLength = baseRad * 3.5 * Math.max(0.4, minScale);
        const halfL = lineLength / 2;
        const cosA = Math.cos(angle), sinA = Math.sin(angle);

        // River stroke-width boost: Gaussian based on distance to path scaled by riverIntensity
        const RIVER_SIGMA2 = state.riverWidth * state.riverWidth;
        const riverBoost = 1.8 * state.riverIntensity * Math.exp(-minPathDist2 / (2 * RIVER_SIGMA2));
        const baseStroke = Math.max(0.8, baseRad * 0.32 * minScale);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", (pt.x - halfL * cosA).toFixed(1));
        line.setAttribute("y1", (pt.y - halfL * sinA).toFixed(1));
        line.setAttribute("x2", (pt.x + halfL * cosA).toFixed(1));
        line.setAttribute("y2", (pt.y + halfL * sinA).toFixed(1));
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", (baseStroke + riverBoost).toFixed(2));
        line.setAttribute("stroke-linecap", "round");
        line.setAttribute("class", "halftone-line");
        fragment.appendChild(line);
      } else {
        // --- Path-proximity boost for halftone circles ---
        // Compute the closest distance from this circle to the S→K→I…B polyline,
        // then apply a Gaussian size boost so circles near the path are noticeably larger.

        let pathDist2 = Infinity;

        if (state.nodes.length >= 2) {
          for (let si = 0; si < state.nodes.length - 1; si++) {
            const ax = state.nodes[si].x,   ay = state.nodes[si].y;
            const bx = state.nodes[si+1].x, by = state.nodes[si+1].y;
            const sdx = bx - ax, sdy = by - ay;
            const len2 = sdx * sdx + sdy * sdy;
            if (len2 < 0.001) continue;
            const tCl = Math.max(0, Math.min(1, ((pt.x - ax) * sdx + (pt.y - ay) * sdy) / len2));
            const d2 = Math.pow(pt.x - (ax + tCl * sdx), 2) + Math.pow(pt.y - (ay + tCl * sdy), 2);
            if (d2 < pathDist2) pathDist2 = d2;
          }
        }

        // Gaussian boost: sigma = state.riverWidth, max boost = 1.1× baseRad, scaled by riverIntensity
        const PATH_SIGMA2 = state.riverWidth * state.riverWidth;
        const pathBoost = 1.1 * state.riverIntensity * Math.exp(-pathDist2 / (2 * PATH_SIGMA2));

        const currentRad = baseRad * minScale + baseRad * pathBoost;
        if (currentRad > 0.4) {
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("cx", pt.x.toFixed(1));
          circle.setAttribute("cy", pt.y.toFixed(1));
          circle.setAttribute("r", currentRad.toFixed(2));
          circle.setAttribute("fill", color);
          circle.setAttribute("class", "halftone-circle");
          fragment.appendChild(circle);
        }
      }
    }
  });

  bgCirclesGroup.appendChild(fragment);
}

// Draw the connecting vector path S-K-I-P-L-A-B
function renderConnectionPath() {
  connectionPathEl.innerHTML = '';

  if (!state.connectLetters || state.nodes.length < 2) {
    return;
  }

  if (state.fieldType === 'gravity') {
    const fragment = document.createDocumentFragment();
    const numLines = state.gravityLineCount;
    const baseW = state.gravityLineWeight;

    // Equal opacity and stroke weight for all lines
    const opacity = "0.7";
    const strokeWidth = `${baseW.toFixed(1)}px`;

    for (let idx = 0; idx < state.nodes.length - 1; idx++) {
      const p1 = state.nodes[idx];
      const p2 = state.nodes[idx + 1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const d = Math.hypot(dx, dy);
      if (d < 1) continue;

      if (numLines === 1) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", p1.x.toFixed(1));
        line.setAttribute("y1", p1.y.toFixed(1));
        line.setAttribute("x2", p2.x.toFixed(1));
        line.setAttribute("y2", p2.y.toFixed(1));
        line.setAttribute("class", "gravity-line");
        line.style.strokeOpacity = opacity;
        line.style.strokeWidth = strokeWidth;
        fragment.appendChild(line);
        continue;
      }

      const hasMiddle = (numLines % 2 === 1);
      const sideCount = Math.floor(numLines / 2);

      if (hasMiddle) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", p1.x.toFixed(1));
        line.setAttribute("y1", p1.y.toFixed(1));
        line.setAttribute("x2", p2.x.toFixed(1));
        line.setAttribute("y2", p2.y.toFixed(1));
        line.setAttribute("class", "gravity-line");
        line.style.strokeOpacity = opacity;
        line.style.strokeWidth = strokeWidth;
        fragment.appendChild(line);
      }

      for (let i = 1; i <= sideCount; i++) {
        const t = i / sideCount;
        // height factor scale (from 0.08 to 0.75 proportional to distance)
        const f = t * 0.75;
        const h = d * f;

        // Arc radius: R = (d^2 / 8h) + h/2
        const r = (d * d) / (8 * h) + h / 2;

        // Curving left (sweep-flag 0)
        const pathLeft = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const dStrLeft = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 0 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
        pathLeft.setAttribute("d", dStrLeft);
        pathLeft.setAttribute("class", "gravity-line");
        pathLeft.style.strokeOpacity = opacity;
        pathLeft.style.strokeWidth = strokeWidth;
        fragment.appendChild(pathLeft);

        // Curving right (sweep-flag 1)
        const pathRight = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const dStrRight = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
        pathRight.setAttribute("d", dStrRight);
        pathRight.setAttribute("class", "gravity-line");
        pathRight.style.strokeOpacity = opacity;
        pathRight.style.strokeWidth = strokeWidth;
        fragment.appendChild(pathRight);
      }
    }
    connectionPathEl.appendChild(fragment);
  } else if (state.fieldType === 'ramification') {
    const fragment = document.createDocumentFragment();
    if (!state.ramificationConnections || state.ramificationConnections.length === 0) {
      generateRamificationTree();
    }

    state.ramificationConnections.forEach(([idA, idB]) => {
      const nA = state.ramificationNodes.find(n => n.id === idA);
      const nB = state.ramificationNodes.find(n => n.id === idB);
      if (nA && nB) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", nA.x.toFixed(1));
        line.setAttribute("y1", nA.y.toFixed(1));
        line.setAttribute("x2", nB.x.toFixed(1));
        line.setAttribute("y2", nB.y.toFixed(1));
        line.setAttribute("class", "ramification-line");
        line.style.strokeWidth = "2px";
        line.style.strokeOpacity = "0.85";
        fragment.appendChild(line);
      }
    });
    connectionPathEl.appendChild(fragment);
  } else if (state.fieldType === 'mindmap') {
    const fragment = document.createDocumentFragment();
    if (!state.mindmapConnections || state.mindmapConnections.length === 0) {
      generateMindmapTree();
    }

    state.mindmapConnections.forEach(([idA, idB]) => {
      const nA = state.mindmapNodes.find(n => n.id === idA);
      const nB = state.mindmapNodes.find(n => n.id === idB);
      if (nA && nB) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", nA.x.toFixed(1));
        line.setAttribute("y1", nA.y.toFixed(1));
        line.setAttribute("x2", nB.x.toFixed(1));
        line.setAttribute("y2", nB.y.toFixed(1));
        line.setAttribute("class", "mindmap-line");
        line.style.strokeWidth = `${state.mindmapLineWeight}px`;
        line.style.strokeOpacity = "0.85";
        fragment.appendChild(line);
      }
    });
    connectionPathEl.appendChild(fragment);
  } else if (state.fieldType === 'ovals') {
    const fragment = document.createDocumentFragment();
    const count = state.ovalCount;
    const height = state.ovalHeight;
    const width = state.ovalWidth;
    const weight = state.ovalWeight;
    const tilt = state.ovalTilt;

    for (let idx = 0; idx < state.nodes.length - 1; idx++) {
      const p1 = state.nodes[idx];
      const p2 = state.nodes[idx + 1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const d = Math.hypot(dx, dy);
      if (d < 1) continue;

      const angleRad = Math.atan2(dy, dx);
      const angleDeg = angleRad * 180 / Math.PI;

      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : (i / (count - 1));
        const cx = p1.x + t * dx;
        const cy = p1.y + t * dy;

        const envelopeFactor = Math.sqrt(1 - Math.pow(2 * t - 1, 2));
        const ry = Math.max(8, height * envelopeFactor);
        const rx = width;

        const ellipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        ellipse.setAttribute("cx", "0");
        ellipse.setAttribute("cy", "0");
        ellipse.setAttribute("rx", rx.toFixed(1));
        ellipse.setAttribute("ry", ry.toFixed(1));
        ellipse.setAttribute("class", "evolving-oval");
        ellipse.setAttribute("transform", `translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) rotate(${(angleDeg + tilt).toFixed(1)})`);
        ellipse.style.strokeWidth = `${weight}px`;
        fragment.appendChild(ellipse);
      }
    }
    connectionPathEl.appendChild(fragment);
  } else if (state.fieldType === 'evolving-lines') {
    const fragment = document.createDocumentFragment();
    const count = state.elCount;
    const maxSize = state.elLength;
    const weight = state.elWeight;
    const tilt = state.elTilt;

    for (let idx = 0; idx < state.nodes.length - 1; idx++) {
      const p1 = state.nodes[idx];
      const p2 = state.nodes[idx + 1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const d = Math.hypot(dx, dy);
      if (d < 1) continue;

      const angleRad = Math.atan2(dy, dx);
      const angleDeg = angleRad * 180 / Math.PI;

      if (!state.elHorizontal) {
        // --- VERTICAL mode: lines perpendicular to segment, distributed along it ---
        for (let i = 0; i < count; i++) {
          const t = count === 1 ? 0.5 : (i / (count - 1));
          const cx = p1.x + t * dx;
          const cy = p1.y + t * dy;
          const envelopeFactor = Math.sqrt(1 - Math.pow(2 * t - 1, 2));
          const ry = Math.max(4, maxSize * envelopeFactor);

          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", "0");
          line.setAttribute("y1", (-ry).toFixed(1));
          line.setAttribute("x2", "0");
          line.setAttribute("y2", ry.toFixed(1));
          line.setAttribute("class", "evolving-line");
          line.setAttribute("transform", `translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) rotate(${(angleDeg + tilt).toFixed(1)})`);
          line.style.strokeWidth = `${weight}px`;
          fragment.appendChild(line);
        }
      } else {
        // --- HORIZONTAL mode: lines parallel to segment, stacked across oval height ---
        // The oval: semi-major a = d/2 (half segment length), semi-minor b = maxSize
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const a = d / 2;  // half-width = half segment length
        const b = maxSize; // half-height = user's "Max Line Length" slider

        for (let i = 0; i < count; i++) {
          // distribute from -b to +b across the oval height
          const yLocal = count === 1 ? 0 : -b + i * (2 * b / (count - 1));
          // ellipse boundary: x = a * sqrt(1 - (y/b)^2)
          const ratio = yLocal / b;
          if (Math.abs(ratio) > 1) continue;
          const halfW = a * Math.sqrt(1 - ratio * ratio);
          if (halfW < 2) continue;

          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", (-halfW).toFixed(1));
          line.setAttribute("y1", yLocal.toFixed(1));
          line.setAttribute("x2", halfW.toFixed(1));
          line.setAttribute("y2", yLocal.toFixed(1));
          line.setAttribute("class", "evolving-line");
          // rotate the whole thing around midpoint to align with the segment
          line.setAttribute("transform", `translate(${midX.toFixed(1)}, ${midY.toFixed(1)}) rotate(${(angleDeg + tilt).toFixed(1)})`);
          line.style.strokeWidth = `${weight}px`;
          fragment.appendChild(line);
        }
      }
    }
    connectionPathEl.appendChild(fragment);
  } else if (state.fieldType === 'flowing-lines') {
    const fragment = document.createDocumentFragment();
    const count = state.elCount;
    const maxLen = state.elLength;
    const weight = state.elWeight;
    const tilt = state.elTilt;

    for (let idx = 0; idx < state.nodes.length - 1; idx++) {
      const p1 = state.nodes[idx];
      const p2 = state.nodes[idx + 1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const d = Math.hypot(dx, dy);
      if (d < 1) continue;

      const angleRad = Math.atan2(dy, dx);
      const angleDeg = angleRad * 180 / Math.PI;

      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : (i / (count - 1));
        const cx = p1.x + t * dx;
        const cy = p1.y + t * dy;

        // envelope: widest at center, zero at ends
        const envelopeFactor = Math.sqrt(1 - Math.pow(2 * t - 1, 2));
        // half-length of this line along the segment direction
        const halfLen = Math.max(4, (maxLen / 2) * envelopeFactor);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        // draw horizontal in local space so rotation aligns it with the segment
        line.setAttribute("x1", (-halfLen).toFixed(1));
        line.setAttribute("y1", "0");
        line.setAttribute("x2", halfLen.toFixed(1));
        line.setAttribute("y2", "0");
        line.setAttribute("class", "evolving-line");
        line.setAttribute("transform", `translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) rotate(${(angleDeg + tilt).toFixed(1)})`);
        line.style.strokeWidth = `${weight}px`;
        fragment.appendChild(line);
      }
    }
    connectionPathEl.appendChild(fragment);
  } else if (state.fieldType === 'swirl') {
    const fragment = document.createDocumentFragment();
    const count = state.swirlCount;
    const spread = state.swirlSpread;
    const steps = 40; // Number of segments to approximate parallel curves
    
    for (let idx = 0; idx < state.nodes.length - 1; idx++) {
      const p1 = state.nodes[idx];
      const p2 = state.nodes[idx + 1];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const d = Math.hypot(dx, dy);
      if (d < 1) continue;
      
      const nx = -dy / d;
      const ny = dx / d;
      
      // Deterministic randoms based on node sequence
      const seed = idx * 123.456 + state.nodes.length * 7.89;
      const r1 = Math.abs(Math.sin(seed + 1)) * 10000; const rand1 = r1 - Math.floor(r1);
      const r2 = Math.abs(Math.sin(seed + 2)) * 10000; const rand2 = r2 - Math.floor(r2);
      
      // Control points offsets - strictly C-shaped (bulging on the same side)
      const side = rand1 > 0.5 ? 1 : -1;
      const bulge1 = state.swirlCurviness * (0.4 + 0.6 * rand1) * side;
      const bulge2 = state.swirlCurviness * (0.4 + 0.6 * rand2) * side;
      
      const cp1x = p1.x + dx * 0.33 + nx * bulge1;
      const cp1y = p1.y + dy * 0.33 + ny * bulge1;
      const cp2x = p1.x + dx * 0.67 + nx * bulge2;
      const cp2y = p1.y + dy * 0.67 + ny * bulge2;
      
      // Evaluate base curve points and normals
      const basePts = [];
      const normals = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        
        // Cubic bezier point
        const bx = mt*mt*mt*p1.x + 3*mt*mt*t*cp1x + 3*mt*t*t*cp2x + t*t*t*p2.x;
        const by = mt*mt*mt*p1.y + 3*mt*mt*t*cp1y + 3*mt*t*t*cp2y + t*t*t*p2.y;
        basePts.push({ x: bx, y: by });
        
        // Derivative for normal vector
        const tx = 3*mt*mt*(cp1x - p1.x) + 6*mt*t*(cp2x - cp1x) + 3*t*t*(p2.x - cp2x);
        const ty = 3*mt*mt*(cp1y - p1.y) + 6*mt*t*(cp2y - cp1y) + 3*t*t*(p2.y - cp2y);
        const tLen = Math.hypot(tx, ty) || 0.001;
        normals.push({ x: -ty / tLen, y: tx / tLen });
      }
      
      const radius = 25;
      const targetSpan = radius * 1.6; // 40px span across the 50px diameter circle (roughly half circumference projected)
      // Spacing decreases automatically as line count increases to maintain a constant bundle width at endpoints
      const endSpread = count > 1 ? targetSpan / (count - 1) : 0;
      
      // Draw concentric parallel lines with end tapering to fit inside letter circles
      for (let c = 0; c < count; c++) {
        const cFactor = c - (count - 1) / 2;
        let dStr = "";
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const currentSpread = endSpread;
          const currentOffset = cFactor * currentSpread;
          
          const px = basePts[i].x + normals[i].x * currentOffset;
          const py = basePts[i].y + normals[i].y * currentOffset;
          if (i === 0) dStr += `M ${px.toFixed(1)} ${py.toFixed(1)}`;
          else dStr += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
        }
        
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", dStr);
        path.setAttribute("class", "swirl-line");
        path.style.strokeWidth = `${state.swirlWeight}px`;
        fragment.appendChild(path);
      }
    }
    connectionPathEl.appendChild(fragment);
  } else {
    // Render standard single dashed path connecting nodes
    let dStr = `M ${state.nodes[0].x.toFixed(1)} ${state.nodes[0].y.toFixed(1)}`;
    for (let i = 1; i < state.nodes.length; i++) {
      dStr += ` L ${state.nodes[i].x.toFixed(1)} ${state.nodes[i].y.toFixed(1)}`;
    }
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", dStr);
    path.setAttribute("class", "connection-path");
    connectionPathEl.appendChild(path);
  }
}

// Draw the letters S-K-I-P-L-A-B and their draggable node representations
function renderLetterNodes() {
  letterNodesGroup.innerHTML = '';
  influenceCirclesGroup.innerHTML = '';

  const activeNodes = getActiveNodes();

  // Partition nodes so black circles are drawn first and text nodes on top
  const blackNodes = [];
  const textNodes = [];

  activeNodes.forEach(node => {
    if ((state.fieldType === 'ramification' || state.fieldType === 'mindmap') && !node.isText) {
      blackNodes.push(node);
    } else {
      textNodes.push(node);
    }
  });

  const orderedNodes = [...blackNodes, ...textNodes];

  orderedNodes.forEach(node => {
    // 1. Render influence visualization circles (if enabled)
    if (state.showZones) {
      const outerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      outerCircle.setAttribute("cx", node.x);
      outerCircle.setAttribute("cy", node.y);
      outerCircle.setAttribute("r", state.influenceRadius);
      outerCircle.setAttribute("class", "influence-circle");
      influenceCirclesGroup.appendChild(outerCircle);

      const innerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      innerCircle.setAttribute("cx", node.x);
      innerCircle.setAttribute("cy", node.y);
      innerCircle.setAttribute("r", state.deadZoneRadius);
      innerCircle.setAttribute("class", "influence-circle");
      innerCircle.setAttribute("stroke-dasharray", "2 2");
      influenceCirclesGroup.appendChild(innerCircle);
    }

    // 2. Render letter drag handle group
    const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodeGroup.setAttribute("class", "node-group");
    nodeGroup.setAttribute("data-id", node.id);

    if (state.fieldType === 'ramification' && !node.isText) {
      const blackCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      blackCircle.setAttribute("cx", node.x);
      blackCircle.setAttribute("cy", node.y);
      blackCircle.setAttribute("r", 25);
      blackCircle.setAttribute("class", "ramification-circle-node");
      nodeGroup.appendChild(blackCircle);
    } else if (state.fieldType === 'mindmap' && !node.isText) {
      const blackCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      blackCircle.setAttribute("cx", node.x);
      blackCircle.setAttribute("cy", node.y);
      blackCircle.setAttribute("r", state.mindmapBlackCircleSize);
      blackCircle.setAttribute("class", "mindmap-circle-node");
      nodeGroup.appendChild(blackCircle);
    } else {
      const size = state.fieldType === 'mindmap' ? state.mindmapTextCircleSize : 25;
      // Standard text circle node
      const handleCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      handleCircle.setAttribute("cx", node.x);
      handleCircle.setAttribute("cy", node.y);
      handleCircle.setAttribute("r", size);
      handleCircle.setAttribute("class", "node-circle-glow");
      nodeGroup.appendChild(handleCircle);

      // Letter Text
      const textLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textLabel.setAttribute("x", node.x);
      textLabel.setAttribute("y", node.y);
      textLabel.setAttribute("class", "node-letter");
      textLabel.setAttribute("fill", state.letterColor);
      textLabel.style.fontFamily = state.letterFont;

      const fontSize = Math.round(state.letterSize * (size / 25));
      textLabel.style.fontSize = `${fontSize}px`;
      textLabel.textContent = node.char;
      nodeGroup.appendChild(textLabel);
    }

    // Invisible larger hit-area for easier touch/mouse drag interaction
    const hitCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    hitCircle.setAttribute("cx", node.x);
    hitCircle.setAttribute("cy", node.y);
    hitCircle.setAttribute("r", 40);
    hitCircle.setAttribute("class", "node-hit-area");
    nodeGroup.appendChild(hitCircle);

    // Event listeners for drag/drop
    nodeGroup.addEventListener('pointerdown', (e) => onDragStart(e, node.id));

    letterNodesGroup.appendChild(nodeGroup);
  });
}

// Mouse / Pointer dragging handlers
function onDragStart(e, id) {
  e.preventDefault();
  state.activeDragId = id;

  const activeNodes = getActiveNodes();
  const targetNode = activeNodes.find(n => n.id === id);
  if (!targetNode) return;

  // Calculate offset from click coordinate to node center
  const rect = svgEl.getBoundingClientRect();
  const clickX = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
  const clickY = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;

  state.dragOffset.x = targetNode.x - clickX;
  state.dragOffset.y = targetNode.y - clickY;

  // Attach pointer move/up to window
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragEnd);

  document.body.style.cursor = 'grabbing';
}

function onDragMove(e) {
  if (state.activeDragId === null) return;
  e.preventDefault();

  const rect = svgEl.getBoundingClientRect();
  const mouseX = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
  const mouseY = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;

  const activeNodes = getActiveNodes();
  const targetNode = activeNodes.find(n => n.id === state.activeDragId);
  if (targetNode) {
    // Apply offset and clamp inside canvas bounds
    let finalX = mouseX + state.dragOffset.x;
    let finalY = mouseY + state.dragOffset.y;

    // Snap to nearest grid intersection (resolving overlaps)
    const snapped = findNearestFreeIntersection(finalX, finalY, state.activeDragId);
    targetNode.x = snapped.x;
    targetNode.y = snapped.y;

    const label = targetNode.isText ? `letter "${targetNode.char}"` : `node`;
    coordInfoEl.innerHTML = `<i data-lucide="move"></i> <span>Dragging ${label} to position (${Math.round(targetNode.x)}, ${Math.round(targetNode.y)})</span>`;
    lucide.createIcons();

    // Clear preset button active classes as layout is now custom
    document.querySelectorAll('.btn-preset').forEach(btn => btn.classList.remove('active'));

    render();
  }
}

function onDragEnd(e) {
  if (state.activeDragId === null) return;
  e.preventDefault();

  const activeNodes = getActiveNodes();
  const targetNode = activeNodes.find(n => n.id === state.activeDragId);

  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', onDragEnd);

  if (targetNode) {
    const label = targetNode.isText ? `letter "${targetNode.char}"` : `node`;
    coordInfoEl.innerHTML = `<i data-lucide="check"></i> <span>Moved ${label} to (${Math.round(targetNode.x)}, ${Math.round(targetNode.y)})</span>`;
    lucide.createIcons();
  }

  state.activeDragId = null;
  document.body.style.cursor = '';
}

// Generate standalone SVG markup for export
function generateStandaloneSVG() {
  const clone = svgEl.cloneNode(true);
  clone.removeAttribute('id');
  clone.setAttribute('width', '800');
  clone.setAttribute('height', '800');
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Remove interactive hit areas
  const hitAreas = clone.querySelectorAll('.node-hit-area');
  hitAreas.forEach(el => el.remove());

  // Convert style tags or CSS classes to inline SVG attributes
  const nodeGlows = clone.querySelectorAll('.node-circle-glow');
  nodeGlows.forEach(c => {
    c.removeAttribute('class');
    c.setAttribute('fill', '#ffffff');
    c.setAttribute('stroke', '#000000');
    c.setAttribute('stroke-width', '2.5');
  });

  const ramificationGlows = clone.querySelectorAll('.ramification-circle-node');
  ramificationGlows.forEach(c => {
    c.removeAttribute('class');
    c.setAttribute('fill', '#000000');
    c.setAttribute('stroke', '#000000');
    c.setAttribute('stroke-width', '2.5');
  });

  const mindmapGlows = clone.querySelectorAll('.mindmap-circle-node');
  mindmapGlows.forEach(c => {
    c.removeAttribute('class');
    c.setAttribute('fill', '#000000');
    c.setAttribute('stroke', '#000000');
    c.setAttribute('stroke-width', '2.5');
  });

  const connectionPathGroup = clone.querySelector('#connection-path');
  if (connectionPathGroup) {
    if (state.connectLetters) {
      // Style standard connection path, gravity lines, or ramification elements
      const paths = connectionPathGroup.querySelectorAll('path, line, circle, ellipse');
      paths.forEach(p => {
        if (p.classList.contains('gravity-line')) {
          p.setAttribute('fill', 'none');
          p.setAttribute('stroke', '#000000');
          const op = p.style.strokeOpacity;
          const sw = p.style.strokeWidth;
          if (op) p.setAttribute('stroke-opacity', op);
          if (sw) p.setAttribute('stroke-width', sw.replace('px', ''));
          p.removeAttribute('style');
          p.removeAttribute('class');
        } else if (p.classList.contains('ramification-line')) {
          p.setAttribute('fill', 'none');
          p.setAttribute('stroke', '#000000');
          const op = p.style.strokeOpacity;
          const sw = p.style.strokeWidth;
          if (op) p.setAttribute('stroke-opacity', op);
          if (sw) p.setAttribute('stroke-width', sw.replace('px', ''));
          p.removeAttribute('style');
          p.removeAttribute('class');
        } else if (p.classList.contains('mindmap-line')) {
          p.setAttribute('fill', 'none');
          p.setAttribute('stroke', '#000000');
          const op = p.style.strokeOpacity;
          const sw = p.style.strokeWidth;
          if (op) p.setAttribute('stroke-opacity', op);
          if (sw) p.setAttribute('stroke-width', sw.replace('px', ''));
          p.removeAttribute('style');
          p.removeAttribute('class');
        } else if (p.classList.contains('swirl-line')) {
          p.setAttribute('fill', 'none');
          p.setAttribute('stroke', '#000000');
          const op = p.style.strokeOpacity;
          const sw = p.style.strokeWidth;
          if (op) p.setAttribute('stroke-opacity', op);
          if (sw) p.setAttribute('stroke-width', sw.replace('px', ''));
          p.removeAttribute('style');
          p.removeAttribute('class');
        } else if (p.classList.contains('evolving-oval')) {
          p.setAttribute('fill', 'none');
          p.setAttribute('stroke', '#000000');
          p.setAttribute('stroke-opacity', '0.85');
          const sw = p.style.strokeWidth;
          if (sw) p.setAttribute('stroke-width', sw.replace('px', ''));
          p.removeAttribute('style');
          p.removeAttribute('class');
        } else if (p.classList.contains('evolving-line')) {
          p.setAttribute('stroke', '#000000');
          p.setAttribute('stroke-opacity', '0.85');
          p.setAttribute('stroke-linecap', 'round');
          const sw = p.style.strokeWidth;
          if (sw) p.setAttribute('stroke-width', sw.replace('px', ''));
          p.removeAttribute('style');
          p.removeAttribute('class');
        } else if (p.classList.contains('ramification-circle')) {
          p.setAttribute('fill', '#000000');
          p.setAttribute('stroke', 'none');
          p.removeAttribute('class');
        } else {
          p.removeAttribute('class');
          p.setAttribute('fill', 'none');
          p.setAttribute('stroke', 'rgba(0, 0, 0, 0.2)');
          p.setAttribute('stroke-width', '1.5');
          p.setAttribute('stroke-dasharray', '6 6');
        }
      });
    } else {
      connectionPathGroup.remove();
    }
  }

  const nodeLetters = clone.querySelectorAll('.node-letter');
  nodeLetters.forEach(text => {
    text.removeAttribute('class');
    text.setAttribute('fill', '#000000');
    text.setAttribute('font-family', state.letterFont);
    text.setAttribute('font-size', `${state.letterSize}px`);
    text.setAttribute('font-weight', '700');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
  });

  // Inject styles for background and halftone circles
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
    svg { background-color: #ffffff; }
    .halftone-circle {
      fill: ${state.circleColor};
    }
    .halftone-line {
      stroke: ${state.circleColor};
    }
  `;
  clone.insertBefore(style, clone.firstChild);

  return clone;
}

// Export canvas as SVG file
function exportSVG() {
  const standaloneSvg = generateStandaloneSVG();
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(standaloneSvg);

  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'skip-lab-halftone-logo.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export canvas as PNG file
function exportPNG() {
  const standaloneSvg = generateStandaloneSVG();
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(standaloneSvg);

  const canvas = document.createElement('canvas');
  canvas.width = 1600; // high res
  canvas.height = 1600;
  const ctx = canvas.getContext('2d');

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();

  img.onload = function () {
    ctx.drawImage(img, 0, 0, 1600, 1600);
    URL.revokeObjectURL(url);

    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = 'skip-lab-halftone-logo.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  img.src = url;
}

// Start application on DOM content load
window.addEventListener('DOMContentLoaded', init);
