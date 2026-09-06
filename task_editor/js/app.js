/**
 * HandyRecorder Task Editor - Main Application Controller
 * - Hollow Execution Flow "Pipes" (Order indicator) vs. Thin Solid Data Wires
 * - Dual Layout Engines: Horizontal Flow (Left-to-Right) & Vertical Pipeline (1-Col / 2-Col)
 * - Draggable 2D Waypoints (X & Y) & One-Click "Reset Wires" Auto-Routing
 * 100% Offline, Pure JavaScript (ES6)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Main Canvas & Dual Axis Scrollbars
  const canvasElem = document.getElementById('graphCanvas');
  const scrollTrack = document.getElementById('canvasScrollTrack');
  const scrollThumb = document.getElementById('canvasScrollThumb');
  const hScrollTrack = document.getElementById('canvasHScrollTrack');
  const hScrollThumb = document.getElementById('canvasHScrollThumb');

  // Toolbar Inputs
  const tskFileInput = document.getElementById('tskFileInput');
  const envFileInput = document.getElementById('envFileInput');
  const folderInput = document.getElementById('folderInput');
  const btnOpenTsk = document.getElementById('btnOpenTsk');
  const btnOpenEnv = document.getElementById('btnOpenEnv');
  const btnOpenFolder = document.getElementById('btnOpenFolder');
  const btnSaveTsk = document.getElementById('btnSaveTsk');
  const btnSaveEnv = document.getElementById('btnSaveEnv');
  const btnExportFlow = document.getElementById('btnExportFlow');
  const btnResetWires = document.getElementById('btnResetWires');
  const btnFitAll = document.getElementById('btnFitAll');
  const sampleTaskSelect = document.getElementById('sampleTaskSelect');
  const layoutModeSelect = document.getElementById('layoutModeSelect');
  
  const currentTaskLabel = document.getElementById('currentTaskLabel');
  const statusNodeCount = document.getElementById('statusNodeCount');
  const statusTaskName = document.getElementById('statusTaskName');

  // Rec Command Editor (Split: Left ASCII + Right Cmds/Vars)
  const recModalBackdrop = document.getElementById('recEditorModal');
  const recModalClose = document.getElementById('recModalClose');
  const recModalCancel = document.getElementById('recModalCancel');
  const recModalSave = document.getElementById('recModalSave');
  const recFileBadge = document.getElementById('recFileBadge');
  const asciiTextarea = document.getElementById('asciiTextarea');
  const recVarTextarea = document.getElementById('recVarTextarea');
  const btnDeleteRecNode = document.getElementById('btnDeleteRecNode');

  // Mini-Canvas Sub-Task (.blk) Modal
  const blkModalBackdrop = document.getElementById('blkMiniCanvasModal');
  const blkModalClose = document.getElementById('blkModalClose');
  const blkModalCancel = document.getElementById('blkModalCancel');
  const blkModalSave = document.getElementById('blkModalSave');
  const blkFileBadge = document.getElementById('blkFileBadge');
  const blkSubCountBadge = document.getElementById('blkSubCountBadge');
  const miniCanvasElem = document.getElementById('miniCanvas');
  const btnAddSubRec = document.getElementById('btnAddSubRec');
  const btnDeleteBlkNode = document.getElementById('btnDeleteBlkNode');

  // Sentence Statement / Equation Edit Modal
  const equationModalBackdrop = document.getElementById('equationModal');
  const equationModalClose = document.getElementById('equationModalClose');
  const equationModalCancel = document.getElementById('equationModalCancel');
  const equationModalSave = document.getElementById('equationModalSave');
  const equationInput = document.getElementById('equationInput');
  const equationInVarDisplay = document.getElementById('equationInVarDisplay');
  const equationOutVarDisplay = document.getElementById('equationOutVarDisplay');
  const btnDeleteEquationNode = document.getElementById('btnDeleteEquationNode');

  // One-Line Command Inserter Modal
  const insertCmdModal = document.getElementById('insertCmdModal');
  const insertCmdModalClose = document.getElementById('insertCmdModalClose');
  const insertCmdModalCancel = document.getElementById('insertCmdModalCancel');
  const insertCmdModalSubmit = document.getElementById('insertCmdModalSubmit');
  const insertCmdLineInput = document.getElementById('insertCmdLineInput');
  const insertCmdTypeBadge = document.getElementById('insertCmdTypeBadge');
  const insertCmdInVar = document.getElementById('insertCmdInVar');
  const insertCmdOutVar = document.getElementById('insertCmdOutVar');
  const insertCmdVarPins = document.getElementById('insertCmdVarPins');
  let currentInsertRefNode = null;

  // Drop Overlay
  const dropOverlay = document.getElementById('dropOverlay');

  // State & Caches - Merged with pre-indexed real workspace files
  let currentTaskName = 'chartcheck.tsk';
  let baseEnvData = { action: { name: 'chartcheck', version: '1.80' }, paths: {}, globalVars: {}, varsByRecord: {} };
  let editingNode = null;
  let editingBlkNode = null;
  let editingEquationNode = null;

  // Initialize with built-in database of all 76+ real .rec files
  const REC_COMMANDS_CACHE = Object.assign({}, (window.HR_BUILTIN_REC_DB || {}));
  const BLK_CONTENT_CACHE = Object.assign({
    'recordall.blk': ['rec_20260604_204625', 'record1', 'record1_cp2', 'rec_20260604_202621'],
    'abc.blk': ['abc_step1', 'abc_step2', 'abc_finalize'],
    'open_patient_chart.blk': ['login', 'select_patient', 'open_chartcheck']
  }, (window.HR_BUILTIN_BLK_DB || {}));

  // Main Canvas Engine with Dual Scrollbars
  const mainEngine = new GraphCanvasEngine(canvasElem, {
    track: scrollTrack,
    thumb: scrollThumb,
    hTrack: hScrollTrack,
    hThumb: hScrollThumb
  }, {
    onNodeClick: (node) => {
      handleNodeClick(node);
    },
    onNodeDoubleClicked: (node) => {
      handleNodeClick(node);
    },
    onEquationEdit: (node) => {
      openEquationEditor(node);
    },
    onCanvasModified: () => {
      updateStatusBar();
    },
    onContextMenu: (data) => {
      showContextMenu(data);
    },
    onNodeDeleteRequested: (node) => {
      deleteNodeFromGraph(node);
    }
  });

  // Mini Canvas Engine for .blk SubVI
  let miniEngine = null;
  function getMiniEngine() {
    if (!miniEngine && miniCanvasElem) {
      miniEngine = new GraphCanvasEngine(miniCanvasElem, {}, {
        onNodeClick: (subNode) => {
          openRecEditor(subNode);
        }
      });
    }
    return miniEngine;
  }

  function handleNodeClick(node) {
    if (node.type === 'blk') {
      openBlkMiniCanvas(node);
    } else if (node.type === 'math' || node.type === 'var' || node.type === 'if' || node.type === 'loop') {
      openEquationEditor(node);
    } else {
      openRecEditor(node);
    }
  }

  const PRESET_SAMPLES = {
    'chartcheck.tsk': {
      tsk: `;= chartcheck micract flow\r\nSelRx\r\n$retry_count = 0\r\nChkDosimetry\r\nChartChk\r\nAttachTxForm\r\nSEARCHPTmim\r\nLoadVeriFilm\r\nVeriFilmStatus\r\nPrintMIMCR\r\nCloseMIM\r\nMOSAIQRO\r\npayment\r\nweekNote`,
      env: `[Action]\r\nname=chartcheck\r\nversion=1.80\r\n\r\n[Paths]\r\nmicracts=micracts\r\nindex=index\r\nexport=export\r\n\r\n[Global.Vars]\r\n$retry_count=0\r\n\r\n[Vars.SelRx]\r\n$run=1\r\n$next=0\r\n\r\n[Vars.ChkDosimetry]\r\n$run=1\r\n$next=0\r\n\r\n[Vars.ChartChk]\r\n$run=1\r\n$next=0`
    },
    'handyrecorder.tsk': {
      tsk: `;= handyrecorder micract order\r\nrec_20260604_152205\r\nrecord1_copy\r\n$A = $B + 2\r\nrecordall.blk\r\nrec_20260604_210746\r\nrec_20260605_051228\r\nChkDi\r\nabc.blk\r\nrecord1_cp1`,
      env: `[Action]\r\nname=handyrecorder\r\nversion=1.80\r\n\r\n[Paths]\r\nmicracts=micracts\r\nindex=index\r\nexport=export\r\n\r\n[Global.Vars]\r\n$A=0\r\n$B=10\r\n\r\n[Vars.record1_copy]\r\n$run=1\r\n$next=0\r\n$patient_id=PA_94821\r\n$timeout=15\r\n\r\n[Vars.ChkDi]\r\n$run=1\r\n$next=0\r\n$mode=auto_check\r\n\r\n[Vars.rec_20260604_152205]\r\n$run=1\r\n$next=0`
    },
    'completetx.tsk': {
      tsk: `;= weekly completeTx flow\r\nSelFinPat\r\nChkDI\r\nChartChk\r\nNote\r\nMOSAIQcleanNoti`,
      env: `[Action]\r\nname=completetx\r\nversion=1.24\r\n\r\n[Vars.SelFinPat]\r\n$run=1\r\n$next=0\r\n$patient_id=PT_1002\r\n\r\n[Vars.ChartChk]\r\n$run=1\r\n$next=0\r\n$strict_mode=1\r\n\r\n[Vars.Note]\r\n$run=1\r\n$next=0\r\n$author=Physicist`
    },
    'branch_sample.tsk': {
      tsk: `;= QA Workflow with Branching\r\nlogin\r\n->1 check_window_f8\r\nopen_patient_chart.blk\r\nverify_dosimetry\r\n->2 emergency_fallback\r\nsave_report`,
      env: `[Action]\r\nname=branch_sample\r\n\r\n[Vars.login]\r\n$user=admin\r\n$retry=3\r\n\r\n[Vars.verify_dosimetry]\r\n$tolerance=0.03`
    }
  };

  function getRecFileContent(recName) {
    const clean = recName.replace(/\.rec$/i, '').trim();
    if (REC_COMMANDS_CACHE[clean]) return REC_COMMANDS_CACHE[clean];
    if (REC_COMMANDS_CACHE[`${clean}.rec`]) return REC_COMMANDS_CACHE[`${clean}.rec`];
    
    const lower = clean.toLowerCase();
    for (let k of Object.keys(REC_COMMANDS_CACHE)) {
      if (k.toLowerCase() === lower || k.toLowerCase() === `${lower}.rec`) {
        return REC_COMMANDS_CACHE[k];
      }
    }
    return `;= Resolution 3440x1440\r\nM_P1,500,300,L,1,,rem_${clean}`;
  }

  function loadTaskData(taskName, tskText, envText = '') {
    currentTaskName = taskName;
    currentTaskLabel.textContent = taskName;
    statusTaskName.textContent = taskName;

    const parsedNodes = TskEnvParser.parseTsk(tskText);

    parsedNodes.forEach(node => {
      const baseName = node.label.replace(/\.(rec|blk)$/i, '');
      if (node.type === 'blk') {
        const blkKey = node.label.toLowerCase().endsWith('.blk') ? node.label : `${node.label}.blk`;
        node.subSteps = BLK_CONTENT_CACHE[blkKey] || BLK_CONTENT_CACHE[node.label] || [`${baseName}_step1`, `${baseName}_step2`];
      } else if (node.type === 'rec') {
        node.rawCommands = getRecFileContent(baseName);
      }
    });

    if (envText) {
      baseEnvData = TskEnvParser.parseEnv(envText);
      TskEnvParser.attachEnvToNodes(parsedNodes, baseEnvData);
    }

    mainEngine.setNodes(parsedNodes);
    mainEngine.fitAll();
    setTimeout(() => {
      mainEngine.resize();
      mainEngine.fitAll();
    }, 60);
    updateStatusBar();
  }

  function updateStatusBar() {
    statusNodeCount.textContent = `${mainEngine.nodes.length} Blocks (${mainEngine.connections.length} Wires)`;
  }

  loadTaskData('chartcheck.tsk', PRESET_SAMPLES['chartcheck.tsk'].tsk, PRESET_SAMPLES['chartcheck.tsk'].env);

  // Layout Mode Selection (Horizontal vs. Vertical 1-Col / 2-Col)
  layoutModeSelect.addEventListener('change', (e) => {
    mainEngine.setLayoutMode(e.target.value);
  });

  // Reset Wires Button
  btnResetWires.addEventListener('click', () => {
    mainEngine.resetWires();
    mainEngine.updateScrollbar();
  });

  /**
   * Left-Side Control Palette Actions (Sentence Statements & Block Insertions)
   */
  document.querySelectorAll('.palette-tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const toolType = btn.getAttribute('data-tool');
      if (toolType) {
        const activeNode = mainEngine.selectedNode || (mainEngine.nodes.length > 0 ? mainEngine.nodes[mainEngine.nodes.length - 1] : null);
        createAndInsertNode(toolType, activeNode);
      }
    });
  });

  /**
   * Unified Node Creation & Insertion (from Palette or Right-Click Context Menu)
   */
  function createAndInsertNode(toolType, referenceNode = null, customParams = {}) {
    const seq = referenceNode ? (referenceNode.sequence + 1) : mainEngine.nodes.length;
    const nodeData = {
      id: `node_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sequence: seq,
      label: 'New Node',
      type: 'rec',
      enabled: true,
      isIsolated: false,
      branchNumber: null,
      equation: '',
      inVar: '',
      outVar: '',
      variables: { '$run': '1', '$next': '0' },
      subSteps: [],
      rawCommands: '',
      x: 130,
      y: 80,
      width: 200,
      height: 95
    };

    switch (toolType) {
      case 'var_static':
      case 'insert_var':
      case 'insert_var_static':
        nodeData.type = 'var';
        nodeData.equation = customParams.equation || `$A = 10`;
        nodeData.label = nodeData.equation;
        TskEnvParser.parseEquationVariables(nodeData);
        break;
      case 'var_2d':
      case 'insert_array':
      case 'insert_var_2d':
        nodeData.type = 'var';
        nodeData.equation = customParams.equation || `$grid[0] = 1`;
        nodeData.label = nodeData.equation;
        TskEnvParser.parseEquationVariables(nodeData);
        break;
      case 'math_add':
      case 'insert_math':
      case 'insert_math_add':
        nodeData.type = 'math';
        nodeData.equation = customParams.equation || `$A = $B + 1`;
        nodeData.label = nodeData.equation;
        TskEnvParser.parseEquationVariables(nodeData);
        break;
      case 'math_sub':
      case 'insert_math_sub':
        nodeData.type = 'math';
        nodeData.equation = customParams.equation || `$A = $B - 1`;
        nodeData.label = nodeData.equation;
        TskEnvParser.parseEquationVariables(nodeData);
        break;
      case 'math_mul':
      case 'insert_math_mul':
        nodeData.type = 'math';
        nodeData.equation = customParams.equation || `$A = $B * 2`;
        nodeData.label = nodeData.equation;
        TskEnvParser.parseEquationVariables(nodeData);
        break;
      case 'math_div':
      case 'insert_math_div':
        nodeData.type = 'math';
        nodeData.equation = customParams.equation || `$A = $B / 2`;
        nodeData.label = nodeData.equation;
        TskEnvParser.parseEquationVariables(nodeData);
        break;
      case 'math_func':
      case 'insert_math_func':
        nodeData.type = 'math';
        nodeData.equation = customParams.equation || `$result = f($x)`;
        nodeData.label = nodeData.equation;
        TskEnvParser.parseEquationVariables(nodeData);
        break;
      case 'flow_if':
      case 'insert_flow_if':
        nodeData.type = 'if';
        nodeData.equation = customParams.equation || `IF $A = 1`;
        nodeData.label = nodeData.equation;
        break;
      case 'flow_loop':
      case 'insert_flow_loop':
        nodeData.type = 'loop';
        nodeData.equation = customParams.equation || `LOOP 5`;
        nodeData.label = nodeData.equation;
        break;
      case 'flow_switch':
      case 'insert_flow_switch':
        nodeData.type = 'switch';
        nodeData.equation = customParams.equation || `SWITCH $mode`;
        nodeData.label = nodeData.equation;
        break;
      case 'insert_flow_break':
        nodeData.type = 'break';
        nodeData.label = 'BREAK';
        break;
      case 'insert_flow_continue':
        nodeData.type = 'continue';
        nodeData.label = 'CONTINUE';
        break;
      case 'insert_flow_return':
        nodeData.type = 'return';
        nodeData.label = customParams.label || `RETURN $result`;
        break;
      case 'action_rec':
      case 'insert_rec': {
        nodeData.type = 'rec';
        const defaultName = customParams.name || `Action_${mainEngine.nodes.length + 1}`;
        nodeData.label = defaultName;
        nodeData.rawCommands = REC_COMMANDS_CACHE[defaultName] || REC_COMMANDS_CACHE[`${defaultName}.rec`] || `;= Commands\r\nM_P1,500,300,L,1,,rem_step`;
        break;
      }
      case 'insert_lib_rec': {
        nodeData.type = 'lib_rec';
        const libName = customParams.name || `MOSAIQ\\OpenPatient`;
        nodeData.label = libName;
        nodeData.moduleName = libName.split('\\')[0];
        nodeData.recName = libName.split('\\')[1];
        // Auto-sync LIB variables
        if (baseEnvData && !baseEnvData.varsByRecord) baseEnvData.varsByRecord = {};
        if (!baseEnvData.varsByRecord[libName]) {
          baseEnvData.varsByRecord[libName] = { '$run': '1', '$next': '0' };
        }
        break;
      }
      case 'action_blk':
      case 'insert_blk': {
        nodeData.type = 'blk';
        const defaultBlk = customParams.name || `subflow_${mainEngine.nodes.length + 1}.blk`;
        nodeData.label = defaultBlk;
        nodeData.subSteps = BLK_CONTENT_CACHE[defaultBlk] || [`sub_step_1`, `sub_step_2`];
        break;
      }
      case 'insert_script': {
        nodeData.type = 'bat';
        nodeData.label = customParams.label || `backup.bat $patient -> $ok`;
        nodeData.outVar = '$ok';
        break;
      }
      case 'action_pause':
      case 'insert_pause':
      case 'insert_action_pause':
        nodeData.type = 'pause';
        nodeData.label = `PAUSE 1`;
        nodeData.args = '1';
        break;
      case 'insert_imagesearch':
        nodeData.type = 'image_search';
        nodeData.label = `ImageSearch "btn_ok.png" -> $found`;
        nodeData.outVar = '$found';
        break;
      case 'insert_ocr':
        nodeData.type = 'ocr';
        nodeData.label = `OCR "region" -> $text`;
        nodeData.outVar = '$text';
        break;
      case 'duplicate':
        Object.assign(nodeData, customParams);
        break;
    }

    // Insert after referenceNode or at the end
    if (referenceNode) {
      const idx = mainEngine.nodes.indexOf(referenceNode);
      if (idx > -1) {
        mainEngine.nodes.splice(idx + 1, 0, nodeData);
      } else {
        mainEngine.nodes.push(nodeData);
      }
    } else {
      mainEngine.nodes.push(nodeData);
    }

    // Re-index sequences & rebuild flow connections cleanly
    mainEngine.nodes.forEach((n, i) => n.sequence = i);
    mainEngine.rebuildSequentialFlow();
    mainEngine.autoLayout();
    mainEngine.selectedNode = nodeData;
    updateStatusBar();

    // Auto open editor for the new node
    if (nodeData.type === 'math' || nodeData.type === 'var' || nodeData.type === 'if' || nodeData.type === 'loop' || nodeData.type === 'switch') {
      openEquationEditor(nodeData);
    } else if (nodeData.type === 'blk') {
      openBlkMiniCanvas(nodeData);
    } else if (nodeData.type === 'rec' || nodeData.type === 'lib_rec') {
      openRecEditor(nodeData);
    }

    return nodeData;
  }

  /**
   * Custom Right-Click Context Menu Implementation
   */
  const contextMenu = document.getElementById('canvasContextMenu');
  const ctxMenuHeader = document.getElementById('ctxMenuHeader');
  let currentContextNode = null;

  function showContextMenu(data) {
    currentContextNode = data.node || null;
    if (currentContextNode) {
      ctxMenuHeader.textContent = `Block #${(currentContextNode.sequence !== undefined ? currentContextNode.sequence + 1 : 1)}: ${currentContextNode.label}`;
      contextMenu.querySelectorAll('[data-action="edit"], [data-action="toggle_comment"], [data-action="duplicate"], [data-action="delete"]').forEach(el => el.style.display = 'flex');
    } else {
      ctxMenuHeader.textContent = `Canvas (Insert Options)`;
      contextMenu.querySelectorAll('[data-action="edit"], [data-action="toggle_comment"], [data-action="duplicate"], [data-action="delete"]').forEach(el => el.style.display = 'none');
    }

    const pad = 10;
    const menuW = 230;
    const menuH = 340;
    const posX = Math.min(data.clientX, window.innerWidth - menuW - pad);
    const posY = Math.min(data.clientY, window.innerHeight - menuH - pad);

    contextMenu.style.left = `${posX}px`;
    contextMenu.style.top = `${posY}px`;
    contextMenu.style.display = 'block';
  }

  function hideContextMenu() {
    if (contextMenu) {
      contextMenu.style.display = 'none';
    }
  }

  window.addEventListener('click', (e) => {
    if (contextMenu && !contextMenu.contains(e.target)) {
      hideContextMenu();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideContextMenu();
  });

  // Context Menu Item Actions
  contextMenu.addEventListener('click', (e) => {
    const item = e.target.closest('[data-action]');
    if (!item) return;
    const action = item.getAttribute('data-action');
    hideContextMenu();

    if (action === 'insert_command_line') {
      openInsertCmdModal(currentContextNode, '$A = $B + 1');
    } else if (action === 'insert_rec') {
      openInsertCmdModal(currentContextNode, `Action_${mainEngine.nodes.length + 1}`);
    } else if (action === 'insert_lib_rec') {
      openInsertCmdModal(currentContextNode, `MOSAIQ\\OpenPatient $patient -> $ok`);
    } else if (action === 'insert_blk') {
      openInsertCmdModal(currentContextNode, `subflow_${mainEngine.nodes.length + 1}.blk`);
    } else if (action === 'insert_script') {
      openInsertCmdModal(currentContextNode, `backup.bat $patient -> $ok`);
    } else if (action === 'insert_flow_if') {
      createAndInsertNode('insert_flow_if', currentContextNode);
    } else if (action === 'insert_flow_loop') {
      createAndInsertNode('insert_flow_loop', currentContextNode);
    } else if (action === 'insert_flow_switch') {
      createAndInsertNode('insert_flow_switch', currentContextNode);
    } else if (action === 'insert_flow_break') {
      createAndInsertNode('insert_flow_break', currentContextNode);
    } else if (action === 'insert_flow_continue') {
      createAndInsertNode('insert_flow_continue', currentContextNode);
    } else if (action === 'insert_flow_return') {
      createAndInsertNode('insert_flow_return', currentContextNode);
    } else if (action === 'insert_var') {
      createAndInsertNode('insert_var', currentContextNode);
    } else if (action === 'insert_math') {
      createAndInsertNode('insert_math', currentContextNode);
    } else if (action === 'insert_array') {
      createAndInsertNode('insert_array', currentContextNode);
    } else if (action === 'insert_pause') {
      createAndInsertNode('insert_pause', currentContextNode);
    } else if (action === 'insert_imagesearch') {
      createAndInsertNode('insert_imagesearch', currentContextNode);
    } else if (action === 'insert_ocr') {
      createAndInsertNode('insert_ocr', currentContextNode);
    } else if (action === 'edit' && currentContextNode) {
      handleNodeClick(currentContextNode);
    } else if (action === 'toggle_comment' && currentContextNode) {
      currentContextNode.isIsolated = !currentContextNode.isIsolated;
      mainEngine.onCanvasModified();
    } else if (action === 'duplicate' && currentContextNode) {
      const cloned = JSON.parse(JSON.stringify(currentContextNode));
      cloned.id = `node_${Date.now()}_dup`;
      cloned.label = `${currentContextNode.label}_cp`;
      createAndInsertNode('duplicate', currentContextNode, cloned);
    } else if (action === 'delete' && currentContextNode) {
      deleteNodeFromGraph(currentContextNode);
    }
  });

  /**
   * One-Line Command Inserter Modal Functions
   */
  function openInsertCmdModal(refNode, defaultText = '$A = $B + 2') {
    currentInsertRefNode = refNode;
    insertCmdLineInput.value = defaultText;
    updateInsertCmdLivePreview();
    insertCmdModal.classList.add('active');
    setTimeout(() => {
      insertCmdLineInput.focus();
      insertCmdLineInput.select();
    }, 50);
  }

  function closeInsertCmdModal() {
    insertCmdModal.classList.remove('active');
    currentInsertRefNode = null;
  }

  function updateInsertCmdLivePreview() {
    const text = insertCmdLineInput.value.trim();
    if (!text) {
      insertCmdTypeBadge.textContent = 'COMMAND STATEMENT';
      insertCmdTypeBadge.style.color = '#64ffda';
      insertCmdInVar.textContent = 'None';
      insertCmdOutVar.textContent = 'None';
      return;
    }

    const parsed = TskEnvParser.parseCommandLine(text);
    let typeName = 'COMMAND STATEMENT';
    let typeColor = '#d97706';

    switch (parsed.type) {
      case 'math':
      case 'var':
        typeName = 'f(x) COMMAND';
        typeColor = '#d97706'; // Amber Gold
        break;
      case 'if':
      case 'branch':
        typeName = 'IF CONDITION';
        typeColor = '#e11d48'; // Crimson Rose
        break;
      case 'loop':
        typeName = 'LOOP BLOCK';
        typeColor = '#6366f1'; // Indigo
        break;
      case 'bat':
      case 'ps1':
      case 'exe':
        typeName = `${parsed.type.toUpperCase()} SCRIPT`;
        typeColor = '#ea580c'; // Flame Orange
        break;
      case 'pause':
        typeName = 'PAUSE GATE';
        typeColor = '#b45309'; // Bronze Gold
        break;
      case 'blk':
        typeName = 'BLK SUB-TASK';
        typeColor = '#7c3aed'; // Royal Purple
        break;
      case 'rec':
        typeName = 'REC MACRO';
        typeColor = '#0284c7'; // Ocean Blue
        break;
    }

    insertCmdTypeBadge.textContent = typeName;
    insertCmdTypeBadge.style.color = typeColor;

    insertCmdInVar.textContent = parsed.inVar ? `$${parsed.inVar}` : 'None';
    insertCmdOutVar.textContent = parsed.outVar ? `$${parsed.outVar}` : 'None';
  }

  insertCmdLineInput.addEventListener('input', updateInsertCmdLivePreview);

  insertCmdLineInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitInsertCmd();
    } else if (e.key === 'Escape') {
      closeInsertCmdModal();
    }
  });

  insertCmdModalClose.addEventListener('click', closeInsertCmdModal);
  insertCmdModalCancel.addEventListener('click', closeInsertCmdModal);
  insertCmdModalSubmit.addEventListener('click', submitInsertCmd);

  function submitInsertCmd() {
    const rawText = insertCmdLineInput.value.trim();
    if (!rawText) return;

    const seq = currentInsertRefNode ? (currentInsertRefNode.sequence + 1) : mainEngine.nodes.length;
    const newNode = TskEnvParser.parseCommandLine(rawText, seq);

    if (newNode.type === 'rec') {
      newNode.rawCommands = REC_COMMANDS_CACHE[newNode.label] || REC_COMMANDS_CACHE[`${newNode.label}.rec`] || `;= Commands\r\nM_P1,500,300,L,1,,rem_step`;
    } else if (newNode.type === 'blk') {
      newNode.subSteps = BLK_CONTENT_CACHE[newNode.label] || BLK_CONTENT_CACHE[`${newNode.label}.blk`] || ['sub_step_1', 'sub_step_2'];
    }

    if (currentInsertRefNode) {
      const idx = mainEngine.nodes.indexOf(currentInsertRefNode);
      if (idx > -1) {
        mainEngine.nodes.splice(idx + 1, 0, newNode);
      } else {
        mainEngine.nodes.push(newNode);
      }
    } else {
      mainEngine.nodes.push(newNode);
    }

    // Re-index sequences & rebuild flow connections
    mainEngine.nodes.forEach((n, i) => n.sequence = i);
    mainEngine.rebuildSequentialFlow();
    mainEngine.autoLayout();
    mainEngine.selectedNode = newNode;
    updateStatusBar();
    closeInsertCmdModal();
  }

  /**
   * Compact Rec Command Editor Open (Split Layout)
   */
  function openRecEditor(node) {
    editingNode = node;
    recModalBackdrop.classList.add('active');

    recFileBadge.textContent = node.label.endsWith('.rec') ? node.label : `${node.label}.rec`;

    const cmds = node.rawCommands || getRecFileContent(node.label);
    asciiTextarea.value = cmds;

    const varLines = [];
    if (node.variables) {
      for (let [k, v] of Object.entries(node.variables)) {
        varLines.push(`${k}=${v}`);
      }
    }
    recVarTextarea.value = varLines.join('\n');
  }

  // Quick Command Buttons Insertion
  document.querySelectorAll('.btn-cmd-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const template = btn.getAttribute('data-cmd');
      if (!template) return;
      insertTextAtCursor(asciiTextarea, template + '\n');
    });
  });

  function insertTextAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    textarea.value = val.substring(0, start) + text + val.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
  }

  recModalClose.addEventListener('click', closeRecEditor);
  recModalCancel.addEventListener('click', closeRecEditor);

  function closeRecEditor() {
    recModalBackdrop.classList.remove('active');
    editingNode = null;
  }

  recModalSave.addEventListener('click', () => {
    if (!editingNode) return;

    editingNode.rawCommands = asciiTextarea.value;
    const baseName = editingNode.label.replace(/\.rec$/i, '');
    REC_COMMANDS_CACHE[baseName] = asciiTextarea.value;
    REC_COMMANDS_CACHE[editingNode.label] = asciiTextarea.value;

    const updatedVars = {};
    const varRaw = recVarTextarea.value.split(/\r?\n/);
    for (let l of varRaw) {
      l = l.trim();
      if (!l) continue;
      const eq = l.indexOf('=');
      if (eq > -1) {
        let k = l.substring(0, eq).trim();
        let v = l.substring(eq + 1).trim();
        if (k) {
          if (!k.startsWith('$')) k = `$${k}`;
          updatedVars[k] = v;
        }
      }
    }
    editingNode.variables = updatedVars;

    closeRecEditor();
    mainEngine.updateIsolatedStates();
    mainEngine.updateScrollbar();
  });

  btnDeleteRecNode.addEventListener('click', () => {
    if (!editingNode) return;
    if (confirm(`Delete block "${editingNode.label}"?`)) {
      deleteNodeFromGraph(editingNode);
      closeRecEditor();
    }
  });

  /**
   * Sentence Statement Editor Open (Pure Sentence - NO .rec files)
   */
  function openEquationEditor(node) {
    editingEquationNode = node;
    equationModalBackdrop.classList.add('active');

    equationInput.value = node.equation || node.label;
    updateEquationLivePreview();
  }

  function updateEquationLivePreview() {
    const val = equationInput.value.trim();
    if (val.includes('=')) {
      const parts = val.split('=');
      equationOutVarDisplay.textContent = `$${parts[0].trim().replace(/^\$/, '')}`;
      const rhs = parts[1];
      const identifiers = rhs.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) || [];
      equationInVarDisplay.textContent = identifiers.length > 0 ? `$${identifiers[0].replace(/^\$/, '')}` : '(none)';
    } else {
      equationOutVarDisplay.textContent = '(statement)';
      equationInVarDisplay.textContent = '(none)';
    }
  }

  equationInput.addEventListener('input', updateEquationLivePreview);

  equationModalClose.addEventListener('click', closeEquationEditor);
  equationModalCancel.addEventListener('click', closeEquationEditor);

  function closeEquationEditor() {
    equationModalBackdrop.classList.remove('active');
    editingEquationNode = null;
  }

  equationModalSave.addEventListener('click', () => {
    if (!editingEquationNode) return;

    const eqStr = equationInput.value.trim();
    editingEquationNode.equation = eqStr;
    editingEquationNode.label = eqStr;
    TskEnvParser.parseEquationVariables(editingEquationNode);

    if (editingEquationNode.outVar) {
      const k = `$${editingEquationNode.outVar}`;
      if (!baseEnvData.globalVars) baseEnvData.globalVars = {};
      if (!(k in baseEnvData.globalVars)) baseEnvData.globalVars[k] = '0';
    }
    if (editingEquationNode.inVar) {
      const k = `$${editingEquationNode.inVar}`;
      if (!baseEnvData.globalVars) baseEnvData.globalVars = {};
      if (!(k in baseEnvData.globalVars)) baseEnvData.globalVars[k] = '0';
    }

    closeEquationEditor();
    mainEngine.updateIsolatedStates();
  });

  btnDeleteEquationNode.addEventListener('click', () => {
    if (!editingEquationNode) return;
    deleteNodeFromGraph(editingEquationNode);
    closeEquationEditor();
  });

  /**
   * Mini-Canvas Sub-Task (.blk) Modal Open
   */
  function openBlkMiniCanvas(blkNode) {
    editingBlkNode = blkNode;
    blkModalBackdrop.classList.add('active');

    blkFileBadge.textContent = blkNode.label.endsWith('.blk') ? blkNode.label : `${blkNode.label}.blk`;
    const subSteps = blkNode.subSteps || [];
    blkSubCountBadge.textContent = `${subSteps.length} Sub-Steps`;

    const miniNodes = subSteps.map((recName, i) => ({
      id: `sub_${Date.now()}_${i}`,
      sequence: i,
      label: recName,
      type: 'rec',
      enabled: true,
      isIsolated: false,
      variables: {},
      rawCommands: getRecFileContent(recName),
      x: 30 + (i % 3) * 200,
      y: 40 + Math.floor(i / 3) * 160,
      width: 170,
      height: 80
    }));

    setTimeout(() => {
      const mEng = getMiniEngine();
      mEng.resize();
      mEng.setNodes(miniNodes);
      mEng.fitAll();
    }, 50);
  }

  btnAddSubRec.addEventListener('click', () => {
    if (!editingBlkNode) return;
    const mEng = getMiniEngine();
    const seq = mEng.nodes.length;
    const name = `sub_rec_${seq + 1}`;
    mEng.nodes.push({
      id: `sub_${Date.now()}_${seq}`,
      sequence: seq,
      label: name,
      type: 'rec',
      enabled: true,
      isIsolated: false,
      variables: {},
      rawCommands: `;= Resolution 3440x1440\r\nM_P1,500,300,L,1,,rem_action`,
      x: 30 + (seq % 3) * 200,
      y: 40 + Math.floor(seq / 3) * 160,
      width: 170,
      height: 80
    });
    mEng.rebuildSequentialFlow();
    blkSubCountBadge.textContent = `${mEng.nodes.length} Sub-Steps`;
  });

  blkModalClose.addEventListener('click', closeBlkMiniCanvas);
  blkModalCancel.addEventListener('click', closeBlkMiniCanvas);

  function closeBlkMiniCanvas() {
    blkModalBackdrop.classList.remove('active');
    editingBlkNode = null;
  }

  blkModalSave.addEventListener('click', () => {
    if (!editingBlkNode) return;
    const mEng = getMiniEngine();
    const updatedSubRecs = mEng.nodes.map(n => n.label);
    editingBlkNode.subSteps = updatedSubRecs;

    const blkKey = editingBlkNode.label.toLowerCase().endsWith('.blk') ? editingBlkNode.label : `${editingBlkNode.label}.blk`;
    BLK_CONTENT_CACHE[blkKey] = updatedSubRecs;

    closeBlkMiniCanvas();
    mainEngine.updateIsolatedStates();
  });

  btnDeleteBlkNode.addEventListener('click', () => {
    if (!editingBlkNode) return;
    deleteNodeFromGraph(editingBlkNode);
    closeBlkMiniCanvas();
  });

  /**
   * Deletes a node from the graph, automatically reconnects the execution chain,
   * re-indexes all order numbers (#1, #2, #3...), and pulls up following blocks in layout
   */
  function deleteNodeFromGraph(targetNode) {
    if (!targetNode) return;
    const idx = mainEngine.nodes.indexOf(targetNode);
    if (idx > -1) {
      // 1. Remove the node
      mainEngine.nodes.splice(idx, 1);
      if (mainEngine.selectedNode === targetNode) {
        mainEngine.selectedNode = null;
      }

      // 2. Re-index sequence order numbers for all following/remaining blocks (#1, #2, #3...)
      mainEngine.nodes.forEach((n, i) => {
        n.sequence = i;
      });

      // 3. Auto connect the chain across the deleted gap
      mainEngine.rebuildSequentialFlow();

      // 4. Auto layout so remaining blocks smoothly shift up/re-align
      mainEngine.autoLayout();
      mainEngine.updateIsolatedStates();
      mainEngine.updateScrollbar();
      updateStatusBar();
      mainEngine.onCanvasModified();
    }
  }

  /**
   * File Handlers (Multi-file & Directory Support)
   */
  btnOpenTsk.addEventListener('click', () => tskFileInput.click());
  btnOpenEnv.addEventListener('click', () => envFileInput.click());
  btnOpenFolder.addEventListener('click', () => folderInput.click());

  tskFileInput.addEventListener('change', (e) => {
    handleUploadedFiles(Array.from(e.target.files));
    tskFileInput.value = '';
  });

  folderInput.addEventListener('change', (e) => {
    handleUploadedFiles(Array.from(e.target.files));
    folderInput.value = '';
  });

  function handleUploadedFiles(files) {
    if (!files || files.length === 0) return;

    const tskFile = files.find(f => f.name.toLowerCase().endsWith('.tsk'));
    const envFile = files.find(f => f.name.toLowerCase().endsWith('.env'));
    
    let recPromises = [];
    files.forEach(f => {
      const lower = f.name.toLowerCase();
      if (lower.endsWith('.rec')) {
        const p = new Promise((resolve) => {
          const r = new FileReader();
          r.onload = (ev) => {
            const name = f.name.replace(/\.rec$/i, '');
            REC_COMMANDS_CACHE[name] = ev.target.result;
            REC_COMMANDS_CACHE[f.name] = ev.target.result;
            resolve();
          };
          r.readAsText(f);
        });
        recPromises.push(p);
      } else if (lower.endsWith('.blk')) {
        const p = new Promise((resolve) => {
          const r = new FileReader();
          r.onload = (ev) => {
            BLK_CONTENT_CACHE[f.name] = TskEnvParser.parseBlk(ev.target.result);
            resolve();
          };
          r.readAsText(f);
        });
        recPromises.push(p);
      }
    });

    Promise.all(recPromises).then(() => {
      if (tskFile) {
        const tskReader = new FileReader();
        tskReader.onload = (event) => {
          const tskContent = event.target.result;
          if (envFile) {
            const envReader = new FileReader();
            envReader.onload = (envEvent) => {
              loadTaskData(tskFile.name, tskContent, envEvent.target.result);
            };
            envReader.readAsText(envFile);
          } else {
            loadTaskData(tskFile.name, tskContent);
          }
        };
        tskReader.readAsText(tskFile);
      } else if (files.length === 1 && files[0].name.toLowerCase().endsWith('.rec')) {
        const f = files[0];
        const dummyNode = {
          label: f.name,
          type: 'rec',
          rawCommands: REC_COMMANDS_CACHE[f.name] || REC_COMMANDS_CACHE[f.name.replace(/\.rec$/i, '')]
        };
        openRecEditor(dummyNode);
      }
    });
  }

  /**
   * Recent Tasks Persistence (localStorage)
   */
  function saveToRecentTasks(name, tsk, env) {
    try {
      let recent = JSON.parse(localStorage.getItem('HR_RECENT_TASKS') || '[]');
      recent = recent.filter(r => r.name !== name);
      recent.unshift({ name, tsk, env, time: Date.now() });
      if (recent.length > 8) recent = recent.slice(0, 8);
      localStorage.setItem('HR_RECENT_TASKS', JSON.stringify(recent));
      renderRecentTasks();
    } catch (e) {}
  }

  function renderRecentTasks() {
    const recentGroup = document.getElementById('recentTasksGroup');
    if (!recentGroup) return;
    try {
      const recent = JSON.parse(localStorage.getItem('HR_RECENT_TASKS') || '[]');
      recentGroup.innerHTML = '';
      if (recent.length === 0) {
        const opt = document.createElement('option');
        opt.disabled = true;
        opt.textContent = '(No recent tasks)';
        recentGroup.appendChild(opt);
        return;
      }
      recent.forEach(r => {
        const opt = document.createElement('option');
        opt.value = `recent:${r.name}`;
        opt.textContent = `Recent: ${r.name}`;
        recentGroup.appendChild(opt);
      });
    } catch (e) {}
  }

  renderRecentTasks();

  sampleTaskSelect.addEventListener('change', (e) => {
    const key = e.target.value;
    if (key.startsWith('recent:')) {
      const taskName = key.substring(7);
      const recent = JSON.parse(localStorage.getItem('HR_RECENT_TASKS') || '[]');
      const found = recent.find(r => r.name === taskName);
      if (found) {
        loadTaskData(found.name, found.tsk, found.env);
      }
    } else if (PRESET_SAMPLES[key]) {
      loadTaskData(key, PRESET_SAMPLES[key].tsk, PRESET_SAMPLES[key].env);
    }
  });

  /**
   * Task Validation Modal Controls
   */
  const validationModal = document.getElementById('validationModal');
  const validationModalClose = document.getElementById('validationModalClose');
  const validationModalOk = document.getElementById('validationModalOk');
  const validationErrorList = document.getElementById('validationErrorList');

  function showValidationErrors(errors) {
    if (!validationErrorList || !validationModal) return;
    validationErrorList.innerHTML = '';
    errors.forEach(err => {
      const item = document.createElement('div');
      item.style.padding = '4px 0';
      item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
      item.innerHTML = `<span style="color:#ffb86c;">Line ${err.lineIndex}:</span> <code style="color:#64ffda;">${err.text}</code> — <span style="color:#ef4444;">${err.reason}</span>`;
      validationErrorList.appendChild(item);
    });
    validationModal.classList.add('active');
  }

  function closeValidationModal() {
    if (validationModal) validationModal.classList.remove('active');
  }

  if (validationModalClose) validationModalClose.addEventListener('click', closeValidationModal);
  if (validationModalOk) validationModalOk.addEventListener('click', closeValidationModal);

  /**
   * Drag & Drop
   */
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropOverlay.classList.add('active');
  });

  window.addEventListener('dragleave', (e) => {
    if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
      dropOverlay.classList.remove('active');
    }
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dropOverlay.classList.remove('active');
    handleUploadedFiles(Array.from(e.dataTransfer.files));
  });

  /**
   * Canvas View Controls
   */
  document.getElementById('btnZoomIn').addEventListener('click', () => mainEngine.zoomIn());
  document.getElementById('btnZoomOut').addEventListener('click', () => mainEngine.zoomOut());
  document.getElementById('btnResetZoom').addEventListener('click', () => mainEngine.resetView());
  btnFitAll.addEventListener('click', () => mainEngine.fitAll());

  /**
   * Save & Export (With Strict Validation Pass)
   */
  btnSaveTsk.addEventListener('click', () => {
    const validation = TskEnvParser.validateTask(mainEngine.nodes, baseEnvData);
    if (!validation.isValid) {
      showValidationErrors(validation.errors);
      return;
    }
    const tskOutput = TskEnvParser.exportTsk(mainEngine.nodes, `;= ${currentTaskName}`);
    saveToRecentTasks(currentTaskName, tskOutput, TskEnvParser.exportEnv(baseEnvData, mainEngine.nodes));
    downloadFile(currentTaskName.endsWith('.tsk') ? currentTaskName : `${currentTaskName}.tsk`, tskOutput);
  });

  btnSaveEnv.addEventListener('click', () => {
    const validation = TskEnvParser.validateTask(mainEngine.nodes, baseEnvData);
    if (!validation.isValid) {
      showValidationErrors(validation.errors);
      return;
    }
    const envOutput = TskEnvParser.exportEnv(baseEnvData, mainEngine.nodes);
    const envName = currentTaskName.replace(/\.tsk$/i, '') + '.env';
    downloadFile(envName, envOutput);
  });

  btnExportFlow.addEventListener('click', () => {
    const flowData = {
      taskName: currentTaskName,
      version: '1.0',
      exportedAt: new Date().toISOString(),
      nodes: mainEngine.nodes,
      connections: mainEngine.connections,
      envData: baseEnvData
    };
    const jsonStr = JSON.stringify(flowData, null, 2);
    const flwName = currentTaskName.replace(/\.tsk$/i, '') + '.flw';
    downloadFile(flwName, jsonStr);
  });

  function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
});
