# HandyRecorder Component Spec

Version: 1.80
Status: Active HandyRecorder branch before Variable System, Image Search, and OCR integration

HandyRecorder is the desktop-action recorder/runner component that will be embedded into AIFlow. It is responsible for capturing, editing, reviewing, and replaying concrete mouse/keyboard workflows at the task level.

## Component Role

HandyRecorder currently owns the low-level desktop automation layer:

- record mouse, keyboard, pause, delay, drag, move, and offset commands into `.rec`
- edit commands directly in the compact main UI
- replay one command, one rec, or task-driven rec sequences
- patch a running workflow during playback pause
- create screenshot references for recorded anchors and mouse actions
- manage task folders containing `micracts`, `blk`, `index`, `export`, `.tsk`, and `.env`

AIFlow should treat HandyRecorder as the concrete action component, not the upper flow-control engine.

## Current Folder Model

HandyRecorder now works in a flow-plus-task structure.

```text
<HR.exe folder>\
  HR.exe
  <flow>.tasks
  HandyRecorder.ini

<task folder>\
  <task>.tsk
  <task>.env
  micracts\
    *.rec
  blk\
    *.blk
  index\
  export\
```

Rules:

- `<flow>.tasks` registers known task folders for one HR deployment.
- `<task>.tsk` is the task-level action table.
- `<task>.env` is the task-local environment/variable file.
- `micracts\` stores local rec macros.
- `blk\` stores extracted task blocks.
- `index\` stores passive screenshot/comment images.
- `export\` stores active user-facing crops/exports.

## Main UI State

Current main UI behavior is the working v1.80 state:

- `Tasks` button opens task tools
- task combo switches active task while idle
- `Recs` button creates a new rec and starts recording
- Micro Act combo shows local rec entries from the active task
- `Auto` beside Micro Act means run task recs sequentially
- `L / S / D / F` are the main file-level utility buttons in the right block
- `Start / > / Rec` keep the playback/recording controls
- `Review` opens the screenshot/comment companion window
- `RePin` controls offset reanchor behavior
- `SkipRes` bypasses resolution mismatch protection for the current session

The old reconstruction brief in `Agents.md` no longer describes the full live UI behavior.

## TSK Editor State

The TSK editor is now a real task-side tool surface.

It currently supports:

- viewing and editing `.tsk` lines
- moving selected task lines up/down with `<` and `>`
- deleting selected line(s) with `X`
- saving line edits with `S`
- creating blocks with `B`
- creating fork branches from the selected rec line with `F`
- browsing local or external `rec` folders
- browsing local or external `blk` folders
- inserting selected rec/blk entries into the task table with `<-`
- viewing variables from `<task>.env`
- refreshing rec/blk/variable side panes together

Important current editor decisions:

- `B` means block, not fork
- `F` means fork in the TSK editor
- block-name input appears beside the TSK editor, not as a distant modal
- selecting a rec/blk entry should not overwrite the TSK line edit box
- inserting a rec/blk entry should immediately show in the TSK list and become selected

## Task File Semantics

The `.tsk` file is a task-level action table, not a full programming language.

Current supported line types:

- local rec line: `login`
- local block line: `cleanup.blk`
- branch line: `->1 verifyF8`
- comment/disabled line: `;= comment`
- external rec path: full path ending in `.rec`
- external block path: full path ending in `.blk`

Current runner behavior:

- local rec entries resolve to `micracts\name.rec`
- local block entries resolve to `blk\name.blk`
- external `.rec` and `.blk` paths are supported in the task runner
- branch execution currently follows the `->1` path by default
- missing rec references are marked for audit rather than silently trusted

## Recording / Replay State

Working command families in the current branch include:

- `M_` mouse click
- `MM_` mouse move/hover
- `MW_` mouse wheel
- `MD_` drag
- `M_D` / `M_U` manual hold down/up
- `K_` keyboard
- `S_` string
- `P_` pause
- `T_` delay
- `MSP_` offset click
- `MSM_` offset anchor/move markers

Current live design notes:

- playback patch recording is supported from playback pause
- focus/manual pause handling exists for VM/Citrix-style workflows
- review/autocomment is a key part of recorder usability
- offset logic is mid-evolution and should be treated carefully before AIFlow depends on it heavily

## Variable System Boundary

The next planned milestone is the Variable System.

What already exists:

- `<task>.env` exists and is loaded in the TSK editor side pane
- the editor can display current variable key/value lines

What is not finished yet:

- command-level variable substitution
- task/rec scoped variable registration from UI
- expression operations such as `=`, `+`, `-`, `*`, `/`
- using variables to control command enable/disable or fork decisions
- inserting `${VAR}` from the variable pane into commands or task lines

This means HandyRecorder v1.80 is ready for variable-system work, but not yet ready for AIFlow to depend on task variables as runtime inputs.

## AIFlow Integration Boundary

AIFlow should assume the following split of responsibility:

HandyRecorder owns:

- recording and replaying concrete desktop actions
- rec/task/block editing at task scope
- screenshot/comment review for anchors and passive references
- local task environment display and, next, variable substitution

AIFlow should own:

- multi-task orchestration
- conditions and branching across tasks
- higher-level flow semantics
- external tool invocation policy
- future OCR / image-search orchestration strategy

## Build / Runtime Note

There is one practical build caveat in the current workspace:

- the running EXE must be fully closed before rebuilding to the same output name
- when building to a NAS-backed path, stale EXE locking can leave the source updated but the visible binary unchanged

The reliable process is:

1. stop every running HandyRecorder preview EXE
2. compile
3. launch the new EXE only after confirming the timestamp changed

## Current Priority Order

Before image search and OCR, the next recommended work order is:

1. complete the Variable System
2. stabilize task editor/task runner semantics around variables and forks
3. freeze a stable HandyRecorder handoff version for AIFlow
4. then reopen image search and OCR integration
