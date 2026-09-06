# HandyRecorder Pipeline and Module Mind Map

Date: 2026-08-25

Purpose: discussion map after several months of real use. This is not a frozen spec. It is a working picture of what HandyRecorder does now, what hurts, and where Variable System, Image Search, and OCR should enter before AIFlow integration becomes stable.

## Pipeline Stream

```mermaid
flowchart LR
    A[Human workflow need] --> B[Task registry / active task]
    B --> C[Task folder]
    C --> C1[task.tsk]
    C --> C2[task.env]
    C --> C3[micracts/*.rec]
    C --> C4[blk/*.blk]
    C --> C5[index screenshots]
    C --> C6[export crops]

    C1 --> D[Task editor]
    C2 --> D
    C3 --> D
    C4 --> D

    D --> E[Record / edit micro actions]
    E --> E1[Mouse / drag / wheel]
    E --> E2[Keyboard / string]
    E --> E3[Pause / manual focus]
    E --> E4[Offset / anchor]
    E --> E5[Autocomment crop]

    E --> F[Save pipeline]
    F --> F1[Sync combo to array]
    F --> F2[Compress commands]
    F --> F3[Renumber command ids]
    F --> F4[Write rec / reload]

    C1 --> G[Run pipeline]
    C3 --> G
    C4 --> G
    C2 --> H[Variable compile]
    H --> G

    G --> G1[Run active command]
    G --> G2[Run selected rec]
    G --> G3[Run task sequence]
    G --> G4[Manual step / pause patch]

    G --> I[Desktop action execution]
    I --> J[Observe result]
    J --> K{Need adaptation?}
    K -->|stable| L[AIFlow component handoff]
    K -->|coordinates drift| E4
    K -->|text/state unknown| M[OCR module planned]
    K -->|visual target unknown| N[Image Search module planned]
    K -->|data changes| H
    K -->|workflow changed| D

    M --> O[Perception result]
    N --> O
    O --> H
    O --> G
```

## Runtime Loop

```mermaid
sequenceDiagram
    participant User
    participant UI as HandyRecorder UI
    participant Task as Task/Rec Files
    participant Var as Variable Compiler
    participant Run as Runner
    participant Desk as Desktop App
    participant See as OCR/Image Search Planned

    User->>UI: choose task / rec / command
    UI->>Task: load .tsk, .env, .rec, .blk
    User->>UI: record or edit action
    UI->>Task: save rec with comments/crops
    User->>UI: start / run active / manual step
    UI->>Var: compile variables when needed
    Var->>Run: compiled command text
    Run->>Desk: mouse, key, wheel, string, pause
    Desk-->>User: visible app state changes
    User->>UI: pause, patch, recrop, reanchor
    UI->>Task: update rec/index/export
    See-->>UI: future OCR/image-match state input
```

## Module Mind Map

```mermaid
mindmap
  root((HandyRecorder as AIFlow component))
    Config and Runtime
      INI bootstrap and repair
      hotkeys
      run modes
      task registry
      active task paths
    Task Workspace
      flow.tasks registry
      task.tsk action table
      task.env variables
      micracts rec files
      blk reusable blocks
      index passive screenshots
      export active crops
    Main UI
      compact recorder controls
      task selector
      task editor
      rec and command combos
      review window
      variable popup
      blink/status states
    Recorder
      mouse click
      mouse drag
      mouse down/up
      mouse move
      wheel merge
      keyboard grammar
      string capture
      pause capture
      manual focus pause
      offset markers
      tooltip color readout
      autocomment crop
    File Handler
      command array
      active index sync
      insert/delete/move
      save and reload
      compress commands
      renumber ids
      record duplication
      fork record creation
      task/block parsing
      run list expansion
    Runner
      run active command
      run selected record
      run task sequence
      manual flow step
      pause/continue
      patch while paused
      resolution guard
      offset reanchor
      SafeSleep stop response
    Review and Evidence
      show index image
      edit rem text
      adjust crop rectangle
      recrop from screen
      parse command anchor
      offset base lookup
    Variable System
      env load
      record defaults
      command field promotion
      compile fields
      enable/disable lines
      record flags
      arithmetic/composite expressions
      needs more QA
    Image Search Planned
      find visual target on screen
      match stored crop/template
      return coordinates/confidence
      feed runner anchor or click
      maybe owned by AIFlow orchestration
    OCR Planned
      read screen text
      verify state/result
      extract runtime variables
      drive branch/fork decisions
      maybe owned by AIFlow orchestration
    AIFlow Boundary
      HandyRecorder executes concrete actions
      AIFlow owns cross-task orchestration
      AIFlow owns higher-level decisions
      perception modules may straddle boundary
```

## Module / Function Ownership

| Area | Source files | Current responsibility | Notes |
|---|---|---|---|
| Config/runtime | `config.au3`, `main.au3` | INI defaults, hotkeys, task paths, run mode | Mostly working, docs need update |
| Task workspace | `config.au3`, `filehandler.au3`, `main.au3` | Registry, active task, `.tsk`, `.env`, rec/block folders | Current core model |
| Record editing | `filehandler.au3`, `main.au3` | Command array, combo sync, save, compress, renumber | Important stable base |
| Recording | `recorder.au3` | Mouse/key/wheel/string/pause/offset capture | Needs real-world bug notes added |
| Playback | `runner.au3` | Active command, rec, task, pause, patch, SafeSleep | Manual focus and pause paths need regression tests |
| Review/autocomment | `main.au3`, `recorder.au3` | Screenshot crop, rem labels, recrop, review UI | Key usability feature |
| Variables | `filehandler.au3`, `main.au3`, `runner.au3` | Env load, compile, field promotion, execution | Implemented first pass; not fully proven |
| Image Search | planned | Visual target search from screen or stored crops | Not yet active module |
| OCR | planned | Text/state extraction from screen | Not yet active module |
| AIFlow integration | future boundary | Higher-level orchestration and decision logic | Should wait for variable stabilization |

## What To Report From Real Use

Use this list to collect your months-of-use findings before we redesign anything:

1. Recording pain: missed clicks, wrong drag threshold, bad key grammar, wheel noise, accidental UI capture.
2. Playback pain: stop response, pauses, focus loss, VM/Citrix behavior, wrong next command, resolution mismatch.
3. Editing pain: combo sync surprises, insert position, save/reload behavior, task editor selection, rec/block insertion.
4. Review pain: crop too small/large, wrong anchor, rem naming, index clutter, recrop accuracy.
5. Offset pain: base drift, reanchor timing, confusing marker commands, review crop lookup.
6. Variable pain: hard-coded coordinates/text, repeated values, per-task/per-rec values, enable/disable needs.
7. OCR needs: what text must be read, where it appears, how reliable it must be, what decisions depend on it.
8. Image Search needs: what visual targets move, what screenshots/templates already exist, acceptable match confidence.
9. AIFlow needs: which decisions are task-level, which are cross-task, and where human confirmation is needed.

## Immediate Discussion Questions

- Which failures happened most often in real use: recording, playback, editing, visual recognition, or task organization?
- For OCR, do you mainly need verification, data extraction, or branching decisions?
- For Image Search, do you mainly need to find buttons/icons, reanchor coordinates, or compare screen states?
- Should perception modules live inside HandyRecorder for fast local action, or in AIFlow so the recorder stays simple?
- What is the smallest workflow that proves the next version is better than the current one?
