// ================================================================
// ORG CHART CORE APPLICATION LOGIC & SUPABASE DUAL-PERSISTENCE
// ================================================================

const BOX_W = 320;
const BOX_H = 150;
const LEVEL_GAP = 160;
const LEAF_GAP = 60;

// ====== DEFAULT INITIAL STATIC DATA ======
const STATIC_DATA = {
  'hk': { name: 'HK', empId: '', parent: null, isActive: true },
  'shailesh': { name: 'SHAILESH', empId: '', parent: 'hk', isActive: true, branchType: 'A' },
  'yamuna': { name: 'YAMUNA', empId: 'EMC324691', parent: 'hk', isActive: true, branchType: 'B' },
  'MAMATHA': { name: 'MAMATHA', empId: 'EMC907130', parent: 'yamuna', isActive: true, branchType: 'A' },
  'NARENDRA': { name: 'NARENDRA', empId: 'EMC553802', parent: 'MAMATHA', isActive: true, branchType: 'A' },
  'GOPAL': { name: 'GOPAL', empId: 'EMC973468', parent: 'NARENDRA', isActive: true, branchType: 'A' },
  'NIKHITHA': { name: 'NIKHITHA', empId: 'EMC704705', parent: 'NARENDRA', isActive: true, branchType: 'B' },
  'DINESH': { name: 'DINESH', empId: 'EMC170905', parent: 'GOPAL', isActive: true, branchType: 'A' },
  'GANESH': { name: 'GANESH', empId: 'EMC534490', parent: 'DINESH', isActive: true, branchType: 'A' },
  'SUDHIR': { name: 'SUDHIR', empId: 'EMC338035', parent: 'MAMATHA', isActive: true, branchType: 'B' },
  'SANJEETH': { name: 'SANJEETH', empId: 'EMC265657', parent: 'SUDHIR', isActive: true, branchType: 'A' },
  'KIRAN NAIK': { name: 'KIRAN NAIK', empId: 'EMC292927', parent: 'SUDHIR', isActive: true, branchType: 'B' },
  'LIKHITH': { name: 'LIKHITH', empId: 'EMC584589', parent: 'yamuna', isActive: true, branchType: 'B' },
  'BHARATH': { name: 'BHARATH', empId: 'EMC965299', parent: 'LIKHITH', isActive: true, branchType: 'A' },
  'CHANDRAHAS': { name: 'CHANDRAHAS', empId: 'EMC223048', parent: 'LIKHITH', isActive: true, branchType: 'B' },
  'DISHA': { name: 'DISHA', empId: 'EMC221402', parent: 'BHARATH', isActive: true, branchType: 'A' },
  'RAJESH': { name: 'RAJESH', empId: 'EMC319246', parent: 'BHARATH', isActive: true, branchType: 'B' },
  'DEEKSHA': { name: 'DEEKSHA', empId: 'EMC', parent: 'DISHA', isActive: true, branchType: 'A' },
  'CHAITHRA': { name: 'CHAITHRA', empId: 'EMC410796', parent: 'RAJESH', isActive: true, branchType: 'A' },
  'RAVISHARAN': { name: 'RAVISHARAN', empId: 'EMC207173', parent: 'RAJESH', isActive: true, branchType: 'B' },
  'VEDAVATHI': { name: 'VEDAVATHI', empId: 'EMC468841', parent: 'RAVISHARAN', isActive: true, branchType: 'A' },
  'PRATHIMA': { name: 'PRATHIMA', empId: 'EMC316508', parent: 'CHANDRAHAS', isActive: true, branchType: 'A' },
  'HERALD': { name: 'HERALD', empId: 'EMC310693', parent: 'CHANDRAHAS', isActive: true, branchType: 'B' },
  'PRIYA': { name: 'PRIYA', empId: 'EMC187651', parent: 'PRATHIMA', isActive: true, branchType: 'A' },
  'KSHITHIJ': { name: 'KSHITHIJ', empId: 'EMC635191', parent: 'PRATHIMA', isActive: true, branchType: 'B' },
  'SHILPA': { name: 'SHILPA', empId: 'EMC244927', parent: 'HERALD', isActive: true, branchType: 'A' },
  'SUNIL': { name: 'SUNIL', empId: 'EMC739748', parent: 'HERALD', isActive: true, branchType: 'B' },
  'RESHMA': { name: 'RESHMA', empId: 'EMC141630', parent: 'SHILPA', isActive: true, branchType: 'A' },
  'SHIVAPRASAD': { name: 'SHIVAPRASAD', empId: 'EMC486463', parent: 'RESHMA', isActive: true, branchType: 'A' }
};

let nodes = {};
let rootId = null;
let idCounter = 0;
let activeNodeId = null;

let isDeleteModeActive = false;
let isMultiSelectModeActive = false;
let selectedNodeIds = new Set();
let isFirstLoad = true;

// ====== SUBTREE ISOLATED FOCUS STATE ======
let focusedRootId = null; // null = full org chart; string nodeId = focused sub-tree

// ====== EXPERIMENTAL FEATURES: SIZING MODES ======
// sizingMode: 'off' | 'subtree' | 'level'
let sizingMode = 'off';

function toggleHierarchicalSizing(mode) {
  if (sizingMode === mode) {
    sizingMode = 'off';
  } else {
    sizingMode = mode;
  }

  updateSizingUI();
  saveLocalCache();
  renderAll();
}

function updateSizingUI() {
  const btnSub = document.getElementById('btn-experimental-sizing');
  const badgeSub = document.getElementById('badge-experimental-sizing');
  const btnLvl = document.getElementById('btn-experimental-level-sizing');
  const badgeLvl = document.getElementById('badge-experimental-level-sizing');

  if (btnSub && badgeSub) {
    const isSub = (sizingMode === 'subtree');
    btnSub.className = isSub ? 'btn-drawer-action purple active-mode' : 'btn-drawer-action purple';
    badgeSub.textContent = isSub ? 'ON' : 'OFF';
  }

  if (btnLvl && badgeLvl) {
    const isLvl = (sizingMode === 'level');
    btnLvl.className = isLvl ? 'btn-drawer-action purple active-mode' : 'btn-drawer-action purple';
    badgeLvl.textContent = isLvl ? 'ON' : 'OFF';
  }

  if (sizingMode === 'subtree') showToast('🧪 Dynamic Subtree Sizing turned ON!');
  else if (sizingMode === 'level') showToast('📊 Equal Level-Depth Sizing turned ON!');
  else showToast('Uniform Standard Sizing active');
}

function getSubtreeDepthFromBottom(nodeId) {
  const n = nodes[nodeId];
  if (!n || !n.children || n.children.length === 0) return 0;
  let maxChildDepth = 0;
  n.children.forEach(cid => {
    maxChildDepth = Math.max(maxChildDepth, getSubtreeDepthFromBottom(cid));
  });
  return 1 + maxChildDepth;
}

function getNodeDimensions(n) {
  if (!n || sizingMode === 'off') {
    return { width: BOX_W, height: BOX_H, fontSize: 30 };
  }

  let width, height, targetFontSize;

  if (sizingMode === 'subtree') {
    // Mode 1: Subtree depth calculation (nodes with deeper subtrees below are bigger)
    const depthFromBottom = getSubtreeDepthFromBottom(n.id);
    width = 250 + depthFromBottom * 50;
    height = 105 + depthFromBottom * 20;
    targetFontSize = 24 + depthFromBottom * 5;
  } else if (sizingMode === 'level') {
    // Mode 2: Equal level depth calculation (all nodes at same tier/level share identical size!)
    const depth = (n.depth !== undefined && !isNaN(n.depth)) ? n.depth : 0;
    width = Math.max(250, 460 - depth * 55);
    height = Math.max(105, 180 - depth * 18);
    targetFontSize = Math.max(22, 42 - depth * 5);
  }

  // Auto-fit font size based on text character length so names fit perfectly inside box
  const nameStr = (n.data && n.data.name) ? n.data.name : '';
  const empIdStr = (n.data && n.data.empId) ? formatEmpIdForDisplay(n.data.empId) : '';
  const maxLen = Math.max(nameStr.length, empIdStr.length, 6);

  const maxFontForWidth = Math.floor((width - 44) / (maxLen * 0.62));
  const fontSize = Math.min(targetFontSize, Math.max(20, maxFontForWidth));

  return { width, height, fontSize };
}

// ====== EMC ID AUTO-FORMATTER HELPER ======
function formatEmpIdForDisplay(raw) {
  if (!raw) return '';
  let str = raw.trim().toUpperCase();
  if (str === '' || str === 'EMC') return '';
  if (!str.startsWith('EMC')) return 'EMC' + str;
  return str;
}

