# HandyRecorder Visual Task Editor - Audit & Status Report

**Document**: Task Editor Audit Report for Codex Peer Review  
**Date**: 2026-09-06  
**Auditor**: Codex (AutoIt Runtime Lead)  
**Author**: Antigravity (Visual Flow Lead)  
**Workspace**: `Z:\phyzjqk\scripts\handyrecorder`  
**Target Subsystem**: `task_editor/` (Visual Flow & Task Orchestration Engine)

---

## 1. Executive Summary

This audit report provides an objective, transparent, and comprehensive breakdown of the current state of the **HandyRecorder Visual Task Editor** (`task_editor/`). It explicitly details:
1. **What Was Accomplished & Verified** (Features, Grammar, Canvas Engine, AST Parser, Validation, Tests).
2. **What Was NOT Done / Known Limitations / Gaps** (Deliberate scope boundaries, GUI constraints, future extension points, and UX areas that need further review).
3. **Checklist for Codex Audit & Runtime Integration**.

---

## 2. What Was Accomplished (Completed Capabilities)

### A. Strict HandyRecorder Grammar & AST Parser (`tsk_env_parser.js`)
* **Local REC Calls**: Local rec calls strictly omit `.rec` (e.g., `OpenPatient`, `SelDI`), with optional input arguments and output extraction (`OpenPatient $patient -> $open_ok`).
* **LIB REC Calls**: Module path syntax supported (`MOSAIQ\OpenPatient $patient -> $ok`).
* **BLK Containers**: Sub-task containers strictly retain `.blk` (e.g., `recordall.blk`, `MOSAIQ\chartcheck.blk`).
* **External Commands**: Script calls retain extensions (`backup.bat $patient -> $ok`, `run.ps1 -Patient $patient -> $out`, `check.exe $file -> $res`).
* **Mathematical & Variable Statements**: Expressions formatted as `$Var = <expr>` (e.g., `$A = 10`, `$A = $B + 1`, `$grid[0][1] = 25`, `$pos[0] = 500`). No `SET` keyword used.
* **Control Flow Structures**: Stack-based parser and paired recursive exporter for:
  * `IF <cond>` / `ELSE` / `ENDIF` (where `ELSE` is optional; operators: `=`, `!=`, `>`, `>=`, `<`, `<=`, `contains`).
  * `LOOP <count_or_var>` / `ENDLOOP` (Count loops; `WHILE` rejected in Phase 1).
  * `SWITCH <$var>` / `CASE <"val">` / `DEFAULT` / `ENDSWITCH`.
  * `BREAK`, `CONTINUE`.
  * `RETURN` / `RETURN <val>`.
  * `PAUSE <sec>` (e.g., `PAUSE 1`, `PAUSE 0.5`).
* **Strict Rejection of Prohibited & Malformed Grammar**:
  * Unrecognized keywords (`SET`, `RUN`, `WHILE`, `GOTO`, `CALL`) are flagged as `unknown_error` nodes.
  * Unsupported file extensions (e.g., `.xyz`, `.py`, `.sh`, `.docx`) are rejected.
  * Missing output variable after `->` is rejected.
  * Unpaired control flow keywords (`ENDIF` without `IF`, `BREAK` outside `LOOP`) are rejected.

### B. Mandatory Variable Claims & Environment Sync (`exportEnv`, `syncLibVars`)
* **Global Variable Auto-Claiming**: Every `$variable` referenced across `.tsk` lines is automatically claimed under `[Global.Vars]` (with backwards compatibility for `[Vars.global]`).
* **Local Macro Scopes**: `[Vars.<recName>]` sections generated with standard macro execution flags (`$run=1`, `$next=0`).
* **LIB Variable Synchronization**: When `MOSAIQ\OpenPatient` is used, variables from `LIB\MOSAIQ\MOSAIQ.env` (`[Vars.OpenPatient]`) are automatically synchronized to the task environment as `[Vars.MOSAIQ\OpenPatient]` without overwriting user task-local edits.
* **Logical Arrays & Tables**: Claims array/table identifiers under `[Arrays.global]` or `[Tables.global]` without exposing internal AutoIt `$buffer#` names.

