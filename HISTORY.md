# HandyRecorder History

This file is a concise decision/history log for the current HandyRecorder line, separate from the older archived folders under `history verison`.

## Stable Checkpoints

### v1.55

- stable core HandyRecorder checkpoint before the task-registry expansion
- chosen as the practical rollback point before OCR/image-search expansion

### v1.60

- introduced one `HR.exe` managing multiple task folders
- added `<flow>.tasks` registry behavior
- formalized task folder layout with `.tsk`, `.env`, `micracts`, `blk`, `index`, `export`

### v1.61

- expanded `F8` work around offset marker / move-anchor recording
- began the newer offset-anchor direction that later fed into review and anchor discussions

### v1.65

- improved pause handling for VM/Citrix workflows
- manual focus pause became a first-class use case

### v1.70

- introduced task-branch / fork editing in the `.tsk` model
- task runner began following `->1` branch by default

### v1.71

- snapshot used as the base before the larger task-editor layout work

### v1.75

- task editor became a more serious working surface
- rec/blk side panes and insertion flow were added
- this was the bridge from a simple task list to a real task-edit tool

### v1.80

- current working branch before Variable System
- task editor now has:
  - block creation with nearby name dialog
  - separate fork button
  - rec/blk insertion lane between panes
  - variable side pane from `<task>.env`
  - side-panel refresh behavior
- main UI evolved from label-only affordances toward action-labeled buttons such as `Tasks` and `Recs`

## Design Decisions That Matter Going Forward

- HandyRecorder is a task-level recorder/runner, not the full AIFlow interpreter.
- `.tsk` is a task action table, not yet a full scripting language.
- `.blk` is a reusable task fragment under task scope.
- `<task>.env` is the correct home for task-local variables.
- variable system work should happen before image search and OCR.
- OCR and image search should remain component extensions, not reshape the core recorder until the task/variable model is stable.

## Archived Material

Older prototype snapshots still live under:

```text
history verison\handyrecorder _v1
history verison\handyrecorder - v2
history verison\handyrecorder -v3
```

Those folders are useful for archaeological comparison, but the live project truth should now be taken from:

- `HANDYRECORDER_COMPONENT_SPEC.md`
- `HANDOFF.md`
- this `HISTORY.md`
