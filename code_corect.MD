# HandyRecorder Library Design - Correction Notes

Status: Discussion baseline; continue adding future decisions here.
Date: 2026-08-25

## 1. Purpose

Reusable microacts should be organized by Windows program rather than being permanently attached to one workflow task.

Example programs:

- MOSAIQ
- PiPsPro
- AAPM

A rec created while developing CompleteTx can later be promoted into the MOSAIQ library and reused by Weekly.

## 2. Single Library Root

Use one general Library root folder. The root may be located anywhere, including a local disk or network location.

Example:

```text
D:\HandyRecorderLibrary\
  MOSAIQ\
  PiPsPro\
  AAPM\
```

This is preferred for the first implementation because it is neat, easy to back up, and easy to move as one collection.

## 3. LIB.ini

Store the absolute Library root beside HR.exe:

```text
HR.exe folder\
  HR.exe
  HandyRecorder.ini
  HandyRecorder.tasks
  LIB.ini
```

Example `LIB.ini`:

```ini
[Library]
root=D:\HandyRecorderLibrary
```

`HandyRecorder.tasks` remains responsible for Task registration. `LIB.ini` is responsible for the reusable Library location.

## 4. Program Library Structure

A program Library does not contain a `.tsk` file.

```text
D:\HandyRecorderLibrary\
  MOSAIQ\
    micracts\
      select_patient.rec
      open_chartcheck.rec
      make_note.rec

    blk\

    index\
      select_patient\
        idx_....png

      open_chartcheck\
        idx_....png

    export\
      select_patient\
        idx_....png

    MOSAIQ.env
```

The rec files are kept together in `micracts`. The index and export files are grouped by rec name to avoid mixing many images in one directory and to avoid filename collisions.

## 5. Calling a Library Rec from a TSK

The TSK should use a logical reference, not an absolute Windows path:

```text
MOSAIQ\select_patient
MOSAIQ\open_chartcheck
PiPsPro\login
```

The first name identifies the program Library. The second name identifies the rec file.

Resolution example:

```text
MOSAIQ\select_patient
  -> LIB.ini root
  -> MOSAIQ\micracts\select_patient.rec
```

The TSK must not depend on the physical drive letter or network path.

## 6. Index and Export Resolution

The rec command keeps its existing `idx_...` name in the `rem` field. The filename is not changed during promotion.

Example:

```text
rem_idx_260825_173045_0001_x-10~10_y-20~20
```

Review and Runner combine:

```text
Library name
rec name
idx filename from the rem field
```

to resolve:

```text
D:\HandyRecorderLibrary\MOSAIQ\index\select_patient\idx_....png
```

For drag operations, the corresponding export file is resolved under:

```text
D:\HandyRecorderLibrary\MOSAIQ\export\select_patient\idx_....png
```

The same asset resolver must be shared by Review, Runner, recrop, AutoComment, and export handling.

## 7. Promotion

A Task-local rec remains local while it is being developed:

```text
CompleteTx\micracts\open_chartcheck.rec
```

When it becomes reusable, Promote copies it into the program Library:

```text
MOSAIQ\micracts\open_chartcheck.rec
```

Promotion must also copy:

- Related index images.
- Related export images when required.
- Related offset and anchor crop resources.
- Related Library variable definitions.

The original Task-local rec remains unchanged.

## 8. MOSAIQ.env

`MOSAIQ.env` stores Library-level variable definitions and default values. It is not a Task workflow and should not store temporary Task runtime state.

Example:

```ini
[Vars.select_patient]
$patient_id=
$patient_name=
$timeout=10

[Vars.open_chartcheck]
$start_from=
$prompt_required=1
```

Variable priority:

```text
Task.env value
  overrides
MOSAIQ.env default
  overrides
rec internal default
```

Task-specific or sensitive temporary data should remain in the Task environment, not in the shared Library environment.

## 9. Current Implementation Gap

The current HandyRecorder version has Task-local `micracts`, `blk`, `index`, `export`, and `.env` support. It does not yet fully implement:

- LIB.ini reading and Library root management.
- Logical `MOSAIQ\select_patient` resolution.
- Library rec source context.
- Library-aware Review and Runner asset resolution.
- Promote rec with dependent index/export resources.
- Complete Library variable input/output contracts.

These are future implementation items. This document records the agreed design direction and should be updated as later discussions add details.
