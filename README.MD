# HandyRecorder

HandyRecorder is a compact Windows macro recorder and runner. It records mouse and keyboard actions into editable `.rec` files, lets you adjust the command list, and replays the selected macro with safety controls.

The published build is:

```text
HR.exe
```

Current release: `1.24`

## Quick Start

1. Put `HR.exe` in a writable folder.
2. Run `HR.exe`.
3. HandyRecorder creates `HandyRecorder.ini`, `<folder>.env`, `<folder>.tsk`, and `micracts\record1.rec` if needed.
4. Press `N` to create a new record file and start recording immediately.
5. Press `Off` to stop and save.
6. Press `Start` to replay the selected file.

Press `Rec` when you want to record into the current active `.rec` file instead of creating a new file. New recorded commands insert after the active command line.
Version `1.24` treats the HandyRecorder folder as an action/task folder for AutoFlow/AIFlow use. `.tsk` tables define task-level operations; `.flw` is reserved for the upper flow-control layer.

## Action Folder Layout

HandyRecorder now stores macros in an action-folder layout:

```text
<action folder>\
  HR.exe
  HandyRecorder.ini
  <action folder>.env
  <action folder>.tsk
  micracts\
    *.rec
  index\
  export\
```

The Record Files list is loaded from `<action folder>.tsk`. Local rec macros are extensionless, while non-rec actions keep their extension. Lines starting with `;=` are comments or disabled actions and are hidden from the Record Files list. HandyRecorder shows only simple local rec entries from `micracts`; future AIFlow entries such as `.ps1`, `.bat`, `.exe`, `.tsk`, `.flw`, and relative paths are left for the AIFlow interpreter. If the `.tsk` file does not exist, HandyRecorder creates it from `micracts\*.rec` ordered from oldest to newest file time. On first v1.2+ run, existing root `.rec` files are copied into `micracts` for migration.

Example:

```text
;= monthlyQA task
login
prepare_env.ps1
clean_cache.bat
helper.exe
../imageQA/imageQA.tsk
../monthlyQA/monthlyQA.flw
../datanalysis/check_macro
```

## Main Controls

```text
Record Files       Select the active .rec file
Record Auto        Run record files one by one
SkipRes            Skip resolution mismatch protection
Commands           View/edit the active command
Commands Auto      Repeat the current file during playback
Review             Show screenshot/rem review window
A                  Delay between commands
R                  Repeat delay
L                  Reload INI and .rec files
N                  New file and start recording
S                  Save current file
D                  Duplicate active file as *_cp1, *_cp2...
+ / -              Insert/delete command line
Start              Run/stop selected file
>                  Run active command and move next
Rec / Off          Start/stop recording
```

During recording, the Commands `Auto` checkbox becomes `ACmt`. When `ACmt` is checked, mouse actions create screenshot crops in the `index` folder.
Holding a mouse button longer than `[Record] mouse_down_hold_sec` without dragging records a manual long press as `M_D` plus `M_U`.

## Default Hotkeys

Hotkeys can be edited in `HandyRecorder.ini`.

```text
F5                 Previous command in idle/normal recording
F6                 Run active command in idle; delete current line in normal recording
Shift+F6           Run active command and move next in idle
F7                 Next command in idle/normal recording
F8                 Record mouse move/hover
F9                 Pause/resume playback; pause/resume recording when recording
Alt+F9             Stop recording / finish patch recording
Shift+F9           Emergency stop / Off
Alt+F5 / Alt+F7    Previous/next record file
Alt+F6             Run selected record file
Ctrl+Alt+0..9      Run file starting with 0_ through 9_
Ctrl+Shift+T       Toggle string recording
Ctrl+Shift+O       Toggle offset mouse mode
Ctrl+Shift+Y       Toggle recording tooltip
```

In running or playback-pause mode, `F5/F6/F7` do not move or run commands. This prevents accidental interference with an active playback flow.

## Recording Workflow

`N` creates a new file named like `rec_YYYYMMDD_HHMMSS` and immediately starts recording.

`Rec` records into the currently selected file. New actions insert after the active command. If the active line is a comment block beginning with `;=`, insertion happens after the last continuous comment line in that block.

