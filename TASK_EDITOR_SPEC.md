# HandyRecorder Visual Task Editor - Architecture & Runtime Specification

**Target Audience**: Codex (AutoIt Runtime Lead) & Antigravity (Visual Flow Lead)  
**Workspace**: `Z:\phyzjqk\scripts\handyrecorder`  
**Subsystem**: Visual Task & Flow Orchestration Engine (`task_editor/`)  
**Date**: 2026-08-29  
**Status**: Feature Complete & Production Ready (Web Editor) / Ready for Runtime Synchronization (AutoIt Engine)

---

## 1. Executive Summary & Purpose

The **Visual Task Editor** is a LabVIEW-inspired, 100% offline, pure HTML5/Canvas 2D vector orchestration environment built to design, edit, wire, and parameterize HandyRecorder `.tsk` task workflows, `.blk` Sub-Task containers, `.rec` macro actions, and `.env` variable environments.

It bridges the gap between low-level recorded mouse/keyboard macros (`.rec`) and high-level medical/enterprise automation pipelines (`.tsk` / AIFlow), providing:
1. **Interactive Node-Graph Canvas**: Visual block diagram representing sequential and branching execution flow.
2. **Pure Sentence Statements**: Single-line mathematical equations, variable assignments, condition checks, and external script triggers written directly to `.tsk` without generating redundant `.rec` files.
3. **Deep Variable Binding & Sync**: Bidirectional synchronization between visual node parameters and `<task>.env` configuration files.
4. **Macro & Sub-Task Inspection**: Split-pane ASCII command editor and nested SubVI mini-canvas.

---

## 2. File & Component Architecture

All visual editor assets reside strictly inside `task_editor/` to preserve AutoIt source boundary isolation.

```
task_editor/
├── index.html               # Main UI layout, acrylic sidebars, modals & context menu DOM
├── css/
│   └── style.css            # Dark LabVIEW/VSCode theme, scrollbars, acrylic glass, layout
└── js/
    ├── canvas_engine.js     # 2D Vector Canvas Engine (Piping, Staircase Layout, Wiring, Pulses)
    ├── tsk_env_parser.js    # AST Parser & Serializer for .tsk, .env, .blk, and Sentence Statements
    ├── rec_commands_db.js   # Pre-indexed offline database of all 76+ workspace .rec macro files
    └── app.js               # Application Orchestrator, Modal Controllers, Event Bus & State Sync
```

### Module Responsibilities:

| Module | Core Responsibility | Key Methods / Capabilities |
| :--- | :--- | :--- |
| `canvas_engine.js` | Vector Rendering, Wire Routing & Canvas Interactions | `autoLayout()`, `getWirePathPoints()`, `drawNode()`, `drawSteppedWire()`, `rebuildSequentialFlow()`, `computeNodeHeight()`, dual-axis scrollbars |
| `tsk_env_parser.js` | Bidirectional Grammar Parsing & Serialization | `parseTsk()`, `exportTsk()`, `parseEnv()`, `exportEnv()`, `parseCommandLine()`, `parseEquationVariables()`, `parseBlk()` |
| `rec_commands_db.js` | Built-in Offline Fallback Database | Caches exact raw ASCII commands and variables for all existing workspace `.rec` macros (`SelRx`, `ChkDosimetry`, `AttachTxForm`, etc.) |
| `app.js` | UI Wiring, Context Menu & Auto-Reconnection | `createAndInsertNode()`, `deleteNodeFromGraph()`, `openInsertCmdModal()`, `openRecEditor()`, `openBlkMiniCanvas()` |

---

## 3. Visual Canvas Design & Interaction Decisions