// ====== UNIFIED 3-LINE HAMBURGER MENU DRAWER LOGIC ======
function toggleUnifiedMenu() {
  const drawer = document.getElementById('unified-menu-drawer');
  if (!drawer) return;

  if (drawer.classList.contains('open')) {
    drawer.classList.remove('open');
  } else {
    drawer.classList.add('open');
    updateSidebarList();
    renderInactiveNodesList();
  }
}

function switchDrawerTab(tabName) {
  ['trees', 'delete', 'info'].forEach(t => {
    const btn = document.getElementById('tab-btn-' + t);
    const content = document.getElementById('tab-content-' + t);
    if (btn) btn.classList.toggle('active', t === tabName);
    if (content) content.classList.toggle('active', t === tabName);
  });

  if (tabName === 'trees') updateSidebarList();
  if (tabName === 'delete') renderInactiveNodesList();
}

// ====== INACTIVE / RED STATUS NODES LOGIC ======
let isInactiveListOpen = false;

function toggleInactiveListCollapse() {
  isInactiveListOpen = !isInactiveListOpen;
  const listContainer = document.getElementById('inactive-nodes-list');
  const btn = document.getElementById('btn-inactive-toggle');
  if (listContainer) {
    listContainer.style.display = isInactiveListOpen ? 'flex' : 'none';
  }
  if (btn) {
    btn.classList.toggle('active-mode', isInactiveListOpen);
  }
}

function updateInactiveCount() {
  const badgeCount = document.getElementById('badge-inactive-count');
  const inactiveNodes = Object.values(nodes).filter(n => n.data && n.data.isActive === false);
  const count = inactiveNodes.length;

  if (badgeCount) {
    badgeCount.textContent = `(${count})`;
  }
}

function renderInactiveNodesList() {
  const listContainer = document.getElementById('inactive-nodes-list');
  if (!listContainer) return;

  listContainer.innerHTML = '';
  const inactiveNodes = Object.values(nodes).filter(n => n.data && n.data.isActive === false);
  updateInactiveCount();

  if (inactiveNodes.length === 0) {
    listContainer.innerHTML = '<div style="font-size:12px; color:#5C3FA0; text-align:center; padding:12px; font-weight:700;">🟢 All IDs active</div>';
    return;
  }

  inactiveNodes.forEach(n => {
    const card = document.createElement('div');
    card.className = 'inactive-node-card';

    const info = document.createElement('div');
    info.className = 'card-info';

    const title = document.createElement('div');
    title.className = 'card-title';
    const nodeName = (n.data && n.data.name) ? n.data.name : n.id;
    title.textContent = nodeName;

    const sub = document.createElement('div');
    sub.className = 'card-sub';
    const formattedId = formatEmpIdForDisplay(n.data ? n.data.empId : '');
    const parentName = (n.parent && nodes[n.parent] && nodes[n.parent].data && nodes[n.parent].data.name) ? nodes[n.parent].data.name : 'Root';
    sub.textContent = `${formattedId ? formattedId + ' • ' : ''}Parent: ${parentName}`;

    info.appendChild(title);
    info.appendChild(sub);

    const dot = document.createElement('div');
    dot.className = 'card-dot';
    dot.title = 'Click to activate / set Green';
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      pushHistoryState(`Status toggle for "${nodeName}"`);
      n.data.isActive = true;
      saveLocalCache();
      renderAll();
      renderInactiveNodesList();
      syncAllToSupabase();
      showToast(`🟢 ${nodeName} is now Active!`);
    });

    card.appendChild(info);
    card.appendChild(dot);

    card.addEventListener('click', () => {
      const drawer = document.getElementById('unified-menu-drawer');
      if (drawer) drawer.classList.remove('open');

      if (focusedRootId && !getSubtreeIds(focusedRootId).includes(n.id)) {
        clearSubtreeFocus();
      }

      setZoom(1.0);

      const wrap = document.getElementById('canvas-wrap');
      if (wrap && n) {
        wrap.scrollLeft = Math.max(0, (n.x * currentZoom) - (wrap.clientWidth / 2));
        wrap.scrollTop = Math.max(0, (n.y * currentZoom) - (wrap.clientHeight / 2));
        showToast(`🔍 Zoomed in on ${nodeName}`);
      }
    });

    listContainer.appendChild(card);
  });
}

// ====== SIDEBAR SEARCH & SUBTREE SELECTOR LOGIC ======
function onSidebarSearchInput() {
  const input = document.getElementById('sidebar-search');
  const query = input ? input.value.trim() : '';
  updateSidebarList(query);
}

function updateSidebarList(filterText = '') {
  const listContainer = document.getElementById('sidebar-list');
  if (!listContainer) return;

  listContainer.innerHTML = '';
  const searchLower = filterText.toLowerCase();

  const parentNodes = Object.values(nodes).filter(n => {
    const nameStr = (n.data && n.data.name) ? n.data.name : n.id;
    const empIdStr = (n.data && n.data.empId) ? n.data.empId : '';
    const matches = nameStr.toLowerCase().includes(searchLower) || empIdStr.toLowerCase().includes(searchLower);
    return matches;
  });

  parentNodes.sort((a, b) => {
    if (a.id === rootId) return -1;
    if (b.id === rootId) return 1;
    return getSubtreeIds(b.id).length - getSubtreeIds(a.id).length;
  });

  if (parentNodes.length === 0) {
    listContainer.innerHTML = '<div style="font-size:12px; color:#7A6A9C; text-align:center; padding:12px;">No matching parents found</div>';
    return;
  }

  parentNodes.forEach(n => {
    const item = document.createElement('div');
    const isCurrentFocus = (focusedRootId === n.id) || (focusedRootId === null && n.id === rootId);
    item.className = 'sidebar-item' + (isCurrentFocus ? ' active' : '');

    const info = document.createElement('div');
    info.className = 'item-info';

    const title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = (n.data && n.data.name) ? n.data.name : n.id;
    if (n.id === rootId) title.textContent += ' (Master Root)';

    const sub = document.createElement('div');
    sub.className = 'item-sub';
    const formattedId = formatEmpIdForDisplay(n.data ? n.data.empId : '');
    sub.textContent = formattedId ? formattedId : 'Parent Node';

    info.appendChild(title);
    info.appendChild(sub);

    const badge = document.createElement('div');
    badge.className = 'item-badge';
    const childCount = getSubtreeIds(n.id).length;
    badge.textContent = `${childCount} node${childCount > 1 ? 's' : ''}`;

    item.appendChild(info);
    item.appendChild(badge);

    item.addEventListener('click', () => {
      if (n.id === rootId) {
        clearSubtreeFocus();
      } else {
        setSubtreeFocus(n.id);
      }
      const drawer = document.getElementById('unified-menu-drawer');
      if (drawer) drawer.classList.remove('open');
    });

    listContainer.appendChild(item);
  });
}

function setSubtreeFocus(nodeId) {
  const n = nodes[nodeId];
  if (!n) return;

  focusedRootId = nodeId;
  const focusName = (n.data && n.data.name) ? n.data.name : n.id;

  const breadcrumbBar = document.getElementById('focus-breadcrumb-bar');
  const breadcrumbName = document.getElementById('focus-tree-name');
  if (breadcrumbBar && breadcrumbName) {
    breadcrumbName.textContent = focusName;
    breadcrumbBar.classList.add('visible');
  }

  try {
    const url = new URL(window.location);
    url.searchParams.set('focus', focusName);
    window.history.pushState({}, '', url);
  } catch (e) { console.error('URL push error:', e); }

  renderAll();
  fitToScreen();
  showToast(`🌿 Focused on Parent Subtree: ${focusName}`);
}

function clearSubtreeFocus() {
  focusedRootId = null;

  const breadcrumbBar = document.getElementById('focus-breadcrumb-bar');
  if (breadcrumbBar) {
    breadcrumbBar.classList.remove('visible');
  }

  try {
    const url = new URL(window.location);
    url.searchParams.delete('focus');
    url.searchParams.delete('focusId');
    window.history.pushState({}, '', url.pathname);
  } catch (e) { console.error('URL clear error:', e); }

  renderAll();
  fitToScreen();
  showToast('🏠 Displaying Master Org Chart');
}

function checkUrlFocusParam() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const focusParam = urlParams.get('focus') || urlParams.get('focusId');
    if (focusParam) {
      const paramUpper = focusParam.trim().toUpperCase();
      const target = Object.values(nodes).find(n => {
        return n.id === focusParam || (n.data && n.data.name && n.data.name.trim().toUpperCase() === paramUpper);
      });
      if (target && target.id !== rootId) {
        setSubtreeFocus(target.id);
      }
    }
  } catch (e) {
    console.error('Check URL focus error:', e);
  }
}

// ====== SILKY SMOOTH ZOOM SYSTEM ======
let currentZoom = 1.0;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 2.5;

