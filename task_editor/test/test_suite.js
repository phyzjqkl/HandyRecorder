/**
 * HandyRecorder Visual Task Editor - Comprehensive Acceptance & Regression Test Suite
 * Executable with Node.js: `node test/test_suite.js`
 */

const fs = require('fs');
const path = require('path');
const { TskEnvParser } = require('../js/tsk_env_parser.js');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('================================================================');
console.log('🚀 Running HandyRecorder Task Editor Acceptance Test Suite');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: Serial Task Import & Export without Reordering
// -----------------------------------------------------------------------------
console.log('📦 Test Suite 1: Serial Task Import & Export Order Preservation');
{
  const serialTsk = [
    ';= Serial flow',
    'OpenPatient',
    'SelDI',
    'ChartCheck',
    'MakeNote'
  ].join('\r\n');

  const nodes = TskEnvParser.parseTsk(serialTsk);
  assert(nodes.length === 5, 'Parsed 5 nodes (1 comment + 4 recs)');
  assert(nodes[0].type === 'comment' && nodes[0].label === 'Serial flow', 'Node 0 is comment');
  assert(nodes[1].label === 'OpenPatient' && nodes[1].type === 'rec', 'Node 1 is OpenPatient');
  assert(nodes[2].label === 'SelDI' && nodes[2].type === 'rec', 'Node 2 is SelDI');
  assert(nodes[3].label === 'ChartCheck' && nodes[3].type === 'rec', 'Node 3 is ChartCheck');
  assert(nodes[4].label === 'MakeNote' && nodes[4].type === 'rec', 'Node 4 is MakeNote');

  const exported = TskEnvParser.exportTsk(nodes, ';= Serial flow');
  const reParsed = TskEnvParser.parseTsk(exported);
  assert(reParsed.length === 5, 'Re-parsed exported serial task has 5 nodes');
  assert(reParsed[1].label === 'OpenPatient' && reParsed[4].label === 'MakeNote', 'Round-trip preserved exact order');
}
console.log('');

// -----------------------------------------------------------------------------
// TEST 2: Acceptance Test 11.1 - Basic Pipeline (IF / ELSE / ENDIF / RETURN)
// -----------------------------------------------------------------------------
console.log('📦 Test Suite 2: Acceptance Test 11.1 - Basic Pipeline (IF/ELSE/ENDIF/RETURN)');
{
  const test11_1 = [
    ';= Basic pipeline',
    '$patient = "Test Patient"',
    'OpenPatient $patient -> $open_ok',
    'IF $open_ok = "OK"',
    '    ChartCheck',
    'ELSE',
    '    RETURN $open_ok',
    'ENDIF',
    'PAUSE 1',
    'RETURN "DONE"'
  ].join('\r\n');

  const nodes = TskEnvParser.parseTsk(test11_1);
  assert(nodes.length === 10, 'Parsed 10 statements');
  assert(nodes[1].type === 'math' && nodes[1].outVar === '$patient', 'Parsed $patient assignment');
  assert(nodes[2].type === 'rec' && nodes[2].outVar === '$open_ok' && nodes[2].inVars.includes('$patient'), 'Parsed OpenPatient with args & -> $open_ok');
  assert(nodes[3].type === 'if' && nodes[3].equation === '$open_ok = "OK"', 'Parsed IF block with condition');
  assert(nodes[5].type === 'else', 'Parsed ELSE statement');
  assert(nodes[6].type === 'return' && nodes[6].args === '$open_ok', 'Parsed RETURN with argument');
  assert(nodes[7].type === 'endif', 'Parsed ENDIF statement');
  assert(nodes[8].type === 'pause' && nodes[8].args === '1', 'Parsed PAUSE 1');

  const validation = TskEnvParser.validateTask(nodes);
  assert(validation.isValid, 'Validation passed without errors');

  const exported = TskEnvParser.exportTsk(nodes, ';= Basic pipeline');
  assert(exported.includes('IF $open_ok = "OK"'), 'Export contains IF');
  assert(exported.includes('    ChartCheck'), 'Export indents true branch');
  assert(exported.includes('ELSE'), 'Export contains ELSE');
  assert(exported.includes('    RETURN $open_ok'), 'Export indents false branch');
  assert(exported.includes('ENDIF'), 'Export contains ENDIF');
}
console.log('');

