/**
 * LabVIEW-Inspired 2D Vector Canvas Engine for Task Editor
 * - Staircase Cascading Multi-Column Vertical Pipelines (Top-to-Bottom with 3/4 Block Height Cascade & Staggered Steps)
 * - Single-Line Command Blocks (Slim Height 56px, Distinct Title Bar Colors for Math/Bat/PS1/Exe/IF/Loop/Pause)
 * - Exact Match Inter-Column U-Turn Rise Wires & Intra-Column Stepped S-Curve Connections
 * - Dual Axis Scrollbars (Vertical + Horizontal)
 * - Animated Live Flow Pulses & Sleek Compact Arrowheads + Click-to-Cut Scissor (✂) Badges
 * - One-Click "Reset Wires" Auto-Routing & Right-Click Context Menu Support
 * 100% Offline, Pure Canvas 2D API (Zero Dependencies)
 */

class GraphCanvasEngine {
  constructor(canvasElement, scrollbarElements = {}, options = {}) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    
    // Vertical scrollbar DOM elements
    this.scrollTrack = scrollbarElements.track || null;
    this.scrollThumb = scrollbarElements.thumb || null;

    // Horizontal scrollbar DOM elements
    this.hScrollTrack = scrollbarElements.hTrack || null;
    this.hScrollThumb = scrollbarElements.hThumb || null;
    
    // Nodes & Connections
    this.nodes = [];
    this.connections = []; // { id, fromNodeId, toNodeId, fromPin, toPin, isDataWire, waypoint: {x, y} }
    
    // Layout Mode: 'horizontal', 'vertical_1col', 'vertical_2col', 'vertical_3col', 'vertical_4col'
    this.layoutMode = 'horizontal';

    // Viewport Transform (Pan & Zoom)
    this.scale = 1.0;
    this.minScale = 0.2;
    this.maxScale = 2.5;
    this.offsetX = 80;
    this.offsetY = 90;
    
    // Interaction States
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;
    
    this.isThumbDragging = false;
    this.thumbStartY = 0;
    this.thumbStartOffsetY = 0;

    this.isHThumbDragging = false;
    this.hThumbStartX = 0;
    this.hThumbStartOffsetX = 0;
    
    this.draggedNode = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    // Draggable Wire Waypoint (Full 2D: X & Y)
    this.draggedWaypointWire = null;
    this.hoveredWire = null;
    this.hoveredHandleWire = null;
    
    this.selectedNode = null;
    this.hoveredNode = null;
    this.hoveredPin = null;
    
    // Live Wire Creation & Wire Selection
    this.activeWiring = null;
    this.selectedWire = null;
    
    // Smooth Animation Timer
    this.animTime = 0;
    
    // Callbacks
    this.onNodeClick = options.onNodeClick || (() => {});
    this.onNodeDoubleClicked = options.onNodeDoubleClicked || (() => {});
    this.onEquationEdit = options.onEquationEdit || (() => {});
    this.onCanvasModified = options.onCanvasModified || (() => {});
    this.onContextMenu = options.onContextMenu || (() => {});
    this.onNodeDeleteRequested = options.onNodeDeleteRequested || (() => {});
    
    this.initEvents();
    this.initScrollbarEvents();
    this.resize();
    this.startLoop();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const parent = this.canvas.parentElement;
    let w = parent ? parent.clientWidth : window.innerWidth;
    let h = parent ? parent.clientHeight : (window.innerHeight - 66);