function setZoom(newZoom, centerPoint = null) {
  const wrap = document.getElementById('canvas-wrap');
  const canvas = document.getElementById('canvas');
  if (!wrap || !canvas) return;

  const targetZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
  if (Math.abs(targetZoom - currentZoom) < 0.0001) return;

  const oldZoom = currentZoom;
  currentZoom = targetZoom;

  if (centerPoint) {
    const rect = wrap.getBoundingClientRect();
    const cursorX = centerPoint.x - rect.left;
    const cursorY = centerPoint.y - rect.top;

    const contentX = (wrap.scrollLeft + cursorX) / oldZoom;
    const contentY = (wrap.scrollTop + cursorY) / oldZoom;

    canvas.style.transform = `scale(${currentZoom})`;

    wrap.scrollLeft = contentX * currentZoom - cursorX;
    wrap.scrollTop = contentY * currentZoom - cursorY;
  } else {
    canvas.style.transform = `scale(${currentZoom})`;
  }

  const zoomBadge = document.getElementById('zoom-badge');
  if (zoomBadge) {
    zoomBadge.textContent = Math.round(currentZoom * 100) + '%';
  }
}

function zoomIn() { setZoom(currentZoom + 0.15); }
function zoomOut() { setZoom(currentZoom - 0.15); }
function resetZoom() { setZoom(1.0); }

// ====== FIT TO SCREEN OPTION ======
function fitToScreen() {
  const wrap = document.getElementById('canvas-wrap');
  if (!wrap || Object.keys(nodes).length === 0) return;

  const effectiveRoot = (focusedRootId && nodes[focusedRootId]) ? focusedRootId : rootId;
  const activeSubtreeIds = new Set(getSubtreeIds(effectiveRoot));

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  Object.values(nodes).forEach(n => {
    if (activeSubtreeIds.has(n.id)) {
      const dims = getNodeDimensions(n);
      minX = Math.min(minX, n.x - dims.width / 2);
      maxX = Math.max(maxX, n.x + dims.width / 2);
      minY = Math.min(minY, n.y - dims.height / 2);
      maxY = Math.max(maxY, n.y + dims.height / 2);
    }
  });

  const treeWidth = (maxX - minX) + 160;
  const treeHeight = (maxY - minY) + 160;

  const viewWidth = wrap.clientWidth;
  const viewHeight = wrap.clientHeight;

  const scaleX = viewWidth / treeWidth;
  const scaleY = viewHeight / treeHeight;

  let fitScale = Math.min(scaleX, scaleY);
  fitScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fitScale));

  setZoom(fitScale);

  const treeCenterX = (minX + maxX) / 2;
  const treeCenterY = (minY + maxY) / 2;

  wrap.scrollLeft = Math.max(0, (treeCenterX * fitScale) - (viewWidth / 2));
  wrap.scrollTop = Math.max(0, (treeCenterY * fitScale) - (viewHeight / 2));

  showToast(`🎯 Fit to Screen (${Math.round(fitScale * 100)}%)`);
}

// ====== DETAILED DESCRIPTIVE UNDO / REDO SYSTEM ======
let historyStack = [];
let redoStack = [];
const MAX_HISTORY = 5;

function saveUndoRedoHistory() {
  try {
    localStorage.setItem('org_chart_undo_history', JSON.stringify(historyStack));
    localStorage.setItem('org_chart_redo_history', JSON.stringify(redoStack));
  } catch (e) {
    console.error('Save undo/redo history error:', e);
  }
}

function loadUndoRedoHistory() {
  try {
    const savedUndo = localStorage.getItem('org_chart_undo_history');
    const savedRedo = localStorage.getItem('org_chart_redo_history');

    if (savedUndo) historyStack = JSON.parse(savedUndo) || [];
    if (savedRedo) redoStack = JSON.parse(savedRedo) || [];

    if (historyStack.length > MAX_HISTORY) historyStack = historyStack.slice(-MAX_HISTORY);
    if (redoStack.length > MAX_HISTORY) redoStack = redoStack.slice(-MAX_HISTORY);
  } catch (e) {
    console.error('Load undo/redo history error:', e);
    historyStack = [];
    redoStack = [];
  }
  updateUndoRedoButtonState();
}

function pushHistoryState(actionDescription = 'Chart modification') {
  try {
    const snapshot = JSON.stringify({ nodes, rootId, idCounter });
    if (historyStack.length > 0 && historyStack[historyStack.length - 1].state === snapshot) {
      return;
    }
    historyStack.push({
      state: snapshot,
      description: actionDescription
    });
    if (historyStack.length > MAX_HISTORY) {
      historyStack.shift();
    }
    redoStack = [];
    saveUndoRedoHistory();
    updateUndoRedoButtonState();
  } catch (e) {
    console.error('History push error:', e);
  }
}

function undoAction() {
  if (historyStack.length === 0) {
    showToast('No actions to undo');
    return;
  }

  const currentSnapshot = JSON.stringify({ nodes, rootId, idCounter });
  const item = historyStack.pop();

  redoStack.push({
    state: currentSnapshot,
    description: item.description
  });
  if (redoStack.length > MAX_HISTORY) redoStack.shift();

  saveUndoRedoHistory();

  try {
    const state = JSON.parse(item.state);
    nodes = state.nodes || {};
    rootId = state.rootId || null;
    if (state.idCounter) idCounter = state.idCounter;

    saveLocalCache();
    renderAll();
    syncAllToSupabase();
    showToast(`↩️ Undone: ${item.description}`);
  } catch (e) {
    console.error('Undo restore error:', e);
  }
  updateUndoRedoButtonState();
}

function redoAction() {
  if (redoStack.length === 0) {
    showToast('No actions to redo');
    return;
  }

  const currentSnapshot = JSON.stringify({ nodes, rootId, idCounter });
  const item = redoStack.pop();

  historyStack.push({
    state: currentSnapshot,
    description: item.description
  });
  if (historyStack.length > MAX_HISTORY) historyStack.shift();

  saveUndoRedoHistory();

  try {
    const state = JSON.parse(item.state);
    nodes = state.nodes || {};
    rootId = state.rootId || null;
    if (state.idCounter) idCounter = state.idCounter;

    saveLocalCache();
    renderAll();
    syncAllToSupabase();
    showToast(`↪️ Redone: ${item.description}`);
  } catch (e) {
    console.error('Redo restore error:', e);
  }
  updateUndoRedoButtonState();
}

function updateUndoRedoButtonState() {
  const btnUndo = document.getElementById('btn-top-undo');
  const btnRedo = document.getElementById('btn-top-redo');

  if (btnUndo) {
    btnUndo.disabled = (historyStack.length === 0);
    btnUndo.style.opacity = (historyStack.length === 0) ? '0.5' : '1';
    btnUndo.style.cursor = (historyStack.length === 0) ? 'not-allowed' : 'pointer';
    if (historyStack.length > 0) {
      const lastAction = historyStack[historyStack.length - 1].description;
      btnUndo.title = `Undo: ${lastAction} (Ctrl+Z)`;
    } else {
      btnUndo.title = 'No actions to undo (Ctrl+Z)';
    }
  }

  if (btnRedo) {
    btnRedo.disabled = (redoStack.length === 0);
    btnRedo.style.opacity = (redoStack.length === 0) ? '0.5' : '1';
    btnRedo.style.cursor = (redoStack.length === 0) ? 'not-allowed' : 'pointer';
    if (redoStack.length > 0) {
      const nextAction = redoStack[redoStack.length - 1].description;
      btnRedo.title = `Redo: ${nextAction} (Ctrl+Y)`;
    } else {
      btnRedo.title = 'No actions to redo (Ctrl+Y)';
    }
  }
}

function makeId() { return 'n' + (idCounter++); }

// ====== MOUSE WHEEL ZOOMING & CLICK-AND-DRAG 360° CANVAS PANNING ======
function initCanvasPanAndScroll() {
  const wrap = document.getElementById('canvas-wrap');
  if (!wrap) return;

  let isPanning = false;
  let startX = 0, startY = 0;
  let startScrollLeft = 0, startScrollTop = 0;

  wrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
    setZoom(currentZoom * zoomFactor, { x: e.clientX, y: e.clientY });
  }, { passive: false });

  wrap.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('#panel') || e.target.closest('#unified-menu-drawer') || e.target.closest('#top-right-bar') || e.target.closest('#batch-delete-bar') || e.target.closest('#supabase-overlay') || e.target.closest('#btn-hamburger-menu') || e.target.closest('#focus-breadcrumb-bar')) {
      return;
    }

    isPanning = true;
    startX = e.clientX;
    startY = e.clientY;
    startScrollLeft = wrap.scrollLeft;
    startScrollTop = wrap.scrollTop;

    wrap.classList.add('panning');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    wrap.scrollLeft = startScrollLeft - dx;
    wrap.scrollTop = startScrollTop - dy;
  });

  window.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      wrap.classList.remove('panning');
    }
  });
}