### A. Multi-Column Staircase Cascading Layout (`vertical_2col`, `vertical_3col`, `vertical_4col`)
* **Vertical Cascade**: Column $C+1$ starts lower than Column $C$ by $3/4$ block height ($\approx 68\text{px}$).
* **Intra-Column Stagger**: Cards within each column step down and right with $\Delta X = 45\text{px}$ and dynamic $\Delta Y = \text{height} + 38\text{px}$.
* **Intra-Column Routing**: Stepped S-curve dogleg leaving bottom center pin $\rightarrow$ drops $\Delta Y / 2$ $\rightarrow$ steps horizontally $\rightarrow$ enters top center pin of following card.
* **Inter-Column Routing**: U-Turn Rise wire leaving bottom center of Column $C$ $\rightarrow$ drops into bottom gutter $\rightarrow$ runs right into the channel between columns $\rightarrow$ rises all the way up into the top gutter $\rightarrow$ enters top center pin of Column $C+1$.

```
[ Col 1: Item 1 ]
       │
       └──▶ [ Col 1: Item 2 ]
                   │
                   └──▶ [ Col 1: Item 3 ]
                               │
       ┌───────────────────────┘ (U-Turn Rise Wire)
       │
       ▼
  [ Col 2: Item 4 ] (Cascaded down by 3/4 height)
         │
         └──▶ [ Col 2: Item 5 ]
```

### B. Single-Line Command Blocks (Slim Height & Distinct Category Colors)
Single-line command blocks (`math`, `var`, `bat`, `ps1`, `exe`, `pause`, `loop`) use a compact **56px height** (or **68px** for `IF`/`SWITCH`), while `.rec` macro blocks with variables dynamically expand to accommodate their parameter table.

#### High-Contrast Category Color System:
* 🧮 **`f(x) COMMAND`** (`math`, `var`): **Amber Gold (`#d97706`)** — Title displays `f(x)` + `#N`; Body displays `$A = $B + 2`.
* 📼 **`REC MACRO`** (`.rec` files): **Ocean Blue (`#0284c7`)** — Title displays actual file name (e.g. `SelRx`) + `#N`; Body displays variables (`$run=1`, `$next=0`).
* 📁 **`BLK SUB-TASK`** (`.blk` files): **Royal Purple (`#7c3aed`)** — Title displays subflow name (e.g. `recordall.blk`) + `#N`; Body displays `📁 4 Sub-Steps`.
* 🔀 **`IF CONDITION`** (`IF`, `SWITCH`, `branch`): **Crimson Rose (`#e11d48`)** — Title displays `IF` + `#N`; Body displays `IF ($A > 10)` with green `[T]` and red `[F]` logic pins.
* 🔁 **`LOOP BLOCK`** (`LOOP`): **Electric Indigo (`#6366f1`)** — Title displays `LOOP` + `#N`; Body displays `LOOP (5)`.
* ⚙️ **`SCRIPT COMMAND`** (`.bat`, `.ps1`, `.exe`): **Flame Orange (`#ea580c`)** — Title displays script name (e.g. `backup.bat`) + `#N`.
* ⏸️ **`PAUSE GATE`** (`PAUSE`): **Bronze Gold (`#b45309`)** — Title displays `PAUSE` + `#N`; Body displays `PAUSE 1.5s`.
* 🔇 **`DISABLED (;=)`**: **Slate Gray (`#475569`)** — Displays commented-out disabled steps.

### C. Right-Click Context Menu & Automated Flow Re-Wiring
Right-clicking any card opens a context menu:
* **⚡ Insert Command Line...**: Opens a single-line input box (live syntax detection for equations, scripts, loops, pause).
* **📼 Insert .rec Macro...**: Quick insertion of macro step.
* **📁 Insert .blk Sub-Task...**: Quick insertion of SubVI container.
* **🔀 Insert IF Condition**: Quick insertion of branch condition.
* **🔁 Insert LOOP Block**: Quick insertion of iteration loop.
* **🎚️ Insert SWITCH Block**: Quick insertion of multi-way switch.
* **✏️ Edit Code / Command**: Opens macro/equation editor.
* **🔇 Disable / Enable (`;=`)**: Toggles step execution.
* **📑 Duplicate Block**: Duplicates step.
* **🗑️ Delete Block** (or `Delete` / `Backspace` key).

