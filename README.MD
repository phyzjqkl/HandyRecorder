# HandyRecorder

HandyRecorder is a compact Windows keyboard and mouse recorder for creating, editing, and replaying `.rec` automation files.

The publish build is:

```text
HR.exe
```

## Features

- Record mouse left, right, and middle clicks.
- Record mouse wheel actions with rotation count.
- Record mouse drags.
- Record keyboard keys and hotkey combinations using combo-key grammar.
- Add string input commands with a hotkey.
- Replay a full `.rec` file.
- Run only the active command.
- Edit commands directly in the compact command box.
- Insert, delete, save, and reorder command lines.
- Use offset mouse mode for relative click groups.
- Auto-create screenshot crops for mouse actions.
- Review index screenshots beside the app and crop them in idle mode.
- Display live mouse position and pixel color while recording.
- Stop playback quickly with `F9`, or pause/resume playback with `F8`.
- Check recorded screen resolution before replay.

## Quick Start

1. Download or copy `HR.exe`.
2. Put `HR.exe` in a writable folder.
3. Run `HR.exe`.
4. The app creates `HandyRecorder.ini` and a default `.rec` file if needed.
5. Press `Rec` to start recording.
6. Perform actions outside the HandyRecorder window.
7. Press `Off` to stop recording and save.
8. Press `Start` to replay the selected `.rec` file.

## Main Window

The window is intentionally small and always on top.

Top title buttons:

```text
?  Show/hide help
_  Minimize
X  Close
```

Main controls:

```text
Record Files  Select a .rec file
Commands      View or edit active command
A             Action delay between commands
R             Repeat delay for Auto mode
Auto          Repeat playback when checked
ACmt          AutoComment crop mode while recording
L             Reload record file list
N             New record buffer
S             Save current record
+             Insert blank command after active command
-             Delete active command
Start         Run/stop current record
>             Run active command and select next
Rec / Off     Start/stop recording
```

## Default Hotkeys

All hotkeys can be edited in `HandyRecorder.ini`.

```text
F7                 Record mouse move/hover while recording
F8                 Pause/resume playback, or pause/resume recording if recording is active
F9                 Stop replay
Ctrl+Shift+R       Run active command, or continue paused run
Ctrl+Alt+R         Run selected record file
Ctrl+Alt+Left      Select previous record file
Ctrl+Alt+Right     Select next record file
Ctrl+Alt+0..9      Run first file starting with 0_..9_
Ctrl+Shift+Up      Select previous command
Ctrl+Shift+Down    Select next command
Ctrl+Shift+P       Insert/toggle record pause command
Ctrl+Shift+T       Record string input
Ctrl+Shift+O       Toggle offset mode while recording
Ctrl+Shift+Y       Toggle recording tooltip
```

## Recording

Press `Rec` to start recording.

While recording:

- `Rec` changes to `Off`.
- `Auto` changes to `ACmt`.
- If `ACmt` is checked, mouse actions create screenshot crops in the `index` folder.
- The live tooltip displays:

```text
x, y, decimalPixelColor
```

Example:

```text
1474, 746, 131232
```

Press `Off` to stop and save.

During playback, `F8` pauses the running flow and the status changes to `Pause`.
While paused, press `Rec` to record extra commands into the current `.rec` file immediately after the active command.
Press `Off` to save/reload the file, then press `F8`, `Ctrl+Shift+R`, or `>` to continue.

## Resolution Safety

Each `.rec` file starts with a resolution line:

```text
;= Resolution 5120x2160
```

If the current screen resolution does not match the recorded resolution, replay stops and the status label shows:

```text
ResMismatch: currentWidthxcurrentHeight
```

This prevents mouse coordinates from replaying on the wrong screen layout.

## REC Command Format

`.rec` files are plain text. One command per line.

Comment lines start with:

```text
;=
```

Comments are shown in the app but skipped during replay.

When saving, command IDs are renumbered by operation family for readability:
`M_P1`, `M_P2`, `K_B1`, `K_B2`, `S_S1`, and so on. Playback still follows file order. Offset commands use grouped numbering like `MSP_1_1`, `MSP_1_2`, then `MSP_2_1`, `MSP_2_2`.