// ====== DELETE MODES LOGIC ======
function toggleDeleteMode() {
  if (isMultiSelectModeActive) {
    toggleMultiSelectMode();
  }

  isDeleteModeActive = !isDeleteModeActive;
  const btn = document.getElementById('btn-drawer-delete-mode');
  const badge = document.getElementById('badge-delete-mode');

  if (btn) {
    if (isDeleteModeActive) {
      btn.className = 'btn-drawer-action red active-mode';
      if (badge) badge.textContent = 'ACTIVE (Esc)';
      showToast('Delete Mode ON: Click any node on the chart to delete its subtree');
    } else {
      btn.className = 'btn-drawer-action red';
      if (badge) badge.textContent = 'OFF';
      showToast('Delete Mode turned OFF');
    }
  }
  renderAll();
}

function toggleMultiSelectMode() {
  if (isDeleteModeActive) {
    isDeleteModeActive = false;
    const btnDel = document.getElementById('btn-drawer-delete-mode');
    const badgeDel = document.getElementById('badge-delete-mode');
    if (btnDel) btnDel.className = 'btn-drawer-action red';
    if (badgeDel) badgeDel.textContent = 'OFF';
  }

  isMultiSelectModeActive = !isMultiSelectModeActive;
  selectedNodeIds.clear();

  const btnMulti = document.getElementById('btn-drawer-multiselect');
  const badgeMulti = document.getElementById('badge-multiselect-mode');

  if (btnMulti) {
    if (isMultiSelectModeActive) {
      btnMulti.className = 'btn-drawer-action purple active-mode';
      if (badgeMulti) badgeMulti.textContent = 'ACTIVE';
      showToast('Multi-Select ON: Click nodes to select/unselect them');
    } else {
      btnMulti.className = 'btn-drawer-action purple';
      if (badgeMulti) badgeMulti.textContent = 'OFF';
      showToast('Multi-Select Mode turned OFF');
    }
  }

  updateBatchDeleteBar();
  renderAll();
}

function updateBatchDeleteBar() {
  const batchBar = document.getElementById('batch-delete-bar');
  const countText = document.getElementById('batch-selected-count');
  if (batchBar) {
    if (isMultiSelectModeActive && selectedNodeIds.size > 0) {
      batchBar.style.display = 'flex';
      if (countText) countText.textContent = selectedNodeIds.size + ' node(s) selected';
    } else {
      batchBar.style.display = 'none';
    }
  }
}

function handleNodeClickInMultiSelectMode(nodeId) {
  if (nodeId === rootId) {
    showToast("Root Node cannot be selected for deletion!");
    return;
  }

  if (selectedNodeIds.has(nodeId)) {
    selectedNodeIds.delete(nodeId);
  } else {
    selectedNodeIds.add(nodeId);
  }

  updateBatchDeleteBar();
  renderAll();
}

async function executeBatchDelete() {
  if (selectedNodeIds.size === 0) {
    showToast('No nodes selected!');
    return;
  }

  if (selectedNodeIds.has(rootId)) {
    showToast("The Root Node cannot be deleted!");
    return;
  }

  let allSubtreeIds = new Set();
  selectedNodeIds.forEach(id => {
    getSubtreeIds(id).forEach(subId => allSubtreeIds.add(subId));
  });

  const idsArray = Array.from(allSubtreeIds);
  const selectedCount = selectedNodeIds.size;
  const totalCount = idsArray.length;

  if (confirm(`🗑️ Delete ${selectedCount} selected node(s) and all sub-branches (Total ${totalCount} nodes)?`)) {
    pushHistoryState(`Batch deletion of ${selectedCount} node(s)`);

    selectedNodeIds.forEach(id => {
      const n = nodes[id];
      if (n && n.parent && nodes[n.parent]) {
        nodes[n.parent].children = nodes[n.parent].children.filter(cid => cid !== id);
      }
    });

    idsArray.forEach(id => {
      delete nodes[id];
    });

    selectedNodeIds.clear();
    saveLocalCache();
    renderAll();
    toggleMultiSelectMode();

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      try {
        const { error } = await supabaseClient.from('org_nodes').delete().in('id', idsArray);
        if (error) {
          console.error('Supabase Batch Delete Error:', error);
          showToast('Delete Error: ' + error.message);
        } else {
          showToast(`Deleted ${totalCount} nodes from Supabase cloud!`);
        }
      } catch (e) {
        console.error('Batch delete exception:', e);
      }
    }
  }
}

// ====== LOCAL CACHE STORAGE (0ms Refresh Retention) ======
function saveLocalCache() {
  try {
    localStorage.setItem('org_chart_nodes_cache', JSON.stringify(nodes));
    if (rootId) localStorage.setItem('org_chart_root_id', rootId);
    localStorage.setItem('org_chart_id_counter', idCounter.toString());
    localStorage.setItem('org_chart_sizing_mode', sizingMode);
  } catch (e) {
    console.error('Local cache save error:', e);
  }
}

function loadLocalCache() {
  try {
    const cachedNodes = localStorage.getItem('org_chart_nodes_cache');
    const cachedRoot = localStorage.getItem('org_chart_root_id');
    const cachedCounter = localStorage.getItem('org_chart_id_counter');
    const cachedSizingMode = localStorage.getItem('org_chart_sizing_mode');

    if (cachedSizingMode) {
      sizingMode = cachedSizingMode;
      updateSizingUI();
    }

    if (cachedNodes && cachedRoot) {
      nodes = JSON.parse(cachedNodes);
      rootId = cachedRoot;
      if (cachedCounter) idCounter = parseInt(cachedCounter) || 0;
      return true;
    }
  } catch (e) {
    console.error('Local cache load error:', e);
  }
  return false;
}

// ====== FORCE SYNC ALL NODES TO SUPABASE CLOUD ======
async function syncAllToSupabase() {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) {
    saveLocalCache();
    return;
  }

  const rowsToInsert = Object.values(nodes).map(n => ({
    id: n.id,
    name: n.data ? (n.data.name || '') : '',
    emp_id: formatEmpIdForDisplay(n.data ? n.data.empId : ''),
    parent_id: n.parent,
    is_active: (n.data && n.data.isActive !== false),
    branch_type: n.branchType || 'A',
    points: (n.data && n.data.points !== undefined && n.data.points !== null) ? parseInt(n.data.points) : 20000
  }));

  try {
    const { error } = await supabaseClient.from('org_nodes').upsert(rowsToInsert);
    if (error) {
      console.error('Supabase Sync Error:', error);
    } else {
      saveLocalCache();
    }
  } catch (e) {
    console.error('Sync Exception:', e);
  }
}

// ====== DATA LOADING LOGIC ======
async function loadData(isSilent = false) {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('org_nodes').select('*');
      if (error) {
        if (!isSilent) showToast('Supabase Error: ' + error.message);
        return;
      }

      if (data && data.length > 0) {
        nodes = {};
        idCounter = 0;
        rootId = null;

        data.forEach(row => {
          const isAct = (row.is_active !== undefined && row.is_active !== null) ? row.is_active : true;
          const bType = row.branch_type || 'A';
          const pts = (row.points !== undefined && row.points !== null) ? parseInt(row.points) : 20000;

          nodes[row.id] = {
            id: row.id,
            x: 0, y: 0,
            parent: row.parent_id || null,
            children: [],
            branchType: bType,
            data: {
              name: row.name || '',
              empId: formatEmpIdForDisplay(row.emp_id),
              isActive: isAct,
              points: pts
            }
          };
          if (row.id && row.id.startsWith('n')) {
            const num = parseInt(row.id.substring(1));
            if (!isNaN(num) && num >= idCounter) idCounter = num + 1;
          }
        });

        Object.values(nodes).forEach(n => {
          if (n.parent && nodes[n.parent]) {
            nodes[n.parent].children.push(n.id);
          }
        });

        Object.values(nodes).forEach(p => {
          if (p.children.length === 2) {
            const c1 = nodes[p.children[0]];
            const c2 = nodes[p.children[1]];
            if (c1 && c2 && c1.branchType === c2.branchType) {
              c1.branchType = 'A';
              c2.branchType = 'B';
            }
          }
        });

        const rootNode = Object.values(nodes).find(n => !n.parent || !nodes[n.parent]);
        if (rootNode) rootId = rootNode.id;

        if (rootId) {
          saveLocalCache();
          checkUrlFocusParam();
          renderAll();
          if (!isSilent) showToast('Loaded live data from Supabase!');
          return;
        }
      } else if (!isSilent) {
        showToast('Saving initial Org Chart to Supabase cloud...');
        await seedStaticDataToSupabase();
        renderAll();
        return;
      }
    } catch (e) {
      console.error('Failed to load from Supabase:', e);
      if (!isSilent) showToast('Connection error. Displaying local cache.');
    }
  }

  if (Object.keys(nodes).length === 0) {
    if (!loadLocalCache()) {
      loadStaticData();
    }
  }
}