// -----------------------------------------------------------------------------
// TEST 3: Acceptance Test 11.2 - Loop with Break
// -----------------------------------------------------------------------------
console.log('📦 Test Suite 3: Acceptance Test 11.2 - Loop With Break');
{
  const test11_2 = [
    ';= Loop test',
    '$N = 5',
    'LOOP $N',
    '    CheckStatus -> $status',
    '    IF $status = "OK"',
    '        BREAK',
    '    ENDIF',
    '    NextPage',
    'ENDLOOP',
    'RETURN $status'
  ].join('\r\n');

  const nodes = TskEnvParser.parseTsk(test11_2);
  assert(nodes[2].type === 'loop' && nodes[2].equation === '$N', 'Parsed LOOP $N');
  assert(nodes[5].type === 'break', 'Parsed BREAK inside LOOP');
  assert(nodes[8].type === 'endloop', 'Parsed ENDLOOP');

  const validation = TskEnvParser.validateTask(nodes);
  assert(validation.isValid, 'Validation passed (BREAK is valid inside LOOP)');

  const exported = TskEnvParser.exportTsk(nodes, ';= Loop test');
  assert(exported.includes('LOOP $N'), 'Export contains LOOP');
  assert(exported.includes('        BREAK'), 'Export indents nested BREAK correctly');
  assert(exported.includes('ENDLOOP'), 'Export contains ENDLOOP');
}
console.log('');

// -----------------------------------------------------------------------------
// TEST 4: Acceptance Test 11.3 - Switch Case
// -----------------------------------------------------------------------------
console.log('📦 Test Suite 4: Acceptance Test 11.3 - Switch Case');
{
  const test11_3 = [
    ';= Switch test',
    'SWITCH $mode',
    'CASE "weekly"',
    '    WeeklyNote',
    'CASE "completeTx"',
    '    CompleteTxNote',
    'DEFAULT',
    '    GeneralNote',
    'ENDSWITCH'
  ].join('\r\n');

  const nodes = TskEnvParser.parseTsk(test11_3);
  assert(nodes[1].type === 'switch' && nodes[1].equation === '$mode', 'Parsed SWITCH $mode');
  assert(nodes[2].type === 'case' && nodes[2].args === '"weekly"', 'Parsed CASE "weekly"');
  assert(nodes[4].type === 'case' && nodes[4].args === '"completeTx"', 'Parsed CASE "completeTx"');
  assert(nodes[6].type === 'default', 'Parsed DEFAULT');
  assert(nodes[8].type === 'endswitch', 'Parsed ENDSWITCH');

  const validation = TskEnvParser.validateTask(nodes);
  assert(validation.isValid, 'Validation passed for SWITCH/CASE/DEFAULT/ENDSWITCH');
}
console.log('');

// -----------------------------------------------------------------------------
// TEST 5: Acceptance Test 11.4 - LIB REC and External Commands
// -----------------------------------------------------------------------------
console.log('📦 Test Suite 5: Acceptance Test 11.4 - LIB REC and External Commands');
{
  const test11_4 = [
    ';= LIB and external test',
    '$patient = "P001"',
    'MOSAIQ\\OpenPatient $patient -> $ok',
    'backup.bat $patient -> $backup_status',
    'run.ps1 -Patient $patient -Status $backup_status -> $ps_status',
    'RETURN $ps_status'
  ].join('\r\n');

  const nodes = TskEnvParser.parseTsk(test11_4);
  assert(nodes[2].type === 'lib_rec' && nodes[2].moduleName === 'MOSAIQ' && nodes[2].recName === 'OpenPatient', 'Parsed LIB REC MOSAIQ\\OpenPatient');
  assert(nodes[3].type === 'bat' && nodes[3].outVar === '$backup_status', 'Parsed external BAT with -> $backup_status');
  assert(nodes[4].type === 'ps1' && nodes[4].outVar === '$ps_status', 'Parsed external PS1 with args & -> $ps_status');
  assert(nodes[5].type === 'return' && nodes[5].args === '$ps_status', 'Parsed RETURN $ps_status');

  const validation = TskEnvParser.validateTask(nodes);
  assert(validation.isValid, 'Validation passed for LIB REC & external scripts');
}
console.log('');

