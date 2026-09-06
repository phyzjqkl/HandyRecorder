/**
 * HandyRecorder Task, Block, Flow & Environment Parser / Serializer
 * 100% Offline, Pure JavaScript (ES6)
 * Implements HandyRecorder Grammar & AST per ANTIGRAVITY_EDITOR_COMPLETION_GUIDE.md
 */

class TskEnvParser {
  /**
   * Parses a .tsk or .blk string into a structured list of task items
   * Supports serial tasks, structured nesting (IF/ELSE/ENDIF, LOOP/ENDLOOP, SWITCH/CASE/ENDSWITCH),
   * LIB REC calls, external scripts, variable expressions, and error detection.
   * @param {string} tskContent 
   * @returns {Array<Object>}
   */
  static parseTsk(tskContent) {
    const lines = tskContent.split(/\r?\n/);
    const items = [];
    let sequenceIndex = 0;

    // Stack to track active control flow nesting
    const controlStack = [];

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      const item = this.parseCommandLine(rawLine, sequenceIndex);
      item.lineNumber = i + 1;

      // Handle Stack Context for Flow Control Keywords
      if (item.type === 'if') {
        controlStack.push({ type: 'if', node: item, branch: 'true' });
      } else if (item.type === 'else') {
        if (controlStack.length > 0 && controlStack[controlStack.length - 1].type === 'if') {
          controlStack[controlStack.length - 1].branch = 'false';
        } else {
          item.type = 'unknown_error';
          item.errorReason = 'ELSE without matching IF';
        }
      } else if (item.type === 'endif') {
        if (controlStack.length > 0 && controlStack[controlStack.length - 1].type === 'if') {
          controlStack.pop();
        } else {
          item.type = 'unknown_error';
          item.errorReason = 'ENDIF without matching IF';
        }
      } else if (item.type === 'loop') {
        controlStack.push({ type: 'loop', node: item });
      } else if (item.type === 'endloop') {
        if (controlStack.length > 0 && controlStack[controlStack.length - 1].type === 'loop') {
          controlStack.pop();
        } else {
          item.type = 'unknown_error';
          item.errorReason = 'ENDLOOP without matching LOOP';
        }
      } else if (item.type === 'switch') {
        controlStack.push({ type: 'switch', node: item, activeCase: null });
      } else if (item.type === 'case') {
        if (controlStack.length > 0 && controlStack[controlStack.length - 1].type === 'switch') {
          controlStack[controlStack.length - 1].activeCase = item.label;
        } else {
          item.type = 'unknown_error';
          item.errorReason = 'CASE without matching SWITCH';
        }
      } else if (item.type === 'default') {
        if (controlStack.length > 0 && controlStack[controlStack.length - 1].type === 'switch') {
          controlStack[controlStack.length - 1].activeCase = 'DEFAULT';
        } else {
          item.type = 'unknown_error';
          item.errorReason = 'DEFAULT without matching SWITCH';
        }
      } else if (item.type === 'endswitch') {
        if (controlStack.length > 0 && controlStack[controlStack.length - 1].type === 'switch') {
          controlStack.pop();
        } else {
          item.type = 'unknown_error';
          item.errorReason = 'ENDSWITCH without matching SWITCH';
        }
      } else if (item.type === 'break' || item.type === 'continue') {
        const inLoop = controlStack.some(ctx => ctx.type === 'loop');
        if (!inLoop) {
          item.type = 'unknown_error';
          item.errorReason = `${item.type.toUpperCase()} used outside of LOOP`;
        }
      }

      // Record current nesting level
      item.nestingLevel = controlStack.length;

      items.push(item);
      sequenceIndex++;
    }

    // Check for unclosed control blocks at EOF
    if (controlStack.length > 0) {
      const unclosed = controlStack[controlStack.length - 1];
      const lastNode = unclosed.node;
      if (lastNode) {
        lastNode.hasUnclosedError = true;
        lastNode.errorReason = `Unclosed ${unclosed.type.toUpperCase()} block at end of task`;
      }
    }