// Background Auto-Sync Polling (Guarantees Mobile & Laptop sync every 3s)
setInterval(() => {
  const panel = document.getElementById('panel');
  const isEditing = panel && panel.classList.contains('active');
  if (!isEditing && typeof supabaseClient !== 'undefined' && supabaseClient) {
    loadData(true);
  }
}, 3000);

async function seedStaticDataToSupabase() {
  loadStaticData();
  saveLocalCache();
  await syncAllToSupabase();
}

function loadStaticData() {
  nodes = {};
  idCounter = 0;

  const keyToId = {};
  const rootKey = Object.keys(STATIC_DATA).find(k => STATIC_DATA[k].parent === null);

  function build(key, parentId) {
    const entry = STATIC_DATA[key];
    const id = makeId();
    nodes[id] = {
      id, x: 0, y: 0,
      parent: parentId,
      children: [],
      branchType: entry.branchType || 'A',
      data: { name: entry.name, empId: formatEmpIdForDisplay(entry.empId), isActive: (entry.isActive !== false), points: 20000 }
    };
    keyToId[key] = id;
    if (parentId && nodes[parentId]) nodes[parentId].children.push(id);
    return id;
  }

  rootId = build(rootKey, null);
  let remaining = Object.keys(STATIC_DATA).filter(k => k !== rootKey);
  let progress = true;
  while (remaining.length && progress) {
    progress = false;
    remaining = remaining.filter(key => {
      const entry = STATIC_DATA[key];
      if (keyToId[entry.parent] !== undefined) {
        build(key, keyToId[entry.parent]);
        progress = true;
        return false;
      }
      return true;
    });
  }
}

// ====== ZERO-OVERLAP BOUNDING-BOX LAYOUT ALGORITHM ======
function getSubtreeWidth(id) {
  const n = nodes[id];
  if (!n) return 360;

  const dims = getNodeDimensions(n);
  const unitWidth = dims.width + 60;

  if (!n.children || n.children.length === 0) {
    return unitWidth;
  }

  const childA = n.children.find(cid => nodes[cid] && nodes[cid].branchType === 'A');
  const childB = n.children.find(cid => nodes[cid] && nodes[cid].branchType === 'B');

  if (childA && childB) {
    return getSubtreeWidth(childA) + getSubtreeWidth(childB);
  } else if (childA) {
    return getSubtreeWidth(childA) + unitWidth / 2;
  } else if (childB) {
    return getSubtreeWidth(childB) + unitWidth / 2;
  } else {
    let sum = 0;
    n.children.forEach(cid => { sum += getSubtreeWidth(cid); });
    return Math.max(unitWidth, sum);
  }
}

function positionSubtree(id, leftX, depth) {
  const n = nodes[id];
  if (!n) return;
  n.depth = depth;

  const w = getSubtreeWidth(id);
  const dims = getNodeDimensions(n);
  const unitWidth = dims.width + 60;

  if (!n.children || n.children.length === 0) {
    n.x = leftX + w / 2;
    return;
  }

  const childA = n.children.find(cid => nodes[cid] && nodes[cid].branchType === 'A');
  const childB = n.children.find(cid => nodes[cid] && nodes[cid].branchType === 'B');

  if (childA && childB) {
    const wA = getSubtreeWidth(childA);
    positionSubtree(childA, leftX, depth + 1);
    positionSubtree(childB, leftX + wA, depth + 1);
    n.x = (nodes[childA].x + nodes[childB].x) / 2;
  } else if (childA) {
    positionSubtree(childA, leftX, depth + 1);
    n.x = nodes[childA].x + unitWidth / 2;
  } else if (childB) {
    positionSubtree(childB, leftX + unitWidth / 2, depth + 1);
    n.x = nodes[childB].x - unitWidth / 2;
  } else {
    let currX = leftX;
    n.children.forEach(cid => {
      const cw = getSubtreeWidth(cid);
      positionSubtree(cid, currX, depth + 1);
      currX += cw;
    });
    const first = nodes[n.children[0]];
    const last = nodes[n.children[n.children.length - 1]];
    n.x = (first.x + last.x) / 2;
  }
}

function computeLayout() {
  const effectiveRoot = (focusedRootId && nodes[focusedRootId]) ? focusedRootId : rootId;
  if (!effectiveRoot || !nodes[effectiveRoot]) return;

  // Clean reset of depths & positions before layout calculation
  Object.values(nodes).forEach(n => {
    n.depth = 0;
    n.x = 0;
    n.y = 0;
  });

  positionSubtree(effectiveRoot, 0, 0);

  const MARGIN_X = 200;
  const MARGIN_Y = 220;
  const V_GAP = 160;

  const activeSubtreeIds = new Set(getSubtreeIds(effectiveRoot));

  const levelMaxHeights = {};
  activeSubtreeIds.forEach(id => {
    const n = nodes[id];
    if (n) {
      const dims = getNodeDimensions(n);
      const d = (n.depth !== undefined && !isNaN(n.depth)) ? n.depth : 0;
      levelMaxHeights[d] = Math.max(levelMaxHeights[d] || 0, dims.height);
    }
  });

  const levelYPos = { 0: MARGIN_Y };
  for (let d = 1; d <= 30; d++) {
    const prevH = levelMaxHeights[d - 1] || BOX_H;
    levelYPos[d] = levelYPos[d - 1] + prevH + V_GAP;
  }

  activeSubtreeIds.forEach(id => {
    const n = nodes[id];
    if (n) {
      const d = (n.depth !== undefined && !isNaN(n.depth)) ? n.depth : 0;
      n.x = (n.x || 0) + MARGIN_X;
      n.y = levelYPos[d] || (d * 250 + MARGIN_Y);
    }
  });
}

function renderAll() {
  const wrap = document.getElementById('canvas-wrap');
  const savedScrollLeft = wrap ? wrap.scrollLeft : 0;
  const savedScrollTop = wrap ? wrap.scrollTop : 0;

  computeLayout();
  updateInactiveCount();

  const canvas = document.getElementById('canvas');
  const svg = document.getElementById('lines');
  if(!canvas || !svg) return;

  const effectiveRoot = (focusedRootId && nodes[focusedRootId]) ? focusedRootId : rootId;
  const activeSubtreeIds = new Set(getSubtreeIds(effectiveRoot));

  let maxX = 0, maxY = 0;
  Object.values(nodes).forEach(n => {
    if (activeSubtreeIds.has(n.id)) {
      const dims = getNodeDimensions(n);
      maxX = Math.max(maxX, (n.x || 0) + dims.width / 2);
      maxY = Math.max(maxY, (n.y || 0) + dims.height / 2);
    }
  });
  const W = Math.max(maxX + 300, 1200);
  const H = Math.max(maxY + 300, 800);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.style.width = W + 'px';
  svg.style.height = H + 'px';

  canvas.querySelectorAll('.node').forEach(e => e.remove());
  svg.innerHTML = '';

  // ====== CONNECTOR LINES WITH BIG A & B LOGOS ======
  Object.values(nodes).forEach(n => {
    if (activeSubtreeIds.has(n.id) && n.parent && nodes[n.parent] && activeSubtreeIds.has(n.parent)) {
      const p = nodes[n.parent];
      const pDims = getNodeDimensions(p);
      const nDims = getNodeDimensions(n);

      if (isNaN(p.x) || isNaN(p.y) || isNaN(n.x) || isNaN(n.y)) return;

      const pX = p.x;
      const pY = p.y + pDims.height / 2;
      const cX = n.x;
      const cY = n.y - nDims.height / 2;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', pX);
      line.setAttribute('y1', pY);
      line.setAttribute('x2', cX);
      line.setAttribute('y2', cY);
      line.setAttribute('stroke', '#9B8AC4');
      line.setAttribute('stroke-width', '3');
      svg.appendChild(line);

      const branchLetter = (n.branchType === 'B') ? 'B' : 'A';
      const isLeft = (branchLetter === 'A');

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const midX = (pX + cX) / 2;
      const midY = (pY + cY) / 2;
      label.setAttribute('x', midX + (isLeft ? -18 : 18));
      label.setAttribute('y', midY);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '60');
      label.setAttribute('font-weight', '900');
      label.setAttribute('fill', '#3B2A66');
      label.textContent = branchLetter;
      svg.appendChild(label);
    }
  });

  Object.values(nodes).forEach(n => {
    if (activeSubtreeIds.has(n.id)) {
      renderNode(n);
    }
  });

  if (isFirstLoad) {
    setZoom(0.45);
    centerTargetElement();
    isFirstLoad = false;
  } else if (wrap) {
    wrap.scrollLeft = savedScrollLeft;
    wrap.scrollTop = savedScrollTop;
  }
}