    if (w <= 50) w = window.innerWidth || 1200;
    if (h <= 50) h = (window.innerHeight - 66) || 700;

    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.dpr = dpr;
    this.updateScrollbar();
  }

  setLayoutMode(mode) {
    this.layoutMode = mode;
    this.resetWires();
    this.autoLayout();
    this.fitAll();
    this.onCanvasModified();
  }

  resetWires() {
    for (let conn of this.connections) {
      conn.waypoint = null;
    }
    this.selectedWire = null;
    this.onCanvasModified();
  }

  setNodes(nodes, preserveConnections = false) {
    this.nodes = nodes;
    if (!preserveConnections) {
      this.rebuildSequentialFlow();
    }
    this.updateIsolatedStates();
    this.autoLayout();
    this.updateScrollbar();
  }

  rebuildSequentialFlow() {
    this.connections = [];
    const sorted = [...this.nodes].sort((a, b) => a.sequence - b.sequence);
    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i];
      const to = sorted[i + 1];
      this.connections.push({
        id: `wire_${from.id}_${to.id}`,
        fromNodeId: from.id,
        toNodeId: to.id,
        fromPin: 'flow_out',
        toPin: 'flow_in',
        isDataWire: false,
        waypoint: null
      });
    }
    this.updateIsolatedStates();
  }

  updateIsolatedStates() {
    const connectedNodeIds = new Set();
    for (let conn of this.connections) {
      connectedNodeIds.add(conn.fromNodeId);
      connectedNodeIds.add(conn.toNodeId);
    }

    for (let node of this.nodes) {
      node.isIsolated = !connectedNodeIds.has(node.id);
    }
  }

  /**
   * Helper to compute dynamic block height:
   * - Compact structural markers (else, endif, endloop, endswitch, default) = 42px
   * - Return, Break, Continue = 44-48px
   * - Single line commands (math, var, bat, ps1, exe, pause, loop, switch) = 56-58px
   * - IF condition branch = 68px
   * - Full .rec or .blk with variables list = 64-90px+
   */
  computeNodeHeight(node) {
    if (node.type === 'else' || node.type === 'endif' || node.type === 'endloop' || node.type === 'endswitch' || node.type === 'default') {
      return 42;
    }
    if (node.type === 'break' || node.type === 'continue') {
      return 44;
    }
    if (node.type === 'case') {
      return 46;
    }
    if (node.type === 'return') {
      return 48;
    }
    if (node.type === 'if' || node.type === 'branch') {
      return 68;
    }
    if (node.type === 'loop' || node.type === 'switch') {
      return 58;
    }
    if (node.type === 'image_search' || node.type === 'ocr') {
      return 64;
    }
    if (node.type === 'unknown_error') {
      return 58;
    }
    const isSingleLineCmd = (node.type === 'math' || node.type === 'var' || node.type === 'bat' || node.type === 'ps1' || node.type === 'exe' || node.type === 'pause');
    if (isSingleLineCmd) {
      return 56;
    }
    if (node.type === 'blk') {
      return 58;
    }
    const varKeys = node.variables ? Object.keys(node.variables) : [];
    if (varKeys.length === 0) {
      return 56;
    }
    return Math.max(64, 32 + varKeys.length * 18);
  }

  /**
   * Auto Layout supporting Horizontal Grid and Staircase Cascading Vertical Pipelines (1, 2, 3, 4 Cols)
   */
  autoLayout() {
    const sorted = [...this.nodes].sort((a, b) => a.sequence - b.sequence);
    const N = sorted.length;
    if (N === 0) return;

    if (this.layoutMode.startsWith('vertical')) {
      let numCols = 1;
      if (this.layoutMode === 'vertical_2col') numCols = 2;
      else if (this.layoutMode === 'vertical_3col') numCols = 3;
      else if (this.layoutMode === 'vertical_4col') numCols = 4;

      if (numCols === 1) {
        // Single straight column
        const startX = 160;
        let currentY = 70;
        sorted.forEach((node) => {
          node.x = startX;
          node.y = currentY;
          node.width = 220;
          node.height = this.computeNodeHeight(node);
          currentY += node.height + 40;
        });
      } else {
        // Multi-Column Cascading Staircase Layout
        const rowsPerCol = Math.max(1, Math.ceil(N / numCols));
        const colWidth = numCols >= 3 ? 190 : 210;
        const staggerX = 45; // Step-down horizontal shift
        const cascadeStepY = Math.round(90 * 0.75); // 3/4 block height (~68px)
        const colGroupWidth = colWidth + (rowsPerCol - 1) * staggerX + 80;
        const startX = 130;
        const startY = 60;

        let colItems = Array.from({ length: numCols }, () => []);
        sorted.forEach((node, i) => {
          const c = Math.min(Math.floor(i / rowsPerCol), numCols - 1);
          colItems[c].push(node);
        });

        colItems.forEach((colList, c) => {
          const colBaseX = startX + c * colGroupWidth;
          const colBaseY = startY + c * cascadeStepY;
          let currentY = colBaseY;

          colList.forEach((node, r) => {
            node.x = colBaseX + r * staggerX;
            node.y = currentY;
            node.width = colWidth;
            node.height = this.computeNodeHeight(node);

            currentY += node.height + 38;
          });
        });
      }
    } else {
      // Default: Horizontal Flow Grid (Left to Right, 4 Columns)
      const spacingX = 260;
      const startX = 130;
      const startY = 70;
      const maxCols = 4;

      sorted.forEach((node, i) => {
        const col = i % maxCols;
        const row = Math.floor(i / maxCols);
        node.x = startX + col * spacingX;
        node.y = startY + row * 210;
        node.width = 200;
        node.height = this.computeNodeHeight(node);
      });
    }
  }

  fitAll() {
    if (this.nodes.length === 0) {
      this.resetView();
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let n of this.nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }

    const padding = 60;
    const totalW = (maxX - minX) + padding * 2;
    const totalH = (maxY - minY) + padding * 2;

    const canvasW = this.canvas.width / (this.dpr || 1);
    const canvasH = this.canvas.height / (this.dpr || 1);

    if (canvasW <= 0 || canvasH <= 0) return;

    const scaleX = canvasW / totalW;
    const scaleY = canvasH / totalH;
    this.scale = Math.min(Math.max(Math.min(scaleX, scaleY), this.minScale), 1.0);

    this.offsetX = (canvasW - (maxX - minX) * this.scale) / 2 - minX * this.scale;
    this.offsetY = (canvasH - (maxY - minY) * this.scale) / 2 - minY * this.scale + 20;
    this.updateScrollbar();
  }

  updateScrollbar() {
    if (this.nodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let n of this.nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }

    const viewWidth = this.canvas.width / (this.dpr || 1);
    const viewHeight = this.canvas.height / (this.dpr || 1);

    // 1. Vertical Scrollbar Update
    if (this.scrollTrack && this.scrollThumb) {
      const contentHeight = Math.max((maxY - minY + 300) * this.scale, 600);
      const trackHeight = this.scrollTrack.clientHeight || 300;

      const thumbHeight = Math.max(30, Math.min(trackHeight, (viewHeight / contentHeight) * trackHeight));
      this.scrollThumb.style.height = `${thumbHeight}px`;

      const scrollRangeY = contentHeight - viewHeight;
      if (scrollRangeY <= 0) {
        this.scrollThumb.style.top = '0px';
      } else {
        const currentScrollY = -(this.offsetY - 90);
        const scrollRatioY = Math.max(0, Math.min(1, currentScrollY / scrollRangeY));
        const thumbTop = scrollRatioY * (trackHeight - thumbHeight);
        this.scrollThumb.style.top = `${thumbTop}px`;
      }
    }

    // 2. Horizontal Scrollbar Update (Left to Right)
    if (this.hScrollTrack && this.hScrollThumb) {
      const contentWidth = Math.max((maxX - minX + 500) * this.scale, 800);
      const trackWidth = this.hScrollTrack.clientWidth || 400;

      const thumbWidth = Math.max(40, Math.min(trackWidth, (viewWidth / contentWidth) * trackWidth));
      this.hScrollThumb.style.width = `${thumbWidth}px`;

      const scrollRangeX = contentWidth - viewWidth;
      if (scrollRangeX <= 0) {
        this.hScrollThumb.style.left = '0px';
      } else {
        const currentScrollX = -(this.offsetX - 80);
        const scrollRatioX = Math.max(0, Math.min(1, currentScrollX / scrollRangeX));
        const thumbLeft = scrollRatioX * (trackWidth - thumbWidth);
        this.hScrollThumb.style.left = `${thumbLeft}px`;
      }
    }
  }

  initScrollbarEvents() {
    // 1. Vertical Scrollbar Dragging
    if (this.scrollThumb && this.scrollTrack) {
      this.scrollThumb.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.isThumbDragging = true;
        this.thumbStartY = e.clientY;
        this.thumbStartOffsetY = this.offsetY;
        this.scrollThumb.classList.add('dragging');
      });

      this.scrollTrack.addEventListener('mousedown', (e) => {
        if (e.target === this.scrollThumb) return;
        const rect = this.scrollTrack.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const trackHeight = rect.height;
        const thumbHeight = this.scrollThumb.clientHeight;
        const targetRatio = Math.max(0, Math.min(1, (clickY - thumbHeight / 2) / (trackHeight - thumbHeight)));

        const viewHeight = this.canvas.height / (this.dpr || 1);
        const contentHeight = Math.max(1200 * this.scale, 800);
        const scrollRange = contentHeight - viewHeight;

        this.offsetY = 90 - (targetRatio * scrollRange);
        this.updateScrollbar();
      });
    }

    // 2. Horizontal Scrollbar Dragging (Left/Right)
    if (this.hScrollThumb && this.hScrollTrack) {
      this.hScrollThumb.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.isHThumbDragging = true;
        this.hThumbStartX = e.clientX;
        this.hThumbStartOffsetX = this.offsetX;
        this.hScrollThumb.classList.add('dragging');
      });

      this.hScrollTrack.addEventListener('mousedown', (e) => {
        if (e.target === this.hScrollThumb) return;
        const rect = this.hScrollTrack.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const trackWidth = rect.width;
        const thumbWidth = this.hScrollThumb.clientWidth;
        const targetRatio = Math.max(0, Math.min(1, (clickX - thumbWidth / 2) / (trackWidth - thumbWidth)));

        const viewWidth = this.canvas.width / (this.dpr || 1);
        const contentWidth = Math.max(1600 * this.scale, 1000);
        const scrollRangeX = contentWidth - viewWidth;

        this.offsetX = 80 - (targetRatio * scrollRangeX);
        this.updateScrollbar();
      });
    }

    // Window Mouse Move for Both Scrollbars
    window.addEventListener('mousemove', (e) => {
      if (this.isThumbDragging && this.scrollTrack && this.scrollThumb) {
        const dy = e.clientY - this.thumbStartY;
        const trackHeight = this.scrollTrack.clientHeight;
        const thumbHeight = this.scrollThumb.clientHeight;
        const availableTrack = trackHeight - thumbHeight;
        if (availableTrack > 0) {
          const deltaRatio = dy / availableTrack;
          const viewHeight = this.canvas.height / (this.dpr || 1);
          const contentHeight = Math.max(1200 * this.scale, 800);
          const scrollRange = contentHeight - viewHeight;
          this.offsetY = this.thumbStartOffsetY - (deltaRatio * scrollRange);
          this.updateScrollbar();
        }
      }

      if (this.isHThumbDragging && this.hScrollTrack && this.hScrollThumb) {
        const dx = e.clientX - this.hThumbStartX;
        const trackWidth = this.hScrollTrack.clientWidth;
        const thumbWidth = this.hScrollThumb.clientWidth;
        const availableTrack = trackWidth - thumbWidth;
        if (availableTrack > 0) {
          const deltaRatio = dx / availableTrack;
          const viewWidth = this.canvas.width / (this.dpr || 1);
          const contentWidth = Math.max(1600 * this.scale, 1000);
          const scrollRange = contentWidth - viewWidth;
          this.offsetX = this.hThumbStartOffsetX - (deltaRatio * scrollRange);
          this.updateScrollbar();
        }
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isThumbDragging) {
        this.isThumbDragging = false;
        if (this.scrollThumb) this.scrollThumb.classList.remove('dragging');
      }
      if (this.isHThumbDragging) {
        this.isHThumbDragging = false;
        if (this.hScrollThumb) this.hScrollThumb.classList.remove('dragging');
      }
    });
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: wx * this.scale + this.offsetX,
      y: wy * this.scale + this.offsetY
    };
  }

  findNodeAt(wx, wy) {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      if (wx >= n.x && wx <= n.x + n.width && wy >= n.y && wy <= n.y + n.height) {
        return n;
      }
    }
    return null;
  }

  findPinAt(wx, wy) {
    const pinRadius = 11;
    const isVertical = this.layoutMode.startsWith('vertical');

    for (let node of this.nodes) {
      const h = this.computeNodeHeight(node);
      const isSlim = (h <= 70);

      // Flow Execution Out Pin (Bottom center in Vertical; Right in Horizontal)
      const flowOutX = isVertical ? (node.x + node.width / 2) : (node.x + node.width);
      const flowOutY = isVertical ? (node.y + h) : (node.y + 20);
      if (Math.hypot(wx - flowOutX, wy - flowOutY) <= pinRadius) {
        return { node, pinName: 'flow_out', x: flowOutX, y: flowOutY, type: 'out', isData: false };
      }

      // Flow Execution In Pin (Top center in Vertical; Left in Horizontal)
      const flowInX = isVertical ? (node.x + node.width / 2) : node.x;
      const flowInY = isVertical ? node.y : (node.y + 20);
      if (Math.hypot(wx - flowInX, wy - flowInY) <= pinRadius) {
        return { node, pinName: 'flow_in', x: flowInX, y: flowInY, type: 'in', isData: false };
      }

      // Variable Data Output Pin
      if (node.outVar) {
        const varOutX = node.x + node.width;
        const varOutY = isSlim ? (node.y + 38) : (node.y + 62);
        if (Math.hypot(wx - varOutX, wy - varOutY) <= pinRadius) {
          return { node, pinName: 'var_out', x: varOutX, y: varOutY, type: 'out', isData: true };
        }
      }

      // Variable Data Input Pin
      if (node.inVar) {
        const varInX = node.x;
        const varInY = isSlim ? (node.y + 38) : (node.y + 62);
        if (Math.hypot(wx - varInX, wy - varInY) <= pinRadius) {
          return { node, pinName: 'var_in', x: varInX, y: varInY, type: 'in', isData: true };
        }
      }

      if (node.type === 'if' || node.type === 'branch') {
        const trueOutX = node.x + node.width;
        const trueOutY = node.y + 36;
        if (Math.hypot(wx - trueOutX, wy - trueOutY) <= pinRadius) {
          return { node, pinName: 'true_out', x: trueOutX, y: trueOutY, type: 'out', isData: false };
        }
        const falseOutX = node.x + node.width;
        const falseOutY = node.y + 54;
        if (Math.hypot(wx - falseOutX, wy - falseOutY) <= pinRadius) {
          return { node, pinName: 'false_out', x: falseOutX, y: falseOutY, type: 'out', isData: false };
        }
      }
    }
    return null;
  }

  /**
   * Calculates the exact wire path points:
   * - In Vertical Multi-Column Layout:
   *   1. Intra-column stepped S-curve from item (r) to item (r+1)
   *   2. Inter-column U-turn rise wire from Col (C) bottom to Col (C+1) top
   * - In Horizontal Layout: Clean channel wrap-around routing
   */
  getWirePathPoints(conn, fromNode, toNode) {
    const isVertical = this.layoutMode.startsWith('vertical') && !conn.isDataWire;
    const fromH = this.computeNodeHeight(fromNode);
    const toH = this.computeNodeHeight(toNode);

    let startX = isVertical ? (fromNode.x + fromNode.width / 2) : (fromNode.x + fromNode.width);
    let startY = isVertical ? (fromNode.y + fromH) : (fromNode.y + 20);
    if (conn.fromPin === 'true_out') { startX = fromNode.x + fromNode.width; startY = fromNode.y + 36; }
    if (conn.fromPin === 'false_out') { startX = fromNode.x + fromNode.width; startY = fromNode.y + 54; }
    if (conn.fromPin === 'var_out') { startX = fromNode.x + fromNode.width; startY = fromH <= 70 ? (fromNode.y + 38) : (fromNode.y + 62); }

    let endX = isVertical ? (toNode.x + toNode.width / 2) : toNode.x;
    let endY = isVertical ? toNode.y : (toNode.y + 20);
    if (conn.toPin === 'var_in') { endX = toNode.x; endY = toH <= 70 ? (toNode.y + 38) : (toNode.y + 62); }

    // Full 2D Custom Waypoint Control (Up/Down wy AND Left/Right wx)
    if (conn.waypoint) {
      const wx = conn.waypoint.x;
      const wy = conn.waypoint.y;

      if (isVertical) {
        const midY2 = Math.min(Math.max(wy + 20, (wy + endY) / 2), endY - 12);
        return [
          { x: startX, y: startY },
          { x: startX, y: wy },
          { x: wx, y: wy },
          { x: wx, y: midY2 },
          { x: endX, y: midY2 },
          { x: endX, y: endY }
        ];
      } else {
        if (endX >= startX + 30) {
          return [
            { x: startX, y: startY },
            { x: wx, y: startY },
            { x: wx, y: wy },
            { x: (wx + endX) / 2, y: wy },
            { x: (wx + endX) / 2, y: endY },
            { x: endX, y: endY }
          ];
        } else {
          const leftStub = Math.min(endX - 25, wx - 40);
          return [
            { x: startX, y: startY },
            { x: wx, y: startY },
            { x: wx, y: wy },
            { x: leftStub, y: wy },
            { x: leftStub, y: endY },
            { x: endX, y: endY }
          ];
        }
      }
    }

    // Default Vertical Multi-Column Flowchart Routing (Exact User Diagram Style)
    if (isVertical) {
      if (toNode.y > fromNode.y) {
        // Intra-Column Downward S-curve (from item r to item r+1 within the same column)
        if (Math.abs(startX - endX) < 8) {
          return [
            { x: startX, y: startY },
            { x: endX, y: endY }
          ];
        } else {
          // Staggered S-curve dogleg: drops down half-way, steps horizontally, drops into top
          const midY = (startY + endY) / 2;
          return [
            { x: startX, y: startY },
            { x: startX, y: midY },
            { x: endX, y: midY },
            { x: endX, y: endY }
          ];
        }
      } else {
        // Inter-Column U-Turn Rise (from bottom of Col C to top of Col C+1)
        const bottomGutterY = startY + 22;
        const channelX = Math.max(fromNode.x + fromNode.width + 18, toNode.x - 28);
        const topGutterY = endY - 22;

        return [
          { x: startX, y: startY },
          { x: startX, y: bottomGutterY },
          { x: channelX, y: bottomGutterY },
          { x: channelX, y: topGutterY },
          { x: endX, y: topGutterY },
          { x: endX, y: endY }
        ];
      }
    }

    // Default Horizontal Layout Case 1: Forward flow (target is to the right)
    if (endX >= startX + 40) {
      const midX = (startX + endX) / 2;
      return [
        { x: startX, y: startY },
        { x: midX, y: startY },
        { x: midX, y: endY },
        { x: endX, y: endY }
      ];
    }

    // Default Horizontal Layout Case 2: Wrap-around flow (into channel gutter)
    const rightStubX = startX + 28;
    const channelY = (fromNode.y + fromH + toNode.y) / 2;
    const leftStubX = endX - 28;

    return [
      { x: startX, y: startY },
      { x: rightStubX, y: startY },
      { x: rightStubX, y: channelY },
      { x: leftStubX, y: channelY },
      { x: leftStubX, y: endY },
      { x: endX, y: endY }
    ];
  }

  getWireCenterHandle(conn, fromNode, toNode) {
    if (conn.waypoint) return conn.waypoint;
    const pts = this.getWirePathPoints(conn, fromNode, toNode);
    if (pts.length === 2) {
      return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    } else if (pts.length === 4) {
      return { x: pts[1].x, y: (pts[1].y + pts[2].y) / 2 };
    } else if (pts.length >= 6) {
      return { x: (pts[2].x + pts[3].x) / 2, y: pts[2].y };
    }
    return { x: (pts[0].x + pts[pts.length - 1].x) / 2, y: (pts[0].y + pts[pts.length - 1].y) / 2 };
  }

  findWaypointHandleAt(wx, wy) {
    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
    const handleRadius = 14;

    for (let conn of this.connections) {
      const from = nodeMap.get(conn.fromNodeId);
      const to = nodeMap.get(conn.toNodeId);
      if (!from || !to) continue;

      const handle = this.getWireCenterHandle(conn, from, to);
      if (Math.hypot(wx - handle.x, wy - handle.y) <= handleRadius) {
        return { conn, handle };
      }
    }
    return null;
  }

  findWireAt(wx, wy) {
    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
    const threshold = 9;

    for (let conn of this.connections) {
      const from = nodeMap.get(conn.fromNodeId);
      const to = nodeMap.get(conn.toNodeId);
      if (!from || !to) continue;

      const pts = this.getWirePathPoints(conn, from, to);
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        if (this.distToSegment({ x: wx, y: wy }, p1, p2) <= threshold) {
          return conn;
        }
      }
    }
    return null;
  }

  distToSegment(p, v, w) {
    const l2 = Math.hypot(w.x - v.x, w.y - v.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());

    let clickStartTime = 0;
    let clickStartX = 0;
    let clickStartY = 0;

    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedWire) {
          this.cutWire(this.selectedWire);
        } else if (this.selectedNode) {
          this.onNodeDeleteRequested(this.selectedNode);
        }
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = this.screenToWorld(sx, sy);
      const hitNode = this.findNodeAt(world.x, world.y);

      if (hitNode) {
        this.selectedNode = hitNode;
        this.selectedWire = null;
      }

      this.onContextMenu({
        node: hitNode,
        worldX: world.x,
        worldY: world.y,
        clientX: e.clientX,
        clientY: e.clientY
      });
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = this.screenToWorld(sx, sy);

      clickStartTime = Date.now();
      clickStartX = sx;
      clickStartY = sy;

      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        this.isPanning = true;
        this.panStartX = sx - this.offsetX;
        this.panStartY = sy - this.offsetY;
        this.canvas.style.cursor = 'grabbing';
        return;
      }

      if (e.button === 0) {
        // 1. Check if clicked on a pin (start live wiring)
        const hitPin = this.findPinAt(world.x, world.y);
        if (hitPin && hitPin.type === 'out') {
          this.activeWiring = {
            fromNode: hitPin.node,
            fromPin: hitPin.pinName,
            isData: hitPin.isData,
            startX: hitPin.x,
            startY: hitPin.y,
            currentX: world.x,
            currentY: world.y
          };
          this.selectedWire = null;
          return;
        }

        // 2. Check if clicked directly on a Wire Waypoint Handle (2D Drag)
        const hitHandle = this.findWaypointHandleAt(world.x, world.y);
        if (hitHandle) {
          if (this.selectedWire === hitHandle.conn) {
            this.cutWire(hitHandle.conn);
            return;
          }
          this.draggedWaypointWire = hitHandle.conn;
          this.selectedWire = hitHandle.conn;
          this.selectedNode = null;
          return;
        }

        // 3. Check if clicked on a wire body
        const hitWire = this.findWireAt(world.x, world.y);
        if (hitWire) {
          if (this.selectedWire === hitWire) {
            this.cutWire(hitWire);
            return;
          }
          this.selectedWire = hitWire;
          this.selectedNode = null;
          this.draggedWaypointWire = hitWire;
          return;
        } else {
          this.selectedWire = null;
        }

        // 4. Check if clicked on a node
        const hitNode = this.findNodeAt(world.x, world.y);
        if (hitNode) {
          this.selectedNode = hitNode;
          this.draggedNode = hitNode;
          this.dragOffsetX = world.x - hitNode.x;
          this.dragOffsetY = world.y - hitNode.y;
          
          const idx = this.nodes.indexOf(hitNode);
          if (idx > -1) {
            this.nodes.splice(idx, 1);
            this.nodes.push(hitNode);
          }
        } else {
          this.selectedNode = null;
          this.isPanning = true;
          this.panStartX = sx - this.offsetX;
          this.panStartY = sy - this.offsetY;
          this.canvas.style.cursor = 'grabbing';
        }
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = this.screenToWorld(sx, sy);

      // Handle 2D Wire Waypoint Dragging
      if (this.draggedWaypointWire) {
        this.draggedWaypointWire.waypoint = {
          x: Math.round(world.x),
          y: Math.round(world.y)
        };
        this.onCanvasModified();
        this.canvas.style.cursor = 'move';
        return;
      }

      if (this.activeWiring) {
        this.activeWiring.currentX = world.x;
        this.activeWiring.currentY = world.y;
        this.hoveredPin = this.findPinAt(world.x, world.y);
        return;
      }

      if (this.isPanning) {
        this.offsetX = sx - this.panStartX;
        this.offsetY = sy - this.panStartY;
        this.updateScrollbar();
        return;
      }

      if (this.draggedNode) {
        this.draggedNode.x = world.x - this.dragOffsetX;
        this.draggedNode.y = world.y - this.dragOffsetY;
        this.onCanvasModified();
        this.updateScrollbar();
        return;
      }

      this.hoveredPin = this.findPinAt(world.x, world.y);
      this.hoveredNode = this.findNodeAt(world.x, world.y);
      const hitHandle = this.findWaypointHandleAt(world.x, world.y);
      this.hoveredHandleWire = hitHandle ? hitHandle.conn : null;
      this.hoveredWire = hitHandle ? hitHandle.conn : this.findWireAt(world.x, world.y);

      if (this.hoveredPin) {
        this.canvas.style.cursor = 'crosshair';
      } else if (this.hoveredHandleWire) {
        this.canvas.style.cursor = 'move';
      } else if (this.hoveredWire) {
        this.canvas.style.cursor = 'pointer';
      } else if (this.hoveredNode) {
        this.canvas.style.cursor = 'pointer';
      } else {
        this.canvas.style.cursor = 'default';
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = this.screenToWorld(sx, sy);

      const hadDraggedWaypoint = !!this.draggedWaypointWire;
      this.draggedWaypointWire = null;

      if (this.activeWiring) {
        const targetPin = this.findPinAt(world.x, world.y);
        if (targetPin && targetPin.type === 'in' && targetPin.node.id !== this.activeWiring.fromNode.id) {
          const isData = !!(this.activeWiring.isData || targetPin.isData);
          this.createWire(this.activeWiring.fromNode.id, targetPin.node.id, this.activeWiring.fromPin, targetPin.pinName, isData);
        }
        this.activeWiring = null;
        return;
      }

      const moveDist = Math.hypot(sx - clickStartX, sy - clickStartY);
      const isClick = (Date.now() - clickStartTime < 300) && (moveDist < 6);

      if (isClick && e.button === 0 && !hadDraggedWaypoint) {
        const hitNode = this.findNodeAt(world.x, world.y);
        if (hitNode) {
          if (hitNode.type === 'math' || hitNode.type === 'var' || hitNode.type === 'if' || hitNode.type === 'loop') {
            this.onEquationEdit(hitNode);
          } else {
            this.onNodeClick(hitNode);
          }
        }
      }

      this.isPanning = false;
      this.draggedNode = null;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (e.ctrlKey) {
        const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
        const newScale = Math.min(Math.max(this.scale * zoomFactor, this.minScale), this.maxScale);
        this.offsetX = sx - (sx - this.offsetX) * (newScale / this.scale);
        this.offsetY = sy - (sy - this.offsetY) * (newScale / this.scale);
        this.scale = newScale;
      } else {
        this.offsetY -= e.deltaY * 0.8;
        this.offsetX -= e.deltaX * 0.8;
      }
      this.updateScrollbar();
    }, { passive: false });

    this.canvas.addEventListener('dblclick', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = this.screenToWorld(sx, sy);

      const hitWire = this.findWireAt(world.x, world.y);
      if (hitWire) {
        this.cutWire(hitWire);
        return;
      }

      const hitNode = this.findNodeAt(world.x, world.y);
      if (hitNode) {
        this.onNodeDoubleClicked(hitNode);
      }
    });
  }

  createWire(fromNodeId, toNodeId, fromPin = 'flow_out', toPin = 'flow_in', isDataWire = false) {
    this.connections = this.connections.filter(c => !(c.fromNodeId === fromNodeId && c.toNodeId === toNodeId && c.fromPin === fromPin));
    this.connections.push({
      id: `wire_${fromNodeId}_${toNodeId}_${Date.now()}`,
      fromNodeId,
      toNodeId,
      fromPin,
      toPin,
      isDataWire,
      waypoint: null
    });
    this.updateIsolatedStates();
    this.onCanvasModified();
  }

  cutWire(wire) {
    const idx = this.connections.indexOf(wire);
    if (idx > -1) {
      this.connections.splice(idx, 1);
      this.selectedWire = null;
      this.updateIsolatedStates();
      this.onCanvasModified();
    }
  }

  zoomIn() {
    this.scale = Math.min(this.scale * 1.2, this.maxScale);
    this.updateScrollbar();
  }

  zoomOut() {
    this.scale = Math.max(this.scale / 1.2, this.minScale);
    this.updateScrollbar();
  }

  resetView() {
    this.scale = 1.0;
    this.offsetX = 80;
    this.offsetY = 90;
    this.updateScrollbar();
  }

  startLoop() {
    const loop = () => {
      this.animTime += 0.025;
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  render() {
    const dpr = this.dpr || 1;
    const parent = this.canvas.parentElement;
    const curW = parent ? parent.clientWidth : window.innerWidth;
    const curH = parent ? parent.clientHeight : (window.innerHeight - 66);

    if (this.canvas.width === 0 || this.canvas.height === 0 || Math.abs((this.canvas.width / dpr) - curW) > 2) {
      this.resize();
    }

    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;

    if (width <= 0 || height <= 0) return;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.clearRect(0, 0, width, height);

    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

    this.drawGrid(width, height);
    this.drawConnections();
    this.drawActiveWiring();
    this.drawNodes();

    this.ctx.restore();
  }

  drawGrid(width, height) {
    const gridSize = 24;
    const invScale = 1 / this.scale;
    const startX = Math.floor(-this.offsetX * invScale / gridSize) * gridSize;
    const endX = Math.ceil((width - this.offsetX) * invScale / gridSize) * gridSize;
    const startY = Math.floor(-this.offsetY * invScale / gridSize) * gridSize;
    const endY = Math.ceil((height - this.offsetY) * invScale / gridSize) * gridSize;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    for (let x = startX; x <= endX; x += gridSize) {
      for (let y = startY; y <= endY; y += gridSize) {
        this.ctx.fillRect(x, y, 1.5, 1.5);
      }
    }
  }

  drawConnections() {
    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

    for (let conn of this.connections) {
      const fromNode = nodeMap.get(conn.fromNodeId);
      const toNode = nodeMap.get(conn.toNodeId);
      if (!fromNode || !toNode) continue;

      const pts = this.getWirePathPoints(conn, fromNode, toNode);
      const isSelected = (this.selectedWire === conn);
      const isHovered = (this.hoveredWire === conn);
      const handlePos = this.getWireCenterHandle(conn, fromNode, toNode);

      this.drawSteppedWire(pts, isSelected, false, conn.waypoint, isHovered, handlePos, conn.isDataWire);
    }
  }

  drawActiveWiring() {
    if (!this.activeWiring) return;
    const p1 = { x: this.activeWiring.startX, y: this.activeWiring.startY };
    const p2 = { x: this.activeWiring.currentX, y: this.activeWiring.currentY };
    const pts = [
      p1,
      { x: (p1.x + p2.x) / 2, y: p1.y },
      { x: (p1.x + p2.x) / 2, y: p2.y },
      p2
    ];
    this.drawSteppedWire(pts, false, true, false, false, null, this.activeWiring.isData);
  }

  /**
   * Draws Hollow Execution Stream Wires with Smooth Animated Flow Direction Pulses
   * and Sleek Compact Arrowheads + Click-to-Cut Scissor (✂) Badges
   */
  drawSteppedWire(points, isSelected = false, isLive = false, hasWaypoint = false, isHovered = false, handlePos = null, isDataWire = false) {
    if (!points || points.length < 2) return;

    const radius = 8;
    this.ctx.save();

    if (isDataWire) {
      // Thin Solid Wire for Data Parameters
      const dataColor = isSelected ? '#ff5370' : (isLive ? '#ffb86c' : '#ffb86c');
      
      this.ctx.beginPath();
      this.drawRoundedPolyline(points, radius);
      this.ctx.strokeStyle = dataColor;
      this.ctx.lineWidth = isSelected ? 2.5 : 1.5;
      if (isLive) this.ctx.setLineDash([4, 3]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Animated Flow Pulses on Data Wire
      if (!isLive) {
        this.ctx.beginPath();
        this.drawRoundedPolyline(points, radius);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.8;
        this.ctx.setLineDash([3, 14]);
        this.ctx.lineDashOffset = -this.animTime * 22;
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    } else {
      // Hollow "Pipe" Execution Stream Wire
      const outerColor = isSelected ? '#ff5370' : (isLive ? '#ffb86c' : (isHovered ? '#80ffea' : '#64ffda'));
      const hollowBgColor = '#101217';

      // 1. Outer Glow Layer
      this.ctx.beginPath();
      this.drawRoundedPolyline(points, radius);
      this.ctx.strokeStyle = isSelected ? 'rgba(255, 83, 112, 0.45)' : 'rgba(100, 255, 218, 0.22)';
      this.ctx.lineWidth = isSelected ? 8.5 : 6.5;
      this.ctx.stroke();

      // 2. Outer Border of Hollow Pipe
      this.ctx.beginPath();
      this.drawRoundedPolyline(points, radius);
      this.ctx.strokeStyle = outerColor;
      this.ctx.lineWidth = isSelected ? 5.5 : 4.5;
      if (isLive) this.ctx.setLineDash([6, 4]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // 3. Hollow Core
      this.ctx.beginPath();
      this.drawRoundedPolyline(points, radius);
      this.ctx.strokeStyle = hollowBgColor;
      this.ctx.lineWidth = isSelected ? 2.5 : 2.0;
      this.ctx.stroke();

      // 4. Smooth Animated Live Flow Pulses along the wire
      if (!isLive) {
        this.ctx.beginPath();
        this.drawRoundedPolyline(points, radius);
        this.ctx.strokeStyle = isSelected ? '#ffffff' : '#64ffda';
        this.ctx.lineWidth = 1.8;
        this.ctx.setLineDash([6, 16]);
        this.ctx.lineDashOffset = -this.animTime * 26;
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    }

    // 5. Sleek Compact Directional Arrow along the longest middle segment
    let maxLen = -1;
    let arrowSegIndex = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const len = Math.hypot(points[i+1].x - points[i].x, points[i+1].y - points[i].y);
      if (len > maxLen) {
        maxLen = len;
        arrowSegIndex = i;
      }
    }

    const pA = points[arrowSegIndex];
    const pB = points[arrowSegIndex + 1];
    const midX = (pA.x + pB.x) / 2;
    const midY = (pA.y + pB.y) / 2;
    const angle = Math.atan2(pB.y - pA.y, pB.x - pA.x);
    const arrowColor = isSelected ? '#ff5370' : (isDataWire ? '#ffb86c' : '#64ffda');

    this.drawArrowHead(midX, midY, angle, arrowColor);

    // 6. Scissor Cut Badge (Click to Delete) or Draggable Waypoint Handle
    if (isSelected) {
      this.ctx.fillStyle = '#ff5370';
      this.ctx.beginPath();
      this.ctx.arc(midX, midY, 11, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 11px sans-serif';
      this.ctx.fillText('✂', midX - 5, midY + 4);
    } else if (handlePos && (hasWaypoint || isHovered)) {
      this.ctx.fillStyle = '#ffb86c';
      this.ctx.beginPath();
      this.ctx.arc(handlePos.x, handlePos.y, 5.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      this.ctx.fillStyle = '#14171d';
      this.ctx.beginPath();
      this.ctx.arc(handlePos.x, handlePos.y, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawRoundedPolyline(pts, radius) {
    if (pts.length < 2) return;
    this.ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length - 1; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      const next = pts[i + 1];

      const v1 = { x: prev.x - cur.x, y: prev.y - cur.y };
      const v2 = { x: next.x - cur.x, y: next.y - cur.y };
      const len1 = Math.hypot(v1.x, v1.y);
      const len2 = Math.hypot(v2.x, v2.y);

      const r = Math.min(radius, len1 / 2, len2 / 2);
      if (r > 0) {
        this.ctx.arcTo(cur.x, cur.y, next.x, next.y, r);
      } else {
        this.ctx.lineTo(cur.x, cur.y);
      }
    }
    this.ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  }

  /**
   * Draws Sleek Compact Directional Arrowhead
   */
  drawArrowHead(x, y, angle, color) {
    const headLength = 10;
    const halfWidth = 4.8;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angle);
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(-headLength, -halfWidth);
    this.ctx.lineTo(-headLength + 2.5, 0);
    this.ctx.lineTo(-headLength, halfWidth);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
  }

  drawNodes() {
    for (let node of this.nodes) {
      this.drawNode(node);
    }
  }

  /**
   * Draws Node Card with:
   * - Compact Slim Height (56px) for Single Line Commands / Equations / Scripts
   * - Vibrant Distinct Title Bar Colors for each command category
   */
  drawNode(node) {
    const isSelected = (this.selectedNode === node);
    const isHovered = (this.hoveredNode === node);
    const isSubVI = (node.type === 'blk');
    const isEquation = (node.type === 'math' || node.type === 'var' || node.type === 'if' || node.type === 'loop');
    const isSingleLineCmd = (node.type === 'math' || node.type === 'var' || node.type === 'bat' || node.type === 'ps1' || node.type === 'exe' || node.type === 'pause' || node.type === 'loop');
    const isIsolated = node.isIsolated;
    const isVertical = this.layoutMode.startsWith('vertical');

    node.height = this.computeNodeHeight(node);
    const isSlim = (node.height <= 70);

    const varKeys = node.variables ? Object.keys(node.variables) : [];
    const subCount = (node.subSteps && node.subSteps.length) || 0;

    this.ctx.save();

    if (isIsolated) {
      this.ctx.globalAlpha = 0.7;
    }

    this.ctx.shadowColor = isSelected ? 'rgba(100, 255, 218, 0.45)' : 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = isSelected ? 18 : 8;
    this.ctx.shadowOffsetY = 4;

    this.ctx.fillStyle = isSelected ? '#2d3340' : (isHovered ? '#2a2f3b' : '#212630');
    this.roundRect(node.x, node.y, node.width, node.height, 6, true, false);

    this.ctx.shadowColor = 'transparent';

    this.ctx.strokeStyle = isIsolated ? '#6272a4' : (isSelected ? '#64ffda' : (isHovered ? '#5e81ac' : '#383f4d'));
    this.ctx.lineWidth = isSelected ? 2 : 1;
    if (isIsolated) this.ctx.setLineDash([4, 4]);
    this.roundRect(node.x, node.y, node.width, node.height, 6, false, true);
    this.ctx.setLineDash([]);

    if (isSubVI) {
      this.ctx.strokeStyle = 'rgba(74, 71, 163, 0.6)';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([3, 3]);
      this.roundRect(node.x + 3, node.y + 3, node.width - 6, node.height - 6, 4, false, true);
      this.ctx.setLineDash([]);
    }

    // Distinct Title Bar Colors & Categories
    let bannerColor = '#0284c7'; // Default: REC Macro (Ocean Blue)
    let typeTag = 'REC MACRO';

    switch (node.type) {
      case 'lib_rec':
        bannerColor = '#0891b2'; // Library REC (Cyan Slate)
        typeTag = 'LIB REC';
        break;
      case 'blk':
        bannerColor = '#7c3aed'; // SubVI Container (Royal Purple)
        typeTag = 'BLK SUB-TASK';
        break;
      case 'math':
      case 'var':
        bannerColor = '#d97706'; // Command / Equation / Variable (Vivid Amber Gold)
        typeTag = 'f(x) COMMAND';
        break;
      case 'if':
      case 'branch':
        bannerColor = '#e11d48'; // Flow Control IF (Bright Crimson Rose)
        typeTag = 'IF CONDITION';
        break;
      case 'else':
      case 'endif':
        bannerColor = '#9f1239'; // IF Structural Markers (Dark Rose)
        typeTag = node.type.toUpperCase();
        break;
      case 'loop':
        bannerColor = '#6366f1'; // Flow Control LOOP (Electric Indigo)
        typeTag = 'LOOP BLOCK';
        break;
      case 'endloop':
        bannerColor = '#4338ca'; // LOOP End Marker (Slate Indigo)
        typeTag = 'ENDLOOP';
        break;
      case 'switch':
        bannerColor = '#c026d3'; // Flow Control SWITCH (Purple Pink)
        typeTag = 'SWITCH';
        break;
      case 'case':
        bannerColor = '#9333ea'; // SWITCH Case Branch (Violet)
        typeTag = 'CASE';
        break;
      case 'default':
      case 'endswitch':
        bannerColor = '#7e22ce'; // SWITCH End/Default Marker (Slate Violet)
        typeTag = node.type.toUpperCase();
        break;
      case 'break':
        bannerColor = '#db2777'; // Loop Break (Magenta)
        typeTag = 'BREAK';
        break;
      case 'continue':
        bannerColor = '#06b6d4'; // Loop Continue (Cyan)
        typeTag = 'CONTINUE';
        break;
      case 'return':
        bannerColor = '#059669'; // Task Return (Emerald Green)
        typeTag = 'RETURN';
        break;
      case 'bat':
      case 'cmd':
      case 'ps1':
        bannerColor = '#ea580c'; // Script Command (Flame Orange)
        typeTag = node.type.toUpperCase() + ' SCRIPT';
        break;
      case 'exe':
        bannerColor = '#b91c1c'; // Executable App (Deep Scarlet)
        typeTag = 'EXE APP';
        break;
      case 'pause':
        bannerColor = '#b45309'; // Pause Gate (Warm Bronze Gold)
        typeTag = 'PAUSE GATE';
        break;
      case 'image_search':
        bannerColor = '#0d9488'; // Future Extension (Teal)
        typeTag = 'IMG SEARCH [EXT]';
        break;
      case 'ocr':
        bannerColor = '#4f46e5'; // Future Extension (Indigo)
        typeTag = 'OCR [EXT]';
        break;
      case 'unknown_error':
        bannerColor = '#ef4444'; // Fatal Error (Warning Red)
        typeTag = '⚠️ UNKNOWN ERROR';
        break;
      case 'comment':
        bannerColor = '#475569'; // Comment / Disabled (Slate Gray)
        typeTag = 'DISABLED (;=)';
        break;
    }

    // Header Banner (Height: 22px)
    const bannerH = 22;
    this.ctx.fillStyle = bannerColor;
    this.ctx.beginPath();
    this.ctx.moveTo(node.x + 6, node.y);
    this.ctx.lineTo(node.x + node.width - 6, node.y);
    this.ctx.quadraticCurveTo(node.x + node.width, node.y, node.x + node.width, node.y + 6);
    this.ctx.lineTo(node.x + node.width, node.y + bannerH);
    this.ctx.lineTo(node.x, node.y + bannerH);
    this.ctx.lineTo(node.x, node.y + 6);
    this.ctx.quadraticCurveTo(node.x, node.y, node.x + 6, node.y);
    this.ctx.closePath();
    this.ctx.fill();

    // 1. Title Bar Left Text: File Name or Type Tag
    let headerTitle = '';
    if (node.type === 'math' || node.type === 'var') {
      headerTitle = 'f(x)';
    } else if (node.type === 'if') {
      headerTitle = 'IF';
    } else if (node.type === 'else') {
      headerTitle = 'ELSE';
    } else if (node.type === 'endif') {
      headerTitle = 'ENDIF';
    } else if (node.type === 'loop') {
      headerTitle = 'LOOP';
    } else if (node.type === 'endloop') {
      headerTitle = 'ENDLOOP';
    } else if (node.type === 'switch') {
      headerTitle = 'SWITCH';
    } else if (node.type === 'case') {
      headerTitle = 'CASE';
    } else if (node.type === 'default') {
      headerTitle = 'DEFAULT';
    } else if (node.type === 'endswitch') {
      headerTitle = 'ENDSWITCH';
    } else if (node.type === 'break') {
      headerTitle = 'BREAK';
    } else if (node.type === 'continue') {
      headerTitle = 'CONTINUE';
    } else if (node.type === 'return') {
      headerTitle = 'RETURN';
    } else if (node.type === 'pause') {
      headerTitle = 'PAUSE';
    } else if (node.type === 'image_search') {
      headerTitle = 'IMG SEARCH [EXT]';
    } else if (node.type === 'ocr') {
      headerTitle = 'OCR [EXT]';
    } else if (node.type === 'unknown_error') {
      headerTitle = '⚠️ ERROR';
    } else {
      // Files (.rec, lib_rec, .blk, .bat, .ps1, .exe, comment)
      const raw = (node.label || node.equation || 'Step').replace(/\.rec$/i, '');
      headerTitle = raw.length > 20 ? raw.substring(0, 18) + '..' : raw;
    }

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 10px monospace';
    this.ctx.fillText(headerTitle, node.x + 8, node.y + 15);

    // 2. Order Number (#1, #2, #3...) directly in Title Bar (Right side)
    const seqText = isIsolated ? ';= OFF' : `#${(node.sequence !== undefined ? node.sequence + 1 : 1)}`;
    this.ctx.fillStyle = isIsolated ? '#ff5370' : 'rgba(255, 255, 255, 0.9)';
    this.ctx.font = 'bold 9.5px monospace';
    const seqW = this.ctx.measureText(seqText).width;
    this.ctx.fillText(seqText, node.x + node.width - seqW - 8, node.y + 15);

    // Flow Pins (Vertical: Top & Bottom | Horizontal: Left & Right)
    if (isVertical) {
      this.drawPin(node.x + node.width / 2, node.y, '#64ffda'); // In (Top)
      this.drawPin(node.x + node.width / 2, node.y + node.height, '#64ffda'); // Out (Bottom)
    } else {
      this.drawPin(node.x, node.y + 20, '#64ffda'); // In (Left)
      this.drawPin(node.x + node.width, node.y + 20, '#64ffda'); // Out (Right)
    }

    // IF Pins: True Green, False Red
    if (node.type === 'if' || node.type === 'branch') {
      this.drawPin(node.x + node.width, node.y + 36, '#50fa7b');
      this.ctx.fillStyle = '#50fa7b';
      this.ctx.font = '9px monospace';
      this.ctx.fillText('T', node.x + node.width - 16, node.y + 39);

      this.drawPin(node.x + node.width, node.y + 54, '#ff5370');
      this.ctx.fillStyle = '#ff5370';
      this.ctx.font = '9px monospace';
      this.ctx.fillText('F', node.x + node.width - 16, node.y + 57);
    }

    // LOOP Pins: Body Teal, Done Amber
    if (node.type === 'loop') {
      this.drawPin(node.x + node.width, node.y + 36, '#64ffda');
      this.ctx.fillStyle = '#64ffda';
      this.ctx.font = '9px monospace';
      this.ctx.fillText('BODY', node.x + node.width - 32, node.y + 39);
    }

    // Card Body Display
    if (node.type === 'unknown_error') {
      this.ctx.fillStyle = '#ff5370';
      this.ctx.font = 'bold 10px monospace';
      const reason = node.errorReason || 'Fatal Syntax Error';
      const truncated = reason.length > 22 ? reason.substring(0, 20) + '..' : reason;
      this.ctx.fillText(truncated, node.x + 10, node.y + 39);
    } else if (isEquation || isSingleLineCmd || node.type === 'else' || node.type === 'endif' || node.type === 'endloop' || node.type === 'endswitch' || node.type === 'break' || node.type === 'continue' || node.type === 'return') {
      // Prominent Monospace Statement
      this.ctx.fillStyle = '#eceff4';
      this.ctx.font = 'bold 11.5px monospace';
      const displayLabel = node.equation || node.label;
      const truncated = displayLabel.length > 20 ? displayLabel.substring(0, 18) + '..' : displayLabel;
      this.ctx.fillText(truncated, node.x + 10, node.y + 39);

      if (node.inVar) {
        this.drawPin(node.x, node.y + 39, '#ffb86c');
      }
      if (node.outVar) {
        this.drawPin(node.x + node.width, node.y + 39, '#ffb86c');
      }
    } else if (isSubVI) {
      this.ctx.fillStyle = '#c5a3ff';
      this.ctx.font = 'bold 10px monospace';
      const countStr = subCount > 0 ? `📁 ${subCount} Sub-Steps` : '📁 Mini-TSK Container';
      this.ctx.fillText(countStr, node.x + 10, node.y + 39);
    } else if (varKeys.length > 0) {
      let varY = node.y + 37;
      for (let varName of varKeys) {
        const val = node.variables[varName];
        this.drawPin(node.x, varY, '#ffb86c');

        this.ctx.fillStyle = '#ffb86c';
        this.ctx.font = 'bold 10px monospace';
        const varDisplay = `${varName}=${val}`;
        const tStr = varDisplay.length > 18 ? varDisplay.substring(0, 16) + '..' : varDisplay;
        this.ctx.fillText(tStr, node.x + 12, varY + 3);

        varY += 17;
      }
    } else {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      this.ctx.font = '10px sans-serif';
      this.ctx.fillText(node.type === 'lib_rec' ? '▶ Library Macro' : '▶ Macro Action', node.x + 10, node.y + 39);
    }

    this.ctx.restore();
  }

  drawPin(x, y, color) {
    this.ctx.save();
    this.ctx.fillStyle = '#1a1d24';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  roundRect(x, y, w, h, radius, fill, stroke) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + w - radius, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    this.ctx.lineTo(x + w, y + h - radius);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    this.ctx.lineTo(x + radius, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
    if (fill) this.ctx.fill();
    if (stroke) this.ctx.stroke();
  }
}

if (typeof window !== 'undefined') {
  window.GraphCanvasEngine = GraphCanvasEngine;
}
