const fs = require('fs');

global.window = {
  innerWidth: 1200,
  innerHeight: 800,
  devicePixelRatio: 1,
  addEventListener: () => {}
};
global.requestAnimationFrame = () => {};

const code = fs.readFileSync('js/canvas_engine.js', 'utf8');
eval(code);

const mockCtx = {
  setTransform: () => {},
  clearRect: () => {},
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  scale: () => {},
  beginPath: () => {},
  closePath: () => {},
  fill: () => {},
  stroke: () => {},
  fillRect: () => {},
  moveTo: () => {},
  lineTo: () => {},
  arcTo: () => {},
  arc: () => {},
  fillText: () => {},
  measureText: (txt) => ({ width: (txt || '').length * 6 }),
  quadraticCurveTo: () => {},
  setLineDash: () => {}
};

const mockCanvas = {
  parentElement: { clientWidth: 1200, clientHeight: 700 },
  getContext: () => mockCtx,
  addEventListener: () => {},
  style: {},
  width: 1200,
  height: 700
};

const engine = new window.GraphCanvasEngine(mockCanvas);
engine.setNodes([
  { id: '1', label: 'chartcheck', type: 'comment', sequence: 0 },
  { id: '2', label: 'OpenPatient', type: 'rec', sequence: 1, variables: { '$run': '1', '$next': '0' } },
  { id: '3', label: 'MOSAIQ\\OpenPatient', type: 'lib_rec', moduleName: 'MOSAIQ', recName: 'OpenPatient', sequence: 2 },
  { id: '4', label: '$A = $B + 1', type: 'math', equation: '$A = $B + 1', sequence: 3 },
  { id: '5', label: 'IF $A = 1', type: 'if', equation: '$A = 1', sequence: 4 },
  { id: '6', label: 'LOOP 5', type: 'loop', equation: '5', sequence: 5 },
  { id: '7', label: 'BREAK', type: 'break', sequence: 6 },
  { id: '8', label: 'SWITCH $mode', type: 'switch', equation: '$mode', sequence: 7 },
  { id: '9', label: 'CASE "weekly"', type: 'case', args: '"weekly"', sequence: 8 },
  { id: '10', label: 'RETURN $result', type: 'return', args: '$result', sequence: 9 },
  { id: '11', label: 'backup.bat', type: 'bat', sequence: 10 },
  { id: '12', label: 'PAUSE 1', type: 'pause', args: '1', sequence: 11 },
  { id: '13', label: 'ImageSearch', type: 'image_search', sequence: 12 },
  { id: '14', label: 'OCR', type: 'ocr', sequence: 13 },
  { id: '15', label: 'Unknown Error', type: 'unknown_error', errorReason: 'Fatal Syntax Error', sequence: 14 }
]);

try {
  engine.render();
  console.log('✅ Canvas Engine rendered all 15 node types and error states without errors!');
} catch (err) {
  console.error('❌ Canvas Engine render failed:', err);
  process.exit(1);
}