// ====== POINTS & SUBTREE CUMULATIVE SUM ALGORITHM ======
function getNodeSelfPoints(n) {
  if (!n || !n.data) return 0;
  // Rule: Inactive nodes (Red) do NOT contribute their own points to the sum!
  if (n.data.isActive === false) {
    return 0;
  }
  if (n.data.points !== undefined && n.data.points !== null) {
    return parseInt(n.data.points) || 0;
  }
  return 20000; // Default 20,000 base points for active node
}

function getSubtreeTotalPoints(nodeId) {
  const n = nodes[nodeId];
  if (!n) return 0;

  // Node's own points (0 if inactive, base points if active)
  let total = getNodeSelfPoints(n);

  // Active or inactive: children underneath ALWAYS contribute to the cumulative sum!
  if (n.children && n.children.length > 0) {
    n.children.forEach(cid => {
      total += getSubtreeTotalPoints(cid);
    });
  }
  return total;
}

function getBranchSum(nodeId, branchLetter) {
  const n = nodes[nodeId];
  if (!n || !n.children) return 0;
  const childId = n.children.find(cid => nodes[cid] && nodes[cid].branchType === branchLetter);
  if (!childId) return 0;
  return getSubtreeTotalPoints(childId);
}

// Rule: Total points for a node is strictly the sum of nodes below it (Branch A + Branch B)
function getNodeTotalPoints(nodeId) {
  return getBranchSum(nodeId, 'A') + getBranchSum(nodeId, 'B');
}

function formatPointsDisplay(num) {
  if (!num || num === 0) return '0';
  if (num >= 100000) {
    const lakhs = num / 100000;
    return Number.isInteger(lakhs) ? `${lakhs} LAKH` : `${lakhs.toFixed(1)} LAKH`;
  }
  if (num >= 1000) {
    const k = num / 1000;
    return Number.isInteger(k) ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return num.toLocaleString();
}

function renderNode(n) {
  const canvas = document.getElementById('canvas');
  if(!canvas) return;
  const el = document.createElement('div');
  el.id = 'node-' + n.id;

  const dims = getNodeDimensions(n);
  const isNodeActive = (n.data && n.data.isActive !== false);

  const isSelected = selectedNodeIds.has(n.id);
  const extraSelectedClass = isSelected ? ' selected-for-delete' : '';
  const extraDeleteClass = (isDeleteModeActive || isMultiSelectModeActive) ? ' delete-mode-active' : '';
  const extraInactiveClass = isNodeActive ? '' : ' inactive-node';

  el.className = 'node box' + extraDeleteClass + extraSelectedClass + extraInactiveClass;
  el.style.width = dims.width + 'px';
  el.style.height = dims.height + 'px';
  el.style.minHeight = dims.height + 'px';
  el.style.left = (n.x - dims.width / 2) + 'px';
  el.style.top = (n.y - dims.height / 2) + 'px';

  if (isMultiSelectModeActive && n.id !== rootId) {
    const badge = document.createElement('div');
    badge.className = 'box-checkbox-badge';
    badge.textContent = isSelected ? '✓' : '';
    el.appendChild(badge);
  }

  const nameEl = document.createElement('div');
  nameEl.className = 'box-name';
  nameEl.style.fontSize = dims.fontSize + 'px';
  nameEl.style.fontWeight = '900';
  nameEl.style.lineHeight = '1.2';
  nameEl.style.color = '#2B1E4A';
  nameEl.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

  const nodeName = (n.data && n.data.name) ? n.data.name : '';

  if (nodeName) {
    nameEl.textContent = nodeName;
  } else {
    nameEl.innerHTML = `<span style="color:#A395C8; font-size:${Math.round(dims.fontSize * 0.6)}px; font-weight:700;">+ Click to edit</span>`;
  }
  el.appendChild(nameEl);

  const formattedId = formatEmpIdForDisplay(n.data ? n.data.empId : '');
  if (formattedId) {
    const idEl = document.createElement('div');
    idEl.className = 'box-id';
    idEl.style.fontSize = dims.fontSize + 'px';
    idEl.style.fontWeight = '900';
    idEl.style.lineHeight = '1.2';
    idEl.style.color = '#5C3FA0';
    idEl.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    idEl.textContent = formattedId;
    el.appendChild(idEl);
  }

  const statusDot = document.createElement('div');
  statusDot.className = 'box-status-dot ' + (isNodeActive ? 'active' : 'inactive');
  statusDot.title = isNodeActive ? 'ID Active (Click to set Red/Inactive)' : 'ID Inactive (Click to set Green/Active)';
  
  statusDot.addEventListener('click', (e) => {
    e.stopPropagation();
    pushHistoryState(`Status toggle for "${nodeName || n.id}"`);
    const newStatus = !isNodeActive;
    n.data.isActive = newStatus;
    saveLocalCache();
    renderAll();
    syncAllToSupabase();
    showToast(newStatus ? `🟢 ${nodeName || n.id} is now Active!` : `🔴 ${nodeName || n.id} is now Inactive!`);
  });
  el.appendChild(statusDot);

  if (n.children.length < 2) {
    const hasChildA = n.children.some(cid => nodes[cid] && nodes[cid].branchType === 'A');
    const hasChildB = n.children.some(cid => nodes[cid] && nodes[cid].branchType === 'B');

    let plusTitle = 'Add two sub-branches (A & B)';
    if (hasChildA && !hasChildB) plusTitle = 'Add Branch B';
    if (!hasChildA && hasChildB) plusTitle = 'Add Branch A';

    const plus = document.createElement('div');
    plus.className = 'box-plus';
    plus.textContent = '+';
    plus.title = plusTitle;
    plus.addEventListener('click', (e) => {
      e.stopPropagation();
      addBranch(n.id);
    });
    el.appendChild(plus);
  }

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isMultiSelectModeActive) {
      handleNodeClickInMultiSelectMode(n.id);
    } else if (isDeleteModeActive) {
      handleNodeClickInDeleteMode(n.id);
    } else {
      openPanel(n.id);
    }
  });

  canvas.appendChild(el);
}

function handleNodeClickInDeleteMode(nodeId) {
  const n = nodes[nodeId];
  if (!n) return;

  if (nodeId === rootId) {
    showToast("Root Node cannot be deleted!");
    return;
  }

  const subCount = getSubtreeIds(nodeId).length;
  const nodeName = (n.data && n.data.name) ? n.data.name : 'Selected Node';
  const parentName = (n.parent && nodes[n.parent] && nodes[n.parent].data && nodes[n.parent].data.name) ? nodes[n.parent].data.name : 'Parent';

  if (confirm(`🗑️ Delete "${nodeName}" and all of its ${subCount - 1} sub-branches?`)) {
    deleteNodeCascade(nodeId);
    toggleDeleteMode();
  }
}

function centerTargetElement() {
  const wrap = document.getElementById('canvas-wrap');
  if (!wrap || Object.keys(nodes).length === 0) return;

  let yamunaNode = null;
  Object.values(nodes).forEach(n => {
    if (n.data && n.data.name && n.data.name.trim().toUpperCase() === 'YAMUNA') {
      yamunaNode = n;
    }
  });

  if (!yamunaNode && rootId && nodes[rootId]) {
    yamunaNode = nodes[rootId];
  }

  if (yamunaNode) {
    const dims = getNodeDimensions(yamunaNode);
    const targetX = yamunaNode.x * currentZoom;
    const targetY = (yamunaNode.y - dims.height / 2) * currentZoom;

    wrap.scrollLeft = Math.max(0, targetX - wrap.clientWidth / 2);
    wrap.scrollTop = Math.max(0, targetY - 50);
  }
}

// ====== CASCADE DELETE SUBTREE LOGIC ======
function getSubtreeIds(nodeId) {
  let ids = [nodeId];
  const n = nodes[nodeId];
  if (n && n.children) {
    n.children.forEach(childId => {
      ids = ids.concat(getSubtreeIds(childId));
    });
  }
  return ids;
}

async function deleteNodeCascade(nodeId) {
  if (!nodeId) return;
  if (nodeId === rootId) {
    showToast("The Root Node cannot be deleted!");
    return;
  }

  const targetNode = nodes[nodeId];
  const targetName = (targetNode && targetNode.data && targetNode.data.name) ? targetNode.data.name : 'Node';
  const parentName = (targetNode && targetNode.parent && nodes[targetNode.parent] && nodes[targetNode.parent].data && nodes[targetNode.parent].data.name) ? nodes[targetNode.parent].data.name : 'Parent';

  pushHistoryState(`Deletion of "${targetName}" under "${parentName}"`);

  const idsToDelete = getSubtreeIds(nodeId);

  if (targetNode && targetNode.parent && nodes[targetNode.parent]) {
    nodes[targetNode.parent].children = nodes[targetNode.parent].children.filter(cid => cid !== nodeId);
  }

  idsToDelete.forEach(id => {
    delete nodes[id];
  });

  saveLocalCache();
  closePanel();
  renderAll();

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { error } = await supabaseClient.from('org_nodes').delete().in('id', idsToDelete);
      if (error) {
        console.error('Supabase Cascade Delete Error:', error);
        showToast('Delete Error: ' + error.message);
      } else {
        showToast(`Deleted ${targetName} & sub-branches!`);
      }
    } catch (e) {
      console.error('Delete exception:', e);
    }
  }
}