#### Auto-Insertion & Auto-Deletion Contract:
* **Insert After**: Inserting a new node $B$ after node $A$ automatically slices into the array $[A, B, C]$, cuts wire $A \rightarrow C$, creates wires $A \rightarrow B$ and $B \rightarrow C$, re-indexes all sequence numbers, and triggers `autoLayout()`.
* **Delete Auto-Reconnect**: Deleting node $B$ from $[A, B, C]$ automatically connects $A \rightarrow C$, decrements sequence numbers for all following blocks, and pulls following blocks up in the layout.

---

## 4. File Formats & Grammar Specification

### A. Task Sequence Grammar (`<task>.tsk`)
A `.tsk` file is a UTF-8/ASCII line-based execution script.

```text
;= Header Comment / Description
;= chartcheck micract flow
SelRx
$retry_count = 0
ChkDosimetry
$A = $B + 2
ChartChk
IF ($A > 10)
AttachTxForm
recordall.blk
backup.bat
PAUSE 2
```

#### Line Types Recognized by Parser:
1. **Comment / Disabled Step**: Lines starting with `;= ` (e.g. `;= SelRx`). Ignored during normal execution or flagged as inactive.
2. **Recorded Macro (`.rec`)**: Plain macro name with or without `.rec` extension (e.g. `SelRx`, `ChkDosimetry.rec`).
3. **Sub-Task Container (`.blk`)**: Ends with `.blk` (e.g. `recordall.blk`). Expands into sub-steps.
4. **Sentence Statements (Math / Assignments)**: Contains `=` and no file extension (e.g. `$A = $B + 2`, `$flag = 1`, `$grid = [[0,0],[10,10]]`).
5. **Conditional Branch**: Starts with `IF ` or `IF(` or `->N` (e.g. `IF ($retry_count > 3)`, `->2 SelRx`).
6. **Loop Container**: Starts with `LOOP ` or `LOOP(` or `WHILE ` (e.g. `LOOP (5)`).
7. **External Script**: Ends with `.bat`, `.cmd`, `.ps1`, or `.exe` (e.g. `backup.bat`, `run.ps1`).
8. **Pause Gate**: Starts with `PAUSE `, `P_`, or `Sleep` (e.g. `PAUSE 1.5`, `P_Delay_2000`).

---

### B. Environment & Variable Grammar (`<task>.env`)
The `.env` file follows an extended INI format storing action metadata, runtime paths, global variables, and per-record local variable overrides.

```ini
[Action]
Name=chartcheck
Version=1.80

[Paths]
RecPath=micracts
BlkPath=blk
IndexPath=index
ExportPath=export

[Global.Vars]
$retry_count=0
$A=10
$B=8
$mode=default

[Vars.SelRx]
$run=1
$next=0

[Vars.ChkDosimetry]
$run=1
$next=0
```

---

### C. Sub-Task Container Grammar (`<subflow>.blk`)
A `.blk` file defines an ordered sequence of macro steps executed as a composite SubVI:

```text
;= Sub-Task: recordall.blk
rec_20260604_204625
record1
record1_cp2
rec_20260604_202621
```

---

## 5. Variable System Coordination (For Codex Runtime Audit)

To achieve 100% execution compatibility between the Visual Task Editor and HandyRecorder's AutoIt engine (`runner.au3`, `filehandler.au3`), the following variable resolution hierarchy is established:

```
┌────────────────────────────────────────────────────────┐
│                   Scope Hierarchy                      │
│                                                        │
│  1. Dynamic Pipeline State ($A = $B + 2 evaluations)   │
│                          ▲                             │
│  2. Local Record Overrides ([Vars.<recName>])          │
│                          ▲                             │
│  3. Global Task Variables ([Global.Vars])              │
│                          ▲                             │
│  4. Built-in Macro Defaults ($run=1, $next=0)          │
└────────────────────────────────────────────────────────┘
```