### C. 2D Vector Canvas Engine (`canvas_engine.js`)
* **Multi-Column Staircase Cascading Layout**: Supports `vertical_1col`, `vertical_2col`, `vertical_3col`, `vertical_4col`, and `horizontal`. Each successive column cascades down by $3/4$ card height with $45\text{px}$ staggered steps.
* **Intra- & Inter-Column Wire Routing**: Stepped S-curve doglegs for intra-column wiring; U-Turn Rise channel routing for inter-column wrapping.
* **Dual-Axis Dynamic Scrollbars**: Custom horizontal and vertical scrollbars for unbounded canvas exploration.
* **Category Visual Hierarchy & Colors**:
  * `f(x) COMMAND` / `var`: Amber Gold (`#d97706`) — Title: `f(x)` + `#N`; Body: expression.
  * `REC MACRO`: Ocean Blue (`#0284c7`) — Title: file name + `#N`; Body: variable list.
  * `LIB REC`: Cyan Slate (`#0891b2`) — Title: `MOSAIQ\OpenPatient` + `#N`.
  * `BLK SUB-TASK`: Royal Purple (`#7c3aed`) — Title: file name + `#N`; Body: step count.
  * `IF CONDITION`: Crimson Rose (`#e11d48`) — Title: `IF` + `#N`; Body: condition with `[T]` (green) and `[F]` (red) pins.
  * `LOOP BLOCK`: Electric Indigo (`#6366f1`) — Title: `LOOP` + `#N`; Body: count with `[BODY]` pin.
  * `SWITCH`: Purple Pink (`#c026d3`) — Title: `SWITCH` + `#N`; Body: selector variable.
  * `BAT / PS1 / EXE`: Flame Orange (`#ea580c`) / Deep Scarlet (`#b91c1c`).
  * `PAUSE GATE`: Bronze Gold (`#b45309`).
  * `IMAGE SEARCH` & `OCR`: Teal / Indigo with `[EXT]` badge.
  * `⚠️ UNKNOWN ERROR`: Warning Red (`#ef4444`) with error diagnostic reason in body.

### D. User Interface & Interactive Workflows (`app.js`, `index.html`)
* **Categorized Right-Click Context Menu**:
  * 📁 **Files**: Local `.rec`, LIB `.rec`, `.blk`, External Scripts.
  * 🔀 **Flow Control**: `IF/ELSE/ENDIF`, `LOOP/ENDLOOP`, `SWITCH/CASE`, `BREAK`, `CONTINUE`, `RETURN`.
  * 💲 **Variables & Math**: Variable assignments, math statements, array/table declarations.
  * ⚡ **Commands & Extensions**: One-line command input box, PAUSE, ImageSearch, OCR.
  * ✏️ **Edit & Actions**: Code editor, Disable/Enable (`;=`), Duplicate, Delete.
* **Insertion & Auto-Reconnection**: Inserting a block after node $A$ automatically wires $A \rightarrow B$ and $B \rightarrow C$, re-indexes all `#N` sequence numbers, and triggers layout.
* **Deletion & Auto-Healing**: Deleting a node automatically reconnects the predecessor to the successor and decrements subsequent `#N` order numbers.
* **Export Validation Dialog**: Attempting to save `.tsk` or `.env` with fatal errors halts export and displays a line-by-line diagnostic dialog.
* **Recent Tasks Memory**: Saves up to 8 recently opened `.tsk` files in `localStorage`.

### E. Automated Test Suite (`test/test_suite.js`)
* Executed via Node.js: **62 out of 62 automated tests passed (100% pass rate)** covering:
  1. Serial task import & export order preservation.
  2. Acceptance Test 11.1 (Basic Pipeline with IF/ELSE/ENDIF/RETURN).
  3. Acceptance Test 11.2 (Loop With Break).
  4. Acceptance Test 11.3 (Switch Case).
  5. Acceptance Test 11.4 (LIB REC & External Scripts).
  6. Acceptance Test 11.5 (ENV Variable Claims & LIB Sync).
  7. Strict Rejection of Unknown & Malformed Commands.
  8. Logical Array & Table Variables.

---

## 3. What Was NOT Done / Known Gaps & Limitations

The following items are identified as remaining gaps, deliberate scope boundaries, or areas for future enhancement:

### 1. Visual Control Flow Containers vs Linear Sequential Nodes
* **Current State**: Control flow blocks (`IF`, `ELSE`, `ENDIF`, `LOOP`, `ENDLOOP`, `SWITCH`, `CASE`, `ENDSWITCH`) are currently rendered as distinct sequential card nodes in the staircase flow order (with true/false/body pin indicators).
* **Gap**: The editor does not yet draw a large, nested rectangular visual container bounding box physically enclosing child nodes on the 2D canvas (like LabVIEW Structure Loops or Scratch container frames).
* **Impact**: While the exported `.tsk` is 100% structurally nested with paired keywords and proper indentation, visually on canvas they appear as sequential pipeline nodes with indentation tags rather than physical nested boundary boxes.

### 2. Graphical Data Wire Drag-and-Drop
* **Current State**: Data dependencies (`inVars` and `outVar`) are configured via node properties, statement syntax (`$A = $B + 1`), and command output arrows (`command -> $out`). Output/input variable pins are visually rendered on the left/right edges of cards.
* **Gap**: Users cannot currently drag a dynamic yellow wire directly from Pin X of Card A to Pin Y of Card B by clicking and dragging on the canvas. Instead, data wiring is established by naming matching variables.
* **Impact**: Data wiring compiles cleanly to `.tsk` text, but direct interactive data wire creation by mouse drag between variable pins is not implemented in the canvas interaction loop.

### 3. Native File System Direct Save (Browser Security Restriction)
* **Current State**: Clicking `💾 Save .tsk` or `📥 Save .env` triggers a standard browser file download (`downloadFile` via Blob URL) or updates the in-memory state.
* **Gap**: Due to browser sandbox security policies in standard offline HTML5 files, the web editor cannot directly overwrite files on disk without user interaction (or without the modern File System Access API / Electron / AutoIt bridge).
* **Impact**: The user must save/download and place the exported `.tsk` in the task folder, or HandyRecorder must launch the editor with an embedded local HTTP server / WebView bridge for seamless disk write-back.