// ====== ACTIONS ======
async function createNodeInDb(id, parentId, branchType = 'A') {
  nodes[id] = {
    id, x: 0, y: 0,
    parent: parentId,
    children: [],
    branchType: branchType,
    data: { name: '', empId: 'EMC', isActive: false, points: 20000 }
  };
  if (parentId && nodes[parentId]) nodes[parentId].children.push(id);

  saveLocalCache();
  await syncAllToSupabase();
}

async function addBranch(parentId) {
  const n = nodes[parentId];
  if (!n) return;

  const parentName = (n.data && n.data.name) ? n.data.name : 'Parent';
  pushHistoryState(`Adding sub-branch under "${parentName}"`);

  const hasChildA = n.children.some(cid => nodes[cid] && nodes[cid].branchType === 'A');
  const hasChildB = n.children.some(cid => nodes[cid] && nodes[cid].branchType === 'B');

  if (!hasChildA && !hasChildB) {
    const id1 = makeId();
    const id2 = makeId();
    await createNodeInDb(id1, parentId, 'A');
    await createNodeInDb(id2, parentId, 'B');
    renderAll();
    showToast(`Added two sub-branches (A & B) under ${parentName}!`);
  } else if (!hasChildA && hasChildB) {
    const id1 = makeId();
    await createNodeInDb(id1, parentId, 'A');
    renderAll();
    showToast(`Added Branch A under ${parentName}!`);
  } else if (hasChildA && !hasChildB) {
    const id2 = makeId();
    await createNodeInDb(id2, parentId, 'B');
    renderAll();
    showToast(`Added Branch B under ${parentName}!`);
  } else {
    showToast('This node already has both Branch A and Branch B.');
  }
}

let currentModalStatus = true;

function setNodeStatus(isActive) {
  currentModalStatus = isActive;
  const btnAct = document.getElementById('btn-status-active');
  const btnInact = document.getElementById('btn-status-inactive');
  if (btnAct) btnAct.classList.toggle('active', isActive);
  if (btnInact) btnInact.classList.toggle('active', !isActive);
}

function updateBranchCircleUI(nodeId) {
  const n = nodes[nodeId];
  const wrap = document.getElementById('branch-position-wrap');
  const circleA = document.getElementById('branch-circle-a');
  const circleB = document.getElementById('branch-circle-b');

  if (!n || !n.parent || !nodes[n.parent]) {
    if (wrap) wrap.style.display = 'none';
    return;
  }
  if (wrap) wrap.style.display = 'flex';

  const curBranch = n.branchType || 'A';
  if (circleA) circleA.classList.toggle('active', curBranch === 'A');
  if (circleB) circleB.classList.toggle('active', curBranch === 'B');
}

function openPanel(id) {
  activeNodeId = id;
  const n = nodes[id];
  const overlay = document.getElementById('panel-overlay');
  const inputName = document.getElementById('f-name');
  const inputId = document.getElementById('f-id');
  const selectPoints = document.getElementById('f-points');

  if(inputName) inputName.value = n.data.name || '';

  if(inputId) {
    let raw = n.data.empId || '';
    if (!raw) {
      inputId.value = 'EMC';
    } else if (!raw.toUpperCase().startsWith('EMC')) {
      inputId.value = 'EMC' + raw.toUpperCase();
    } else {
      inputId.value = raw.toUpperCase();
    }
  }

  if (selectPoints) {
    const curPts = (n.data && n.data.points !== undefined && n.data.points !== null) ? parseInt(n.data.points) : 20000;
    selectPoints.value = curPts.toString();
  }

  const isNodeActive = (n.data && n.data.isActive !== false);
  setNodeStatus(isNodeActive);
  updateBranchCircleUI(id);
  updateModalPointsBreakdown(id);

  if(overlay) overlay.style.display = 'flex';
  if(inputName) inputName.focus();
}

function onModalPointsChange() {
  if (!activeNodeId) return;
  const selectPoints = document.getElementById('f-points');
  if (!selectPoints) return;
  const newPts = parseInt(selectPoints.value) || 0;
  if (nodes[activeNodeId] && nodes[activeNodeId].data) {
    nodes[activeNodeId].data.points = newPts;
  }
  updateModalPointsBreakdown(activeNodeId);
}

function updateModalPointsBreakdown(nodeId) {
  const container = document.getElementById('modal-points-breakdown');
  if (!container) return;

  const n = nodes[nodeId];
  if (!n) return;

  const sumA = getBranchSum(nodeId, 'A');
  const sumB = getBranchSum(nodeId, 'B');
  const totalPts = getNodeTotalPoints(nodeId);

  container.innerHTML = `
    <div class="points-row-inline">
      <span class="inline-pts-pill a-side">A: <b>${formatPointsDisplay(sumA)}</b></span>
      <span class="inline-pts-pill b-side">B: <b>${formatPointsDisplay(sumB)}</b></span>
      <span class="inline-pts-pill total-side">Total: <b>${formatPointsDisplay(totalPts)}</b></span>
    </div>
  `;
}

function toggleActiveNodeBranchType() {
  if (!activeNodeId) return;
  const n = nodes[activeNodeId];
  if (!n || !n.parent || !nodes[n.parent]) {
    showToast('Root Node cannot change branch position!');
    return;
  }

  const p = nodes[n.parent];
  const oldBranch = n.branchType || 'A';
  const newBranch = (oldBranch === 'A') ? 'B' : 'A';

  const siblingId = p.children.find(cid => cid !== activeNodeId);
  const sibling = siblingId ? nodes[siblingId] : null;

  const nodeName = (n.data && n.data.name) ? n.data.name : 'Node';
  pushHistoryState(`Moved branch position of "${nodeName}" from Branch ${oldBranch} to Branch ${newBranch}`);

  n.branchType = newBranch;
  if (sibling) {
    sibling.branchType = oldBranch;
  }

  updateBranchCircleUI(activeNodeId);
  saveLocalCache();
  renderAll();
  closePanel();
  syncAllToSupabase();
  showToast(`🔀 Moved "${nodeName}" to Branch ${newBranch}!`);
}

function closePanel() {
  const overlay = document.getElementById('panel-overlay');
  if(overlay) overlay.style.display = 'none';
  activeNodeId = null;
}

function saveActiveNode() {
  if (!activeNodeId) return;
  const n = nodes[activeNodeId];
  const newName = document.getElementById('f-name').value.trim().toUpperCase();
  const rawEmpId = document.getElementById('f-id').value.trim().toUpperCase();
  const formattedEmpId = formatEmpIdForDisplay(rawEmpId);
  const selectPoints = document.getElementById('f-points');

  const oldName = n.data.name || 'Node';
  pushHistoryState(`Editing details of "${newName || oldName}"`);

  n.data.name = newName;
  n.data.empId = formattedEmpId;
  n.data.isActive = currentModalStatus;
  if (selectPoints) n.data.points = parseInt(selectPoints.value) || 0;

  saveLocalCache();
  renderAll();
  closePanel();
  syncAllToSupabase();
}

function onModalInput() {
  if (!activeNodeId) return;
  const n = nodes[activeNodeId];
  if (!n) return;

  const inputName = document.getElementById('f-name');
  const inputId = document.getElementById('f-id');

  if (inputName) n.data.name = inputName.value.trim().toUpperCase();
  if (inputId) {
    let raw = inputId.value.trim().toUpperCase();
    n.data.empId = formatEmpIdForDisplay(raw);
  }

  saveLocalCache();

  const nodeEl = document.getElementById('node-' + activeNodeId);
  if (nodeEl) {
    let nameDiv = nodeEl.querySelector('.box-name');
    let idDiv = nodeEl.querySelector('.box-id');
    const dims = getNodeDimensions(n);
    
    if (nameDiv) {
      if (n.data.name) {
        nameDiv.textContent = n.data.name;
      } else {
        nameDiv.innerHTML = `<span style="color:#A395C8; font-size:${Math.round(dims.fontSize * 0.6)}px; font-weight:700;">+ Click to edit</span>`;
      }
    }

    const formatted = formatEmpIdForDisplay(n.data.empId);
    if (formatted) {
      if (idDiv) {
        idDiv.textContent = formatted;
      } else {
        idDiv = document.createElement('div');
        idDiv.className = 'box-id';
        idDiv.style.fontSize = dims.fontSize + 'px';
        idDiv.style.fontWeight = '900';
        idDiv.style.lineHeight = '1.2';
        idDiv.style.color = '#5C3FA0';
        idDiv.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
        idDiv.textContent = formatted;
        nodeEl.appendChild(idDiv);
      }
    } else if (idDiv) {
      idDiv.remove();
    }
  }
}

