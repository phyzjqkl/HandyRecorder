# HandyRecorder Visual Task Editor - Integration & Handoff Specification

**Version**: 2.0 (Production Release)  
**Primary Specification File**: [`../TASK_EDITOR_SPEC.md`](../TASK_EDITOR_SPEC.md)  
**Target Consumer**: Codex (AutoIt Runtime Lead) & Antigravity (Visual Flow Lead)  
**Scope**: All Visual Task Editor UI, Canvas & Parser enhancements are self-contained in `task_editor/`.

---

## 1. Quick Architecture Overview

* **Engine**: Pure Canvas 2D Vector Engine (`js/canvas_engine.js`) with dynamic staircase cascading layout (`vertical_2col`, `3col`, `4col`), dual-axis scrollbars, hollow execution stream wires with directional energy pulses, and click-to-cut scissor badges.
* **Grammar & AST**: Pure JS AST Parser & Serializer (`js/tsk_env_parser.js`) handling bidirectional synchronization between `.tsk`, `.env`, `.rec`, `.blk`, and pure sentence statements (`$A = $B + 2`, `IF`, `LOOP`, `SWITCH`).
* **Offline Database**: Pre-indexed repository macro database (`js/rec_commands_db.js`) caching all 76+ workspace macro actions.
* **Orchestrator**: Application controller (`js/app.js`) with right-click context menu, one-line command inserter, auto-wiring, and auto-reindexing.

---

## 2. Sentence-Based Operations (Non-Rec Statements)

Operations added from the left tool palette or the right-click context menu are **pure sentence statements** written directly into `<task>.tsk` (no dummy `.rec` files are created on disk).

### Examples in `<task>.tsk`:
```text
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

### Grammar Specification:
1. **Assignments & Equations**: `$VarOut = $VarIn [+, -, *, /] <value>`
2. **Conditions**: `IF (<expression>)`
3. **Loops**: `LOOP (<count>)`
4. **Environment Sync**: Auto-claims uninitialized variables in `<task>.env` under `[Global.Vars]` and `[Vars.<recName>]`.

---

## 3. AutoIt Runtime Coordination Points (For Codex)

Refer to [**`TASK_EDITOR_SPEC.md`**](../TASK_EDITOR_SPEC.md) for full details on:
1. **Scope Hierarchy**: Pipeline evaluations $\rightarrow$ `[Vars.<recName>]` $\rightarrow$ `[Global.Vars]`.
2. **Sentence Statement Dispatch in `runner.au3`**: Evaluating arithmetic and variable bindings during task execution.
3. **Loop & Branching Execution**: `LOOP (N)` and `IF (<cond>)` execution semantics.
4. **Launch Hook in `main.au3`**: `ShellExecute(@ScriptDir & "\task_editor\index.html")`.