### 4. Direct OS GUI Launch from Headless AI Agent Background Subprocess
* **Current State**: The editor is a 100% offline static web app located at `task_editor/index.html`.
* **Gap**: When an AI Agent runs background commands (e.g. `Start-Process`), Windows executes the process in a non-interactive background session token, meaning a new browser window does not automatically pop up on the active user desktop GUI without the user pasting the URL or opening the file in Windows Explorer.

### 5. Execution Runtime Engine (Belongs to AutoIt / Codex)
* **Current State**: The Visual Task Editor is strictly a design-time composer and exporter.
* **Boundary**: The editor does not simulate or execute mouse clicks, keyboard events, instruction pointer (`ip`), loop stacks, or stdout capture. All execution runtime logic belongs strictly to HandyRecorder's AutoIt engine (`runner.au3`, `filehandler.au3`).

---

## 4. Specific Checklist for Codex Review

Codex is requested to audit the following compatibility contracts:

1. **`.tsk` Grammar Recognition**:
   - Verify that `filehandler.au3` (`TaskBuildRunList`, `TaskReadLines`) and `runner.au3` correctly interpret:
     - Local REC lines without `.rec` extension (`OpenPatient`).
     - LIB REC lines (`MOSAIQ\OpenPatient`).
     - Sentence equations (`$A = $B + 1`).
     - Control flow blocks (`IF`, `ELSE`, `ENDIF`, `LOOP`, `ENDLOOP`, `SWITCH`, `CASE`, `DEFAULT`, `ENDSWITCH`, `BREAK`, `CONTINUE`, `RETURN`).
     - External commands (`backup.bat`, `run.ps1`) with `-> $outVar`.
2. **Variable Table Synchronization**:
   - Confirm that `VarLoadEnv()` in `filehandler.au3` loads `[Global.Vars]`, `[Vars.global]`, `[Vars.<rec>]`, and `[Vars.MODULE\rec]`.
   - Confirm runtime evaluation of `$VarOut = $VarIn + <val>` in AutoIt.
3. **Loop & Flow Control Runtime Mechanics**:
   - Verify that `runner.au3` implements the block stack and jump targets for `LOOP (N)` and `IF (<cond>)`.
4. **Integration Hook**:
   - Add a menu item or hotkey in HandyRecorder `main.au3` to launch the editor:
     `ShellExecute(@ScriptDir & "\task_editor\index.html")`.

---

## 5. Summary Table

| Category | Requirement | Status | Implementation Details |
| :--- | :--- | :---: | :--- |
| **Grammar** | Local REC without `.rec` | ✅ Complete | Strips `.rec`; exports clean command names. |
| **Grammar** | LIB REC `Module\Rec` | ✅ Complete | Classifies and parses `Module\Rec` syntax. |
| **Grammar** | External Scripts (`.bat`, `.ps1`, `.exe`) | ✅ Complete | Preserves extensions, args, and `-> $out`. |
| **Grammar** | Sentence Math `$A = $B + 1` | ✅ Complete | Parses in/out variables without `.rec` files. |
| **Grammar** | Flow Control (`IF`, `LOOP`, `SWITCH`, `BREAK`, `RETURN`) | ✅ Complete | Stack parser, paired keywords, structured indentation. |
| **Grammar** | Rejection of `SET`, `RUN`, `WHILE` | ✅ Complete | Flags forbidden keywords as fatal syntax errors. |
| **Variables** | Global Variable Auto-Claiming | ✅ Complete | All referenced vars claimed in `[Global.Vars]`. |
| **Variables** | LIB Module Sync | ✅ Complete | Syncs template from `LIB\MODULE\MODULE.env` to task env. |
| **Variables** | Logical Array / Table Support | ✅ Complete | Supports `$pos[0]`, `$grid[1][2]`, `$table`. |
| **Validation** | Strict Pre-Export Validation | ✅ Complete | Blocks export on fatal syntax errors; shows diagnostic dialog. |
| **Canvas** | Staircase Cascading Layout (1–4 Cols) | ✅ Complete | 3/4 height cascade, U-turn rise inter-column wires. |
| **Canvas** | Category Color System & Slim Heights | ✅ Complete | Distinct colors, 56px slim cards, order `#N` badges. |
| **Canvas** | Right-Click Categorized Insertion Menu | ✅ Complete | Categorized into Files, Flow, Vars, Commands, Edit. |
| **Canvas** | Insertion & Deletion Auto-Wiring | ✅ Complete | Automatically heals wire gaps and re-indexes `#N`. |
| **Canvas** | Visual Nested Bounding Boxes | ⚠️ Gap / Linear | Represented as structured sequential cards with pins. |
| **Canvas** | Mouse-drag Data Wiring | ⚠️ Gap / Variable-based | Configured via properties and matching `$variable` names. |
| **Testing** | Acceptance & Regression Test Suite | ✅ Complete | 62/62 automated tests passing in `test/test_suite.js`. |