### Proposed Variable Execution Mechanics for `runner.au3`:
1. **Variable Resolution in Macro Commands**:
   * Mouse coordinates: `M_P1, $target_x, $target_y, L, 1,, rem_click`
   * String text: `S_S1, "$patient_id", 1,, rem_input`
   * Repeat count / Delay: `M_P1, 500, 300, L, $repeat_count, $delay_ms, rem_step`
   * Offset delta: `MSP_2, $dx, $dy, L, 1,, rem_offset`
2. **Evaluation of Sentence Statements in `runner.au3`**:
   * When `runner.au3` encounters a line with `$Var = <expr>`:
     * Evaluate arithmetic expressions (`+`, `-`, `*`, `/`, `Mod`).
     * Store result into runtime variable map `g_TaskVariables["$Var"] = $Result`.
     * Update status bar with evaluated assignment.

---

## 6. Loop & Flow Control System Coordination (For Codex Runtime Audit)

### A. `LOOP (N)` / `LOOP ($count)` Mechanics:
* **Syntax**: `LOOP (5)` or `LOOP ($max_retries)`
* **Scope**: Loops the enclosed block between `LOOP (N)` and `ENDLOOP` (or repeats the entire task if `LOOP` is a top-level gate).
* **Runtime Behavior in `runner.au3`**:
  * Initializes iteration counter `$HR_LoopIndex = 1`.
  * Executes enclosed steps until `$HR_LoopIndex >= N`.

### B. `IF (<condition>)` Mechanics:
* **Syntax**: `IF ($retry_count < 3)`
* **Runtime Behavior in `runner.au3`**:
  * Evaluates condition against `g_TaskVariables`.
  * If True: Proceeds to immediate next step (or True-Branch pin).
  * If False: Skips to matching `ELSE`, `ENDIF`, or next top-level sequence block.

### C. `SWITCH ($variable)` Mechanics:
* **Syntax**: `SWITCH ($state)`
* **Runtime Behavior in `runner.au3`**:
  * Compares variable value against branch labels `->1`, `->2`, `->3`.

---

## 7. Actionable Checklist for Codex (AutoIt Agent)

Please review and align the AutoIt runtime with the following checklist:

- [ ] **TSK Line Dispatcher (`runner.au3` / `filehandler.au3`)**:
  - Ensure `TaskBuildRunList()` handles sentence statements (`$A = $B + 2`), `IF (...)`, `LOOP (...)`, `PAUSE <sec>`, and `.bat`/`.ps1` execution without crashing or reporting "missing record".
- [ ] **Variable Storage (`filehandler.au3`)**:
  - Verify `VarLoadEnv()` populates both `[Global.Vars]` and `[Vars.<recName>]` into memory.
  - Implement runtime evaluation of `$VarOut = $VarIn + <val>` in `ExecuteCompiledCommand` or `TaskExecuteLine`.
- [ ] **Loop Execution (`runner.au3`)**:
  - Implement `LOOP (N)` block iteration counter in playback engine.
- [ ] **Editor Launcher (`main.au3`)**:
  - Add hotkey or button in HandyRecorder UI to invoke `task_editor/index.html` via `ShellExecute(@ScriptDir & "\task_editor\index.html")`.

---

## 8. Summary of Completed Visual Editor Capabilities

1. **Staircase Cascading Multi-Column Layout (1–4 Cols)** with exact U-turn rise inter-column wiring.
2. **Dual-Axis Dynamic Scrollbars** (Right Vertical + Bottom Horizontal) for infinite canvas exploration.
3. **Slim Single-Line Command Blocks (56px)** with high-contrast distinct color coding.
4. **File Name vs Type Tag Header Distinction**: Real file name shown on title bars for `.rec`/`.blk`/`.bat`; `f(x)`/`IF`/`LOOP` shown for statements.
5. **Right-Click Context Menu with One-Line Inserter**: Direct live parsing of equations, scripts, and flow control.
6. **Automatic Chain Reconnection & Sequence Re-Indexing**: Deleting or inserting blocks automatically heals the execution pipeline and re-indexes `#1`, `#2`, `#3`...
7. **100% Offline & Self-Contained**: Pure Vanilla JavaScript with zero npm/internet dependencies.