### Mouse Click

```text
M_P1,x,y,L,repeat,delay,rem_comment
M_P1,x,y,R,repeat,delay,rem_comment
M_P1,x,y,C,repeat,delay,rem_comment
```

Buttons:

```text
L  Left
R  Right
C  Middle
D  Double-click, if used
```

### Mouse Drag

```text
MD_D1,x1~x2,y1~y2,L,speed,delay,rem_drag
```

Example:

```text
MD_D1,100~400,200~500,L,10,,rem_drag
```

Buttons may be:

```text
L  Left drag
R  Right drag
C  Middle drag
```

### Mouse Move

```text
MM_M1,x,y,speed,repeat,delay,rem_move
```

Example:

```text
MM_M1,500,300,0,1,,rem_move
```

### Mouse Wheel

```text
MW_W1,UP,repeat,delay,rem_wheel
MW_W1,DOWN,repeat,delay,rem_wheel
```

### Keyboard / Combo Keys

```text
K_B1,key,repeat,delay,rem_key
```

Combo-key grammar:

```text
^  Ctrl
!  Alt
+  Shift
#  Windows key
```

Examples:

```text
K_B1,^c,1,,rem_key
K_B1,!c,1,,rem_key
K_B1,^!i,1,,rem_key
K_B1,#{LEFT},1,,rem_key
K_B1,{PGDN},1,,rem_key
```

### String

```text
S_S1,"text",repeat,delay,rem_string
```

### Pause

```text
P_P1,"instruction",1,delay,rem_pause
```

The instruction field is editable text for what the human should do.
Blank or `0` delay pauses forever until `Ctrl+Shift+R` or the `>` button.
Positive delay waits up to that many seconds, but `Ctrl+Shift+R` or `>` can continue earlier.
The global `F8` pause also pauses normal playback and resumes with another `F8`.

Escape double quotes by doubling them:

```text
S_S1,"He said ""OK""",1,,rem_string
```

### Delay

```text
T_D1,seconds,repeat,,rem_delay
```

Examples:

```text
T_D1,1,1,,rem_wait_1s
T_D1,0.5,1,,rem_wait_half_second
```

Delay uses stoppable playback sleep, so `F8` pause and `F9` stop remain responsive.

### Offset Mode

```text
;= Offset Start
MSP_1_1,baseX,baseY,L,1,,rem_offset_base
MSP_1_2,dx,dy,L,1,,rem_offset
;= Offset End
;= Offset Start
MSP_2_1,baseX,baseY,L,1,,rem_offset_base
MSP_2_2,dx,dy,L,1,,rem_offset
;= Offset End
```

`MSP_group_1` sets the base coordinate and clicks at the base.

`MSP_group_2`, `MSP_group_3`, and later commands click relative to that group's base.

## Configuration

`HandyRecorder.ini` is created next to `HR.exe`.

You can edit:

- Window position
- Action delay
- Repeat delay
- Auto repeat
- Hotkeys
- Mouse compression tolerance
- Drag threshold
- Tooltip behavior
- AutoComment crop size
- Help tooltip text

## AutoComment Crops

When `ACmt` is enabled during recording, mouse actions create crop images in:

```text
index\
```

The command comment is replaced with a crop label, and the PNG filename uses the same label.

## Review Window

The `Review` checkbox is always unchecked on startup.
When checked, HandyRecorder opens an image window beside the main UI for the active `index` screenshot.
The image is displayed 1:1, so a `30 x 50` PNG uses a `30 x 50` preview area.

In recording mode, Review is display-only.
In idle mode, drag on the review image to draw a dashed crop rectangle.
When the mouse button is released, HandyRecorder overwrites the old `index` PNG with the selected crop, renames the image label with the new crop rectangle coordinates, updates the active command `rem_...`, and reloads the preview.
Mouse actions inside the Review window are ignored by the recorder.

## Notes

- Run actions carefully. Playback controls the real mouse and keyboard.
- Use `F8` to pause/resume playback.
- Use `F9` to stop playback.
- Keep `.rec` files in the same folder as `HR.exe`.
- If display scaling changes, use the resolution guard and test before replaying important actions.