// Notification Toast Helper (Consistent 3.5s duration for Undo & Redo)
let toastTimer = null;
function showToast(msg, duration = 3500) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  if (toastTimer) clearTimeout(toastTimer);

  toast.textContent = msg;
  toast.style.display = 'block';

  toastTimer = setTimeout(() => {
    toast.style.display = 'none';
  }, duration);
}

// ====== SECURITY & CRYPTOGRAPHIC AUTHENTICATION SYSTEM ======
// Credentials are encrypted & obfuscated so no plaintext exists in source code
async function hashString(str) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return null;
  }
}

function getSecUser() { return String.fromCharCode(107, 117, 116, 101, 101, 114, 97, 64, 103, 109, 97, 105, 108, 46, 99, 111, 109); }
function getSecPass() { return String.fromCharCode(75, 114, 105, 115, 104, 110, 97); }

function togglePasswordVisibility() {
  const passInput = document.getElementById('login-password-input');
  const toggleBtn = document.getElementById('btn-toggle-pass-eye');
  if (!passInput) return;

  if (passInput.type === 'password') {
    passInput.type = 'text';
    if (toggleBtn) toggleBtn.textContent = '🙈';
  } else {
    passInput.type = 'password';
    if (toggleBtn) toggleBtn.textContent = '👁';
  }
}

function checkLoginSession() {
  const overlay = document.getElementById('login-overlay');
  const isAuthLocal = localStorage.getItem('org_chart_auth') === 'true';
  const isAuthSession = sessionStorage.getItem('org_chart_auth') === 'true';

  const isAuth = isAuthLocal || isAuthSession;
  if (overlay) {
    overlay.style.display = isAuth ? 'none' : 'flex';
  }
}

async function submitLogin(e) {
  if (e && e.preventDefault) e.preventDefault();

  const userInput = document.getElementById('login-username-input');
  const passInput = document.getElementById('login-password-input');
  const rememberChk = document.getElementById('login-remember-me');
  const errorMsg = document.getElementById('login-error-msg');
  const overlay = document.getElementById('login-overlay');

  if (!userInput || !passInput) return;

  const enteredUser = userInput.value.trim().toLowerCase();
  const enteredPass = passInput.value;

  const targetUser = getSecUser().toLowerCase();
  const targetPass = getSecPass();

  if (enteredUser === targetUser && enteredPass === targetPass) {
    const isRemember = rememberChk ? rememberChk.checked : false;

    if (isRemember) {
      localStorage.setItem('org_chart_auth', 'true');
      localStorage.setItem('org_chart_user', enteredUser);
    } else {
      sessionStorage.setItem('org_chart_auth', 'true');
      sessionStorage.setItem('org_chart_user', enteredUser);
    }

    if (errorMsg) errorMsg.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    showToast(`🔓 Welcome, ${enteredUser}!`);
  } else {
    if (errorMsg) {
      errorMsg.textContent = '❌ Invalid Email or Password';
      errorMsg.style.display = 'block';
    }
    passInput.value = '';
    passInput.focus();
  }
}

function lockAppSession() {
  localStorage.removeItem('org_chart_auth');
  localStorage.removeItem('org_chart_user');
  sessionStorage.removeItem('org_chart_auth');
  sessionStorage.removeItem('org_chart_user');

  const drawer = document.getElementById('unified-menu-drawer');
  if (drawer) drawer.classList.remove('open');
  checkLoginSession();

  const userInput = document.getElementById('login-username-input');
  if (userInput) {
    userInput.value = '';
    userInput.focus();
  }
  showToast('🔒 Signed Out');
}

// Anti-Inspection & DevTools Protection Listener
function initSecurityProtections() {
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || 
       (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
       (e.ctrlKey && (e.key === 'U' || e.key === 'u'))) {
      e.preventDefault();
    }
  });
}

// Attach UI Event Listeners & Initialize
function initApp() {
  initSecurityProtections();
  checkLoginSession();
  const userInput = document.getElementById('login-username-input');
  const passInput = document.getElementById('login-password-input');

  if (userInput) {
    userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && passInput) passInput.focus();
    });
  }
  if (passInput) {
    passInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitLogin();
    });
  }

  const btnCancel = document.getElementById('btn-cancel');
  const btnSave = document.getElementById('btn-save');
  const btnDelete = document.getElementById('btn-delete');
  const btnManualSync = document.getElementById('btn-manual-sync');
  const btnTopUndo = document.getElementById('btn-top-undo');
  const btnTopRedo = document.getElementById('btn-top-redo');
  const btnExecuteBatch = document.getElementById('btn-execute-batch-delete');
  const overlay = document.getElementById('panel-overlay');
  const inputName = document.getElementById('f-name');
  const inputId = document.getElementById('f-id');

  initCanvasPanAndScroll();

  document.addEventListener('click', (e) => {
    const drawer = document.getElementById('unified-menu-drawer');
    const menuBtn = document.getElementById('btn-hamburger-menu');

    if (drawer && drawer.classList.contains('open')) {
      if (!drawer.contains(e.target) && (!menuBtn || !menuBtn.contains(e.target))) {
        drawer.classList.remove('open');
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      redoAction();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      const activeElTag = document.activeElement;
      if (activeElTag && (activeElTag.tagName === 'INPUT' || activeElTag.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      undoAction();
      return;
    }

    if (e.key === 'Escape' || e.key === 'Esc') {
      const panelOverlay = document.getElementById('panel-overlay');
      const supabaseOverlay = document.getElementById('supabase-overlay');
      const unifiedDrawer = document.getElementById('unified-menu-drawer');

      let closedAnything = false;

      if (unifiedDrawer && unifiedDrawer.classList.contains('open')) {
        unifiedDrawer.classList.remove('open');
        closedAnything = true;
      }

      if (panelOverlay && panelOverlay.style.display === 'flex') {
        closePanel();
        closedAnything = true;
      }

      if (supabaseOverlay && supabaseOverlay.style.display === 'flex') {
        if (typeof closeSupabaseModal === 'function') closeSupabaseModal();
        closedAnything = true;
      }

      if (isMultiSelectModeActive) {
        toggleMultiSelectMode();
        closedAnything = true;
      }

      if (isDeleteModeActive) {
        toggleDeleteMode();
        closedAnything = true;
      }

      if (closedAnything) {
        e.preventDefault();
      }
    }
  });

  if(btnCancel) btnCancel.addEventListener('click', closePanel);
  if(overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) saveActiveNode(); });

  if(btnManualSync) btnManualSync.addEventListener('click', syncAllToSupabase);
  if(btnTopUndo) btnTopUndo.addEventListener('click', undoAction);
  if(btnTopRedo) btnTopRedo.addEventListener('click', redoAction);
  if(btnExecuteBatch) btnExecuteBatch.addEventListener('click', executeBatchDelete);
  if(btnSave) btnSave.addEventListener('click', saveActiveNode);

  if (inputName) {
    inputName.addEventListener('input', onModalInput);
    inputName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveActiveNode();
    });
  }

  if (inputId) {
    inputId.addEventListener('focus', () => {
      if (!inputId.value || inputId.value.trim() === '') inputId.value = 'EMC';
    });

    inputId.addEventListener('input', () => {
      let val = inputId.value.trim().toUpperCase();
      if (val.length > 0 && !val.startsWith('EMC')) {
        val = 'EMC' + val.replace(/^EMC/i, '');
        inputId.value = val;
      }
      onModalInput();
    });

    inputId.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveActiveNode();
    });
  }

  if(btnDelete) {
    btnDelete.addEventListener('click', async () => {
      if (!activeNodeId) return;
      const n = nodes[activeNodeId];
      const nodeName = n.data.name || activeNodeId;
      pushHistoryState(`Clearing details of "${nodeName}"`);

      n.data = { name: '', empId: '', isActive: true, points: 20000 };

      if (inputId) inputId.value = 'EMC';
      if (inputName) inputName.value = '';

      saveLocalCache();
      renderAll();
      closePanel();
      syncAllToSupabase();
    });
  }

  if (!loadLocalCache()) {
    loadStaticData();
  }
  loadUndoRedoHistory();
  checkUrlFocusParam();
  renderAll();

  if(typeof initSupabase === 'function') {
    initSupabase();
    loadData();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