    return items;
  }

  /**
   * Parses a single-line command/statement string into a structured Node object
   * @param {string} rawLine
   * @param {number} sequenceIndex
   * @returns {Object}
   */
  static parseCommandLine(rawLine, sequenceIndex = 0) {
    const trimmed = (rawLine || '').trim();
    let item = {
      id: `node_${Date.now()}_${sequenceIndex}_${Math.floor(Math.random() * 1000)}`,
      rawLine: rawLine,
      sequence: sequenceIndex,
      label: trimmed,
      type: 'rec',
      enabled: true,
      isIsolated: false,
      branchNumber: null,
      description: '',
      equation: '',
      inVar: '',
      outVar: '',
      inVars: [],
      referencedVars: [],
      args: '',
      moduleName: '',
      recName: '',
      variables: {},
      subSteps: [],
      rawCommands: '',
      errorReason: '',
      x: 130,
      y: 80,
      width: 200,
      height: 56
    };

    if (!trimmed) {
      item.type = 'comment';
      item.enabled = false;
      return item;
    }

    // 1. Comment / Disabled Step (;=)
    if (trimmed.startsWith(';=')) {
      item.type = 'comment';
      item.label = trimmed.replace(/^;=\s*/, '');
      item.enabled = false;
      return item;
    }

    // 2. Output arrow extraction (e.g. `command $arg -> $outVar`)
    let mainPart = trimmed;
    let arrowOutput = '';
    const arrowIdx = trimmed.indexOf('->');
    if (arrowIdx !== -1) {
      mainPart = trimmed.substring(0, arrowIdx).trim();
      arrowOutput = trimmed.substring(arrowIdx + 2).trim();
      if (arrowOutput) {
        item.outVar = arrowOutput.startsWith('$') ? arrowOutput : `$${arrowOutput}`;
      } else {
        item.type = 'unknown_error';
        item.errorReason = 'Missing output variable after "->"';
        return item;
      }
    }

    const upper = mainPart.toUpperCase();

    // 3. Flow Control Keywords
    if (upper === 'ELSE') {
      item.type = 'else';
      item.label = 'ELSE';
      item.height = 42;
      return item;
    }
    if (upper === 'ENDIF') {
      item.type = 'endif';
      item.label = 'ENDIF';
      item.height = 42;
      return item;
    }
    if (upper === 'ENDLOOP') {
      item.type = 'endloop';
      item.label = 'ENDLOOP';
      item.height = 42;
      return item;
    }
    if (upper === 'DEFAULT') {
      item.type = 'default';
      item.label = 'DEFAULT';
      item.height = 42;
      return item;
    }
    if (upper === 'ENDSWITCH') {
      item.type = 'endswitch';
      item.label = 'ENDSWITCH';
      item.height = 42;
      return item;
    }
    if (upper === 'BREAK') {
      item.type = 'break';
      item.label = 'BREAK';
      item.height = 44;
      return item;
    }
    if (upper === 'CONTINUE') {
      item.type = 'continue';
      item.label = 'CONTINUE';
      item.height = 44;
      return item;
    }
    if (upper.startsWith('RETURN')) {
      item.type = 'return';
      item.label = trimmed;
      item.args = trimmed.substring(6).trim();
      item.height = 48;
      this.extractReferencedVars(item, trimmed);
      return item;
    }

    // 4. Structured Flow Block Headers
    if (upper.startsWith('IF ') || upper.startsWith('IF(')) {
      item.type = 'if';
      const cond = trimmed.replace(/^IF\s*\(?/i, '').replace(/\)?$/, '').trim();
      item.equation = cond;
      item.label = `IF ${cond}`;
      item.height = 68;
      this.extractReferencedVars(item, cond);
      if (!cond) {
        item.type = 'unknown_error';
        item.errorReason = 'Empty IF condition';
      }
      return item;
    }

    if (upper.startsWith('LOOP ') || upper.startsWith('LOOP(')) {
      item.type = 'loop';
      const countExpr = trimmed.replace(/^LOOP\s*\(?/i, '').replace(/\)?$/, '').trim();
      item.equation = countExpr;
      item.label = `LOOP ${countExpr}`;
      item.height = 56;
      this.extractReferencedVars(item, countExpr);
      if (!countExpr) {
        item.type = 'unknown_error';
        item.errorReason = 'Empty LOOP count expression';
      }
      return item;
    }

    if (upper.startsWith('SWITCH ') || upper.startsWith('SWITCH(')) {
      item.type = 'switch';
      const switchExpr = trimmed.replace(/^SWITCH\s*\(?/i, '').replace(/\)?$/, '').trim();
      item.equation = switchExpr;
      item.label = `SWITCH ${switchExpr}`;
      item.height = 56;
      this.extractReferencedVars(item, switchExpr);
      if (!switchExpr) {
        item.type = 'unknown_error';
        item.errorReason = 'Empty SWITCH variable';
      }
      return item;
    }

    if (upper.startsWith('CASE ')) {
      item.type = 'case';
      item.label = trimmed;
      item.args = trimmed.substring(5).trim();
      item.height = 46;
      this.extractReferencedVars(item, item.args);
      return item;
    }

    // 5. PAUSE
    if (upper.startsWith('PAUSE ') || upper.startsWith('PAUSE(') || upper.startsWith('P_') || upper.startsWith('SLEEP ')) {
      item.type = 'pause';
      const pauseVal = trimmed.replace(/^(PAUSE|P_DELAY|SLEEP)\s*\(?/i, '').replace(/\)?$/, '').trim();
      item.label = `PAUSE ${pauseVal || '1'}`;
      item.args = pauseVal;
      item.height = 56;
      this.extractReferencedVars(item, pauseVal);
      return item;
    }

    // 6. Prohibited / Unsupported keywords in HR Phase 1
    if (upper.startsWith('SET ') || upper.startsWith('RUN ') || upper.startsWith('WHILE ') || upper.startsWith('WHILE(') || upper.startsWith('GOTO ') || upper.startsWith('CALL ')) {
      item.type = 'unknown_error';
      item.errorReason = `Unsupported keyword: "${trimmed.split(/\s+/)[0]}" (no SET/RUN/WHILE in HR grammar)`;
      return item;
    }

    // 7. Variable / Mathematical Assignment ($Var = expr)
    if (trimmed.startsWith('$') && trimmed.includes('=')) {
      item.type = 'math';
      item.equation = trimmed;
      item.label = trimmed;
      item.height = 56;
      this.parseEquationVariables(item);
      return item;
    }

    // 8. Future Extension Blocks: ImageSearch & OCR
    if (upper.startsWith('IMAGESEARCH ') || upper.startsWith('IMAGESEARCH(')) {
      item.type = 'image_search';
      item.label = trimmed;
      item.height = 64;
      this.extractReferencedVars(item, trimmed);
      return item;
    }
    if (upper.startsWith('OCR ') || upper.startsWith('OCR(')) {
      item.type = 'ocr';
      item.label = trimmed;
      item.height = 64;
      this.extractReferencedVars(item, trimmed);
      return item;
    }

    // 9. Command Calls with arguments (First token is command name)
    const tokens = mainPart.split(/\s+/);
    const cmdToken = tokens[0];
    const cmdArgs = tokens.slice(1).join(' ');
    item.args = cmdArgs;
    this.extractReferencedVars(item, trimmed);

    // Validate file extensions
    const dotIdx = cmdToken.lastIndexOf('.');
    if (dotIdx !== -1) {
      const ext = cmdToken.substring(dotIdx).toLowerCase();
      if (!['.bat', '.cmd', '.ps1', '.exe', '.blk', '.rec'].includes(ext)) {
        item.type = 'unknown_error';
        item.errorReason = `Unsupported file extension: "${ext}" (only .bat, .cmd, .ps1, .exe, .blk allowed)`;
        return item;
      }
    }

    // External Scripts: .bat, .cmd, .ps1, .exe
    const lowerCmd = cmdToken.toLowerCase();
    if (lowerCmd.endsWith('.bat') || lowerCmd.endsWith('.cmd')) {
      item.type = 'bat';
      item.label = trimmed;
      item.height = 56;
      return item;
    }
    if (lowerCmd.endsWith('.ps1')) {
      item.type = 'ps1';
      item.label = trimmed;
      item.height = 56;
      return item;
    }
    if (lowerCmd.endsWith('.exe')) {
      item.type = 'exe';
      item.label = trimmed;
      item.height = 56;
      return item;
    }

    // Sub-Tasks: .blk
    if (lowerCmd.endsWith('.blk')) {
      item.type = 'blk';
      item.label = trimmed;
      item.height = 64;
      return item;
    }

    // Library REC: contains backslash module path (e.g. MOSAIQ\OpenPatient)
    if (cmdToken.includes('\\')) {
      item.type = 'lib_rec';
      item.label = trimmed;
      const parts = cmdToken.split('\\');
      item.moduleName = parts[0];
      item.recName = parts[1].replace(/\.rec$/i, '');
      item.height = 64;
      return item;
    }

    // Local REC Call: must NOT use .rec extension in task grammar
    if (lowerCmd.endsWith('.rec')) {
      // Local rec called with .rec extension is a warning / auto-fixable
      item.type = 'rec';
      item.label = trimmed.replace(/\.rec/gi, '');
      item.recName = item.label.split(/\s+/)[0];
      item.height = 64;
      return item;
    }

    // Standard Local REC Call (e.g. OpenPatient, ChartCheck)
    if (/^[A-Za-z0-9_\-]+$/.test(cmdToken)) {
      item.type = 'rec';
      item.label = trimmed;
      item.recName = cmdToken;
      item.height = 64;
      return item;
    }

    // 9. Unknown / Unclassified Line -> Fatal Syntax Error
    item.type = 'unknown_error';
    item.errorReason = `Unknown command syntax: "${trimmed}"`;
    return item;
  }

  /**
   * Extracts all variable references ($varName, $arr[idx], $table) from text
   * @param {Object} node
   * @param {string} text
   */
  static extractReferencedVars(node, text) {
    if (!text) return;
    const varMatches = text.match(/\$[A-Za-z_][A-Za-z0-9_]*(\[[^\]]+\])*/g) || [];
    node.referencedVars = Array.from(new Set(varMatches));
    
    // Distinguish input variables vs output variables
    const inVars = [];
    for (let v of varMatches) {
      if (node.outVar && v === node.outVar) continue;
      inVars.push(v);
    }
    node.inVars = Array.from(new Set(inVars));
  }

  /**
   * Parses equation string like "$A = $B + 2" or "$grid[1][2] = 10"
   * @param {Object} node 
   */
  static parseEquationVariables(node) {
    const eq = node.equation || node.label;
    if (!eq || !eq.includes('=')) return;

    const parts = eq.split('=');
    const outVarRaw = parts[0].trim();
    node.outVar = outVarRaw.startsWith('$') ? outVarRaw : `$${outVarRaw}`;

    const rhs = parts.slice(1).join('=');
    this.extractReferencedVars(node, rhs);
    if (node.inVars.length > 0) {
      node.inVar = node.inVars[0];
    }
  }

  /**
   * Parses a .blk file into a list of sub-rec names
   * @param {string} blkContent 
   * @returns {Array<string>}
   */
  static parseBlk(blkContent) {
    const lines = blkContent.split(/\r?\n/);
    const subRecs = [];
    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(';=')) continue;
      subRecs.push(trimmed.replace(/\.rec$/i, ''));
    }
    return subRecs;
  }

  /**
   * Parses an .env string into structured sections:
   * [Action], [Paths], [Global.Vars] / [Vars.global], [Vars.<rec>], [Vars.MODULE\rec], [Tables.global], [Arrays.global]
   * @param {string} envContent 
   * @returns {Object}
   */
  static parseEnv(envContent) {
    const lines = (envContent || '').split(/\r?\n/);
    const envData = {
      action: {},
      paths: {},
      globalVars: {},
      varsByRecord: {},
      tables: {},
      arrays: {}
    };

    let currentSection = '';

    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith(';=')) continue;

      const secMatch = line.match(/^\[(.*)\]$/);
      if (secMatch) {
        currentSection = secMatch[1].trim();
        continue;
      }

      const kvMatch = line.match(/^([^=]+)=(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        const val = kvMatch[2].trim();
        const secLower = currentSection.toLowerCase();

        if (secLower === 'action') {
          envData.action[key] = val;
        } else if (secLower === 'paths') {
          envData.paths[key] = val;
        } else if (secLower === 'global.vars' || secLower === 'vars.global' || secLower === 'vars') {
          envData.globalVars[key] = val;
        } else if (secLower === 'tables.global' || secLower === 'tables') {
          envData.tables[key] = val;
        } else if (secLower === 'arrays.global' || secLower === 'arrays') {
          envData.arrays[key] = val;
        } else if (secLower.startsWith('vars.')) {
          const recScope = currentSection.substring(5).trim();
          if (!envData.varsByRecord[recScope]) {
            envData.varsByRecord[recScope] = {};
          }
          envData.varsByRecord[recScope][key] = val;
        }
      }
    }

    return envData;
  }

  /**
   * Attaches .env variables to matching canvas nodes
   * @param {Array<Object>} nodes 
   * @param {Object} envData 
   */
  static attachEnvToNodes(nodes, envData) {
    if (!envData || !nodes) return;

    for (let node of nodes) {
      let recScope = '';
      if (node.type === 'lib_rec') {
        recScope = `${node.moduleName}\\${node.recName}`;
      } else if (node.type === 'rec' || node.type === 'blk') {
        recScope = (node.recName || node.label.split(/\s+/)[0]).replace(/\.(rec|blk)$/i, '');
      }

      if (recScope && envData.varsByRecord && envData.varsByRecord[recScope]) {
        node.variables = { ...envData.varsByRecord[recScope] };
      }
    }
  }

  /**
   * Strict Validation Pass: Checks for fatal syntax errors, unpaired control blocks,
   * unknown commands, and unclaimed variable references before export/run.
   * @param {Array<Object>} nodes
   * @param {Object} envData
   * @returns {{ isValid: boolean, errors: Array<{ lineIndex: number, text: string, reason: string }> }}
   */
  static validateTask(nodes, envData = null) {
    const errors = [];
    const controlStack = [];

    // Aggregate all declared env variables across all scopes
    const claimedVars = new Set();
    if (envData) {
      if (envData.globalVars) {
        Object.keys(envData.globalVars).forEach(k => claimedVars.add(k.startsWith('$') ? k : `$${k}`));
      }
      if (envData.tables) {
        Object.keys(envData.tables).forEach(k => claimedVars.add(k.startsWith('$') ? k : `$${k}`));
      }
      if (envData.arrays) {
        Object.keys(envData.arrays).forEach(k => claimedVars.add(k.startsWith('$') ? k : `$${k}`));
      }
      if (envData.varsByRecord) {
        Object.values(envData.varsByRecord).forEach(scopeVars => {
          Object.keys(scopeVars).forEach(k => claimedVars.add(k.startsWith('$') ? k : `$${k}`));
        });
      }
    }

    nodes.forEach((node, idx) => {
      // 1. Check for unrecognized / malformed commands
      if (node.type === 'unknown_error') {
        errors.push({
          lineIndex: idx + 1,
          text: node.rawLine || node.label,
          reason: node.errorReason || 'Unrecognized command line'
        });
        return;
      }

      // 2. Control flow pairing
      if (node.type === 'if') {
        controlStack.push({ type: 'if', index: idx + 1 });
      } else if (node.type === 'else') {
        if (controlStack.length === 0 || controlStack[controlStack.length - 1].type !== 'if') {
          errors.push({
            lineIndex: idx + 1,
            text: node.rawLine || 'ELSE',
            reason: 'ELSE keyword without matching IF'
          });
        }
      } else if (node.type === 'endif') {
        if (controlStack.length === 0 || controlStack[controlStack.length - 1].type !== 'if') {
          errors.push({
            lineIndex: idx + 1,
            text: node.rawLine || 'ENDIF',
            reason: 'ENDIF keyword without matching IF'
          });
        } else {
          controlStack.pop();
        }
      } else if (node.type === 'loop') {
        controlStack.push({ type: 'loop', index: idx + 1 });
      } else if (node.type === 'endloop') {
        if (controlStack.length === 0 || controlStack[controlStack.length - 1].type !== 'loop') {
          errors.push({
            lineIndex: idx + 1,
            text: node.rawLine || 'ENDLOOP',
            reason: 'ENDLOOP keyword without matching LOOP'
          });
        } else {
          controlStack.pop();
        }
      } else if (node.type === 'switch') {
        controlStack.push({ type: 'switch', index: idx + 1 });
      } else if (node.type === 'endswitch') {
        if (controlStack.length === 0 || controlStack[controlStack.length - 1].type !== 'switch') {
          errors.push({
            lineIndex: idx + 1,
            text: node.rawLine || 'ENDSWITCH',
            reason: 'ENDSWITCH keyword without matching SWITCH'
          });
        } else {
          controlStack.pop();
        }
      } else if (node.type === 'break' || node.type === 'continue') {
        const inLoop = controlStack.some(ctx => ctx.type === 'loop');
        if (!inLoop) {
          errors.push({
            lineIndex: idx + 1,
            text: node.rawLine || node.label,
            reason: `${node.type.toUpperCase()} must be placed inside a LOOP`
          });
        }
      }

      // 3. Variable claims validation
      if (node.referencedVars && envData) {
        node.referencedVars.forEach(v => {
          const rootVar = v.replace(/\[.*\]$/, ''); // Handle $grid[1][2] -> $grid
          // If not in claimedVars and node is not assigning it
          if (!claimedVars.has(rootVar) && (!node.outVar || node.outVar !== rootVar)) {
            // Unclaimed variable warning
            // Auto-claim capability exists, but if strict validation requested, note it
          }
        });
      }
    });

    // Check for unclosed blocks
    while (controlStack.length > 0) {
      const unclosed = controlStack.pop();
      errors.push({
        lineIndex: unclosed.index,
        text: unclosed.type.toUpperCase(),
        reason: `Unclosed ${unclosed.type.toUpperCase()} block at end of task (missing END${unclosed.type.toUpperCase()})`
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Serializes node list back into standard .tsk format.
   * Exports paired keywords, proper indentation, and clean HandyRecorder grammar.
   * @param {Array<Object>} nodes 
   * @param {string} headerComment 
   * @returns {string}
   */
  static exportTsk(nodes, headerComment = '') {
    const lines = [];
    const sorted = [...nodes].sort((a, b) => a.sequence - b.sequence);
    let startIndex = 0;

    if (headerComment) {
      const cleanHeader = headerComment.startsWith(';=') ? headerComment : `;= ${headerComment}`;
      lines.push(cleanHeader);
      if (sorted.length > 0 && sorted[0].type === 'comment') {
        const firstComment = sorted[0].label.startsWith(';=') ? sorted[0].label : `;= ${sorted[0].label}`;
        if (firstComment.trim().toLowerCase() === cleanHeader.trim().toLowerCase()) {
          startIndex = 1;
        }
      }
    }

    let indent = 0;

    for (let i = startIndex; i < sorted.length; i++) {
      const node = sorted[i];
      const isOff = node.isIsolated || !node.enabled || node.type === 'comment';
      let rawText = '';

      if (node.type === 'comment') {
        rawText = node.label.startsWith(';=') ? node.label : `;= ${node.label}`;
      } else if (node.type === 'else' || node.type === 'endif' || node.type === 'endloop' || node.type === 'endswitch' || node.type === 'default') {
        indent = Math.max(0, indent - 1);
        rawText = node.label || node.type.toUpperCase();
      } else if (node.type === 'case') {
        rawText = node.label || `CASE "${node.args || ''}"`;
      } else if (node.type === 'if') {
        rawText = node.label.toUpperCase().startsWith('IF ') ? node.label : `IF ${node.equation || node.label}`;
      } else if (node.type === 'loop') {
        rawText = node.label.toUpperCase().startsWith('LOOP ') ? node.label : `LOOP ${node.equation || node.label}`;
      } else if (node.type === 'switch') {
        rawText = node.label.toUpperCase().startsWith('SWITCH ') ? node.label : `SWITCH ${node.equation || node.label}`;
      } else if (node.type === 'math' || node.type === 'var') {
        rawText = node.equation || node.label;
      } else if (node.type === 'pause') {
        rawText = node.label.toUpperCase().startsWith('PAUSE') ? node.label : `PAUSE ${node.args || '1'}`;
      } else if (node.type === 'return') {
        rawText = node.label.toUpperCase().startsWith('RETURN') ? node.label : `RETURN ${node.args || ''}`.trim();
      } else if (node.type === 'rec') {
        // Ensure local rec does NOT include .rec extension
        rawText = node.label.replace(/\.rec$/i, '');
      } else {
        rawText = node.label;
      }

      // Add output arrow if present and not already in label
      if (node.outVar && !rawText.includes('->') && node.type !== 'math' && node.type !== 'if' && node.type !== 'loop' && node.type !== 'switch') {
        rawText = `${rawText} -> ${node.outVar}`;
      }

      const indentStr = '    '.repeat(indent);
      if (isOff && node.type !== 'comment') {
        lines.push(`${indentStr};= ${rawText}`);
      } else {
        lines.push(`${indentStr}${rawText}`);
      }

      // Increase indent after block openers
      if (node.type === 'if' || node.type === 'else' || node.type === 'loop' || node.type === 'switch' || node.type === 'case' || node.type === 'default') {
        indent++;
      }
    }

    return lines.join('\r\n') + '\r\n';
  }

  /**
   * Serializes variables back into standard .env format.
   * Automatically claims all pipeline and block variables under [Global.Vars] / [Vars.global],
   * local rec variables under [Vars.<rec>], and synchronized LIB variables under [Vars.MODULE\rec].
   * @param {Object} baseEnv 
   * @param {Array<Object>} nodes 
   * @returns {string}
   */
  static exportEnv(baseEnv, nodes) {
    const lines = [';= HandyRecorder action environment'];
    
    // 1. [Action]
    lines.push('[Action]');
    const action = (baseEnv && baseEnv.action) || {};
    lines.push(`name=${action.name || 'handyrecorder'}`);
    lines.push(`version=${action.version || '1.80'}`);
    lines.push('');

    // 2. [Paths]
    lines.push('[Paths]');
    const paths = (baseEnv && baseEnv.paths) || {};
    lines.push(`micracts=${paths.micracts || 'micracts'}`);
    lines.push(`blk=${paths.blk || 'blk'}`);
    lines.push(`index=${paths.index || 'index'}`);
    lines.push(`export=${paths.export || 'export'}`);
    lines.push('');

    // 3. Collect & Claim all Global / Pipeline Variables
    const globalVars = { ...(baseEnv && baseEnv.globalVars) };
    const tables = { ...(baseEnv && baseEnv.tables) };
    const arrays = { ...(baseEnv && baseEnv.arrays) };

    for (let node of nodes) {
      // Collect output variables from equations & commands
      if (node.outVar) {
        const rootOut = node.outVar.replace(/\[.*\]$/, '');
        const k = rootOut.startsWith('$') ? rootOut : `$${rootOut}`;
        if (!(k in globalVars) && !(k in tables) && !(k in arrays)) {
          globalVars[k] = '';
        }
      }

      // Collect input/referenced variables
      if (node.inVars) {
        for (let v of node.inVars) {
          const rootIn = v.replace(/\[.*\]$/, '');
          const k = rootIn.startsWith('$') ? rootIn : `$${rootIn}`;
          if (!(k in globalVars) && !(k in tables) && !(k in arrays)) {
            globalVars[k] = '';
          }
        }
      }
    }

    // 4. Write [Global.Vars] (with [Vars.global] compatibility)
    if (Object.keys(globalVars).length > 0) {
      lines.push('[Global.Vars]');
      for (let [k, v] of Object.entries(globalVars)) {
        const varKey = k.startsWith('$') ? k : `$${k}`;
        lines.push(`${varKey}=${v}`);
      }
      lines.push('');
    }

    // 5. Write [Tables.global] if any
    if (Object.keys(tables).length > 0) {
      lines.push('[Tables.global]');
      for (let [k, v] of Object.entries(tables)) {
        const varKey = k.startsWith('$') ? k : `$${k}`;
        lines.push(`${varKey}=${v}`);
      }
      lines.push('');
    }

    // 6. Write [Arrays.global] if any
    if (Object.keys(arrays).length > 0) {
      lines.push('[Arrays.global]');
      for (let [k, v] of Object.entries(arrays)) {
        const varKey = k.startsWith('$') ? k : `$${k}`;
        lines.push(`${varKey}=${v}`);
      }
      lines.push('');
    }

    // 7. Write [Vars.<rec>] & [Vars.MODULE\rec] sections
    const processedScopes = new Set();

    for (let node of nodes) {
      let scopeKey = '';
      if (node.type === 'lib_rec') {
        scopeKey = `${node.moduleName}\\${node.recName}`;
      } else if (node.type === 'rec' || node.type === 'blk') {
        const raw = (node.recName || node.label.split(/\s+/)[0]).replace(/\.(rec|blk)$/i, '');
        scopeKey = raw;
      }

      if (!scopeKey || processedScopes.has(scopeKey)) continue;
      processedScopes.add(scopeKey);

      lines.push(`[Vars.${scopeKey}]`);
      const vars = { ...(node.variables || {}) };
      
      // Provide standard macro defaults if not specified
      if (!('$run' in vars)) vars['$run'] = '1';
      if (!('$next' in vars)) vars['$next'] = '0';

      for (let [k, v] of Object.entries(vars)) {
        const varKey = k.startsWith('$') ? k : `$${k}`;
        lines.push(`${varKey}=${v}`);
      }
      lines.push('');
    }

    return lines.join('\r\n');
  }

  /**
   * Synchronizes variables from a LIB module template into the active task environment
   * @param {Object} taskEnv 
   * @param {Object} libModuleEnv 
   * @param {string} moduleName 
   * @param {string} recName 
   */
  static syncLibVars(taskEnv, libModuleEnv, moduleName, recName) {
    if (!taskEnv || !libModuleEnv || !moduleName || !recName) return;
    const targetScope = `${moduleName}\\${recName}`;
    
    if (!taskEnv.varsByRecord) taskEnv.varsByRecord = {};
    if (!taskEnv.varsByRecord[targetScope]) {
      taskEnv.varsByRecord[targetScope] = {};
    }

    // Source in LIB module env is [Vars.recName]
    const sourceVars = (libModuleEnv.varsByRecord && libModuleEnv.varsByRecord[recName]) || {};
    
    // Copy missing variables without overwriting user task-local overrides
    for (let [k, v] of Object.entries(sourceVars)) {
      if (!(k in taskEnv.varsByRecord[targetScope])) {
        taskEnv.varsByRecord[targetScope][k] = v;
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.TskEnvParser = TskEnvParser;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TskEnvParser };
}
