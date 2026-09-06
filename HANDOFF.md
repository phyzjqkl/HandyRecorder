# HandyRecorder Handoff

This file is the current handoff note for moving HandyRecorder into the larger AIFlow project as a component.

## What HandyRecorder Is Right Now

HandyRecorder is the desktop-action component of AIFlow.

It is already good at:

- recording desktop actions into `.rec`
- replaying actions safely with pause/stop controls
- editing task tables and rec files in-app
- attaching screenshot/comment context to recorded actions
- managing task-local assets such as `micracts`, `blk`, `index`, `export`, and `<task>.env`

It is not yet finished as a variable-driven or image-driven action engine.

## What AIFlow Should Assume

AIFlow should treat HandyRecorder as a child component with a stable boundary:

- input: task folder, task table, task env, rec files
- output: concrete action execution, task-local artifacts, edited rec/task assets
- non-goal: full cross-task flow logic, heavy branching semantics, OCR control plane

## Current Control Docs

These are the docs AIFlow or a future Codex session should read first:

- `HANDYRECORDER_COMPONENT_SPEC.md`
  Current capability contract
- `HISTORY.md`
  Why the current design looks the way it does
- `HANDOFF.md`
  Current state, next milestone, and integration boundary
- `Agents.md`
  Legacy reconstruction brief plus pointer to live docs

## Build Caveat

The current workspace has a practical EXE build caveat:

- if a preview EXE is still running, rebuilding to the same filename can silently leave the old binary in place
- NAS-backed EXE replacement can also behave differently from plain text file writes

Safe habit:

1. stop every running HandyRecorder EXE first
2. rebuild
3. verify the EXE timestamp changed
4. only then relaunch

## Recommended AIFlow Embedding Model

Use HandyRecorder as one component folder under AIFlow rather than as a pile of copied scripts.

Recommended conceptual split:

```text
AIFlow/
  components/
    HandyRecorder/
      source or build artifacts
  workflows/
    <workflow>/
      tasks/
        <task folder>
```

Even if you keep a standalone HandyRecorder workspace, the component contract should remain task-folder based.

## Next Technical Milestone

The next serious milestone is the Variable System.

That work should define:

- how variables are stored in `<task>.env`
- how commands or task lines reference variables
- whether variable scope is task-wide, rec-specific, or both
- how variable insertion works from the editor UI
- what small arithmetic and boolean operations are supported
- how variables interact with future AIFlow condition logic

The Variable System should be completed before image search and OCR become first-class runtime dependencies.

## After Variable System

Once variables are stable, the next handoff-ready phases are:

1. freeze a stable HandyRecorder component release for AIFlow
2. reopen image-search integration
3. reopen OCR integration
4. decide how much of search/OCR belongs inside HandyRecorder versus AIFlow orchestration