In normal recording:

```text
F5 / F7      Move the insertion position
F6           Delete current command and activate the previous line
F8           Record mouse hover/move
F9           Pause/resume recording
Alt+F9/Off   Stop recording and save
```

## Playback-Pause Patch Recording

This is useful when a running macro pauses and you want to record extra steps into that exact location.

```text
Running -> F9             Pause playback
Pause -> Rec              Start patch recording
Patch Recording -> Off    Insert patch, save, reload, stay paused
Pause -> F9               Continue playback
```

Patch recording uses a temporary command buffer. The command box shows only the new patch commands while patch recording. When you press `Off` or `Alt+F9`, HandyRecorder inserts that patch after the saved playback pause command, reloads the file, and remains paused so you can inspect before continuing.

## Review And AutoComment

When `ACmt` is enabled, mouse clicks, drags, and `F8` mouse moves create screenshots in:

```text
index\
```

The command `rem_` field becomes the PNG filename. Current crop labels use mouse-relative offsets:

```text
rem_idx_260604_154233_0001_x-10~9_y-20~19
```

The matching image is:

```text
index\idx_260604_154233_0001_x-10~9_y-20~19.png
```

The Review window opens beside the main UI. It shows the active index image, a zoom slider, and the command `rem_` text. The zoom ratio defaults to `2` and is stored in:

```text
[Review]
zoom_ratio=2
```

You can crop the review image in idle mode and record mode. Mouse actions that start inside the Review window are never recorded, even if the drag leaves the image/window. The old PNG is renamed to the new `idx_...` filename after crop.

## Resolution Safety

Each `.rec` file starts with a resolution line:

```text
;= Resolution 5120x2160
```

If the current display resolution does not match, playback stops and the status shows:

```text
ResMismatch: currentWidthxcurrentHeight
```

Check `SkipRes` only when you intentionally want to bypass this protection.

## Command Grammar

`.rec` files are plain text, one command per line. Comment lines start with `;=` and are skipped during playback.

General command fields:

```text
command,data1,data2,data3,repeat,delay,rem_comment
```

Common examples:

```text
M_P1,500,300,L,1,,rem_click
M_D1,500,300,L,1,2.4,rem_down
M_U1,500,300,L,1,,rem_up
MM_M1,500,300,0,1,,rem_move
MD_D1,100~400,200~500,L,10,,rem_drag
MW_W1,DOWN,3,,rem_wheel
K_B1,^c,1,,rem_key
S_S1,"text",1,,rem_string
P_P1,"human instruction",1,,rem_pause
T_D1,1,1,,rem_delay
```

Mouse long press uses two commands. The hold time is stored in the `delay` field of `M_D`:

```text
M_D1,1200,850,L,1,3.0,rem_down
M_U1,1200,850,L,1,,rem_up
```

Playback moves to `1200,850`, presses the left button, waits `3.0` seconds with stoppable `SafeSleep`, then releases on the `M_U` line.

Combo-key grammar follows AutoIt `Send` style:

```text
^  Ctrl
!  Alt
+  Shift
#  Windows key
```

Examples:

```text
^c        Ctrl+C
!c        Alt+C
^!i       Ctrl+Alt+I
#{LEFT}   Win+Left
{PGDN}    Page Down
```

## Configuration

`HandyRecorder.ini` is stored beside `HR.exe`. If the INI is missing, HandyRecorder creates it. If keys are missing, it repairs only missing keys without overwriting your existing values.

Press `L` to reload the INI and `.rec` files after editing them.

Useful settings include:

```text
[Settings]      action_delay, repeat_delay
[Hotkeys]       all hotkeys
[Merge]         mouse compression tolerance
[Record]        drag threshold, long press threshold, tooltip, string masking
[AutoComment]   crop size
[Review]        zoom_ratio
[Info]          editable help text
```

## Notes

- Playback controls the real mouse and keyboard. Test macros carefully.
- Keep `.rec` files in the same folder as `HR.exe`.
- Use `F9` to pause/resume playback.
- Use `Shift+F9` for emergency stop.
- Use `SkipRes` carefully if the recorded and current screen layouts differ.