// -----------------------------------------------------------------------------
// TEST 6: Acceptance Test 11.5 - ENV Variable Claims & LIB Sync
// -----------------------------------------------------------------------------
console.log('📦 Test Suite 6: Acceptance Test 11.5 - ENV Variable Claims & LIB Sync');
{
  const combinedTsk = [
    ';= Full flow test',
    '$patient = "Test Patient"',
    'OpenPatient $patient -> $open_ok',
    'MOSAIQ\\OpenPatient $patient -> $ok',
    '$N = 5',
    'LOOP $N',
    '    CheckStatus -> $status',
    'ENDLOOP',
    'SWITCH $mode',
    'CASE "weekly"',
    '    WeeklyNote',
    'DEFAULT',
    '    GeneralNote',
    'ENDSWITCH',
    'backup.bat $patient -> $backup_status',
    'run.ps1 -Patient $patient -Status $backup_status -> $ps_status'
  ].join('\r\n');

  const nodes = TskEnvParser.parseTsk(combinedTsk);
  const baseEnv = {
    action: { name: 'full_flow', version: '1.80' },
    paths: { micracts: 'micracts', index: 'index', export: 'export' },
    globalVars: {},
    varsByRecord: {}
  };

  // Test LIB Sync
  const libEnv = {
    varsByRecord: {
      'OpenPatient': { '$run': '1', '$next': '0', '$timeout': '15' }
    }
  };
  TskEnvParser.syncLibVars(baseEnv, libEnv, 'MOSAIQ', 'OpenPatient');
  assert(baseEnv.varsByRecord['MOSAIQ\\OpenPatient'] && baseEnv.varsByRecord['MOSAIQ\\OpenPatient']['$timeout'] === '15', 'LIB variables synced to [Vars.MOSAIQ\\OpenPatient]');

  const envText = TskEnvParser.exportEnv(baseEnv, nodes);
  assert(envText.includes('[Global.Vars]'), 'ENV contains [Global.Vars]');
  assert(envText.includes('$patient='), 'Claimed $patient');
  assert(envText.includes('$open_ok='), 'Claimed $open_ok');
  assert(envText.includes('$ok='), 'Claimed $ok');
  assert(envText.includes('$N='), 'Claimed $N');
  assert(envText.includes('$status='), 'Claimed $status');
  assert(envText.includes('$mode='), 'Claimed $mode');
  assert(envText.includes('$backup_status='), 'Claimed $backup_status');
  assert(envText.includes('$ps_status='), 'Claimed $ps_status');
  assert(envText.includes('[Vars.OpenPatient]'), 'Contains local [Vars.OpenPatient]');
  assert(envText.includes('[Vars.MOSAIQ\\OpenPatient]'), 'Contains synced [Vars.MOSAIQ\\OpenPatient]');
}
console.log('');

// -----------------------------------------------------------------------------
// TEST 7: Strict Validation - Rejection of Unknown & Malformed Commands
// -----------------------------------------------------------------------------
console.log('📦 Test Suite 7: Strict Rejection of Unknown & Malformed Commands');
{
  // Test A: Prohibited keywords (SET, RUN, WHILE) and unsupported extensions
  const invalidTsk1 = 'SET $A = 10\r\nRUN script.exe\r\ndoc.xyz';
  const nodes1 = TskEnvParser.parseTsk(invalidTsk1);
  const v1 = TskEnvParser.validateTask(nodes1);
  assert(!v1.isValid && v1.errors.length === 3, 'Rejected SET, RUN, and unsupported file extension');

  // Test B: Unpaired ENDIF
  const invalidTsk2 = 'ENDIF';
  const nodes2 = TskEnvParser.parseTsk(invalidTsk2);
  const v2 = TskEnvParser.validateTask(nodes2);
  assert(!v2.isValid, 'Rejected unpaired ENDIF');

  // Test C: BREAK outside LOOP
  const invalidTsk3 = 'BREAK';
  const nodes3 = TskEnvParser.parseTsk(invalidTsk3);
  const v3 = TskEnvParser.validateTask(nodes3);
  assert(!v3.isValid, 'Rejected BREAK outside LOOP');

  // Test D: Missing output after ->
  const invalidTsk4 = 'CheckStatus ->';
  const nodes4 = TskEnvParser.parseTsk(invalidTsk4);
  const v4 = TskEnvParser.validateTask(nodes4);
  assert(!v4.isValid, 'Rejected missing output variable after "->"');

  // Test E: Unclosed IF block
  const invalidTsk5 = 'IF $A = 1\r\n    ChartCheck';
  const nodes5 = TskEnvParser.parseTsk(invalidTsk5);
  const v5 = TskEnvParser.validateTask(nodes5);
  assert(!v5.isValid, 'Rejected unclosed IF block at EOF');
}
console.log('');

// -----------------------------------------------------------------------------
// TEST 8: Logical Array and Table Variables
// -----------------------------------------------------------------------------
console.log('📦 Test Suite 8: Logical Array and Table Variables');
{
  const arrTsk = [
    '$grid[0][1] = 25',
    '$pos[0] = 500',
    'ProcessTable $patients_table -> $result'
  ].join('\r\n');

  const nodes = TskEnvParser.parseTsk(arrTsk);
  assert(nodes[0].type === 'math' && nodes[0].outVar === '$grid[0][1]', 'Parsed 2D array assignment $grid[0][1]');
  assert(nodes[1].type === 'math' && nodes[1].outVar === '$pos[0]', 'Parsed 1D array assignment $pos[0]');
  assert(nodes[2].inVars.includes('$patients_table') && nodes[2].outVar === '$result', 'Parsed table variable $patients_table');

  const exported = TskEnvParser.exportTsk(nodes, ';= Arrays');
  assert(!exported.includes('$buffer'), 'Does not expose internal $buffer# names');
  assert(exported.includes('$grid[0][1] = 25'), 'Exported logical array name accurately');
}
console.log('');

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('================================================================');
console.log(`📊 Test Results: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL ACCEPTANCE & REGRESSION TESTS PASSED 100%!');
}
