# Antigravity Handoff Prompt - HandyRecorder Visual Task Editor

You are upgrading the existing HandyRecorder Visual Task Editor.

Your first responsibility is preservation. Start from the current working Editor source and current UI, not from a blank prototype and not from this prompt alone. Run it, inspect it, and document the functions that already work. Preserve the current canvas, serial .tsk import, task editor layout, right-click insertion flow, REC/BLK explorer, task .env pane, node selection, refresh behavior, save/reload behavior, and graphical wires.

Read these project documents before editing:

- ANTIGRAVITY_EDITOR_COMPLETION_GUIDE.md
- HANDYRECORDER_COMPONENT_SPEC.md
- HISTORY.md
- HANDOFF.md

The guide section "Binding Amendments - Must Override Earlier Draft Wording" is authoritative.

Goal: deliver a comprehensive graphical composer for HandyRecorder .tsk and future .flw workflows. The Editor is similar to LabVIEW: nodes are placed on a canvas, hollow arrows express execution flow, and data wires connect named variables. The Editor composes and exports files; HandyRecorder performs execution, review, run, pause, stop, and debug.

Required user-facing grammar:

- local REC: OpenPatient
- LIB REC: MOSAIQ\OpenPatient
- local or LIB BLK: name.blk or MOSAIQ\name.blk
- external: backup.bat, script.cmd, run.ps1, check.exe
- assignment: $A = 1 or $A = $B + 1
- output: command arguments -> $result
- flow: IF/ELSE/ENDIF, LOOP/ENDLOOP, SWITCH/CASE/DEFAULT/ENDSWITCH, BREAK, CONTINUE, RETURN
- no SET, no RUN, no WHILE, no .rec extension on REC calls

Every variable reference must be claimed in the appropriate .env. The Editor must discover candidates from REC/BLK contents, support manual variable creation, show scope/type/default/source, and synchronize missing variables from used LIB modules into the active task .env. Library env is the source; task env is the local runtime claim table. Do not silently overwrite task-local values.

Use logical array/table variables such as $grid[1][2] and $patients_table. Do not expose HR internal $buffer# allocation in exported task text. Arrays/tables need metadata and data-wire support; runtime buffer allocation is HandyRecorder responsibility.

Flow control must be structural:

- IF: input, TRUE, FALSE, next
- LOOP: input, BODY, DONE
- SWITCH: input, CASE branches, optional DEFAULT, next

Nested controls must export as correctly paired keywords and re-import without losing nesting. When adding a control after node C, offer continuous following nodes as candidates; preserve their original order. Do not use raw backward wires to represent loops.

When importing an existing serial .tsk, create a graph in exact file order. Preserve comments. Preserve invalid lines as repairable error nodes, but block export/run until fixed.

Strict validation is mandatory. Do not silently skip unknown commands. An unknown, malformed, or unsupported line must block export and show file, line number, original text, and reason. Missing variable claims, invalid nesting, ambiguous execution wires, wrong extensions, and invalid branch placement must be reported clearly.

Use the existing right-click insertion workflow as the primary insertion path:

- Files
- Flow Control
- Variables
- Commands

The palette can provide common tools, but it must respect the selected insertion point. Include practical HR commands: REC, LIB, BLK, BAT, CMD, PS1, EXE, PAUSE, BREAK, CONTINUE, RETURN, VARIABLE, MATH, IF, LOOP, SWITCH. Run/debug controls remain in HandyRecorder.

Support future extension blocks for Image Search and OCR, with outputs such as coordinate, confidence, found/not-found, recognized text, and status. Do not mark them runnable until the HR runtime contract exists.

Implementation loop:

1. Run and inspect the current Editor.
2. Record baseline behavior and create regression tests.
3. Extend the current parser/model, not replace it.
4. Implement one grammar or UI capability.
5. Test parsing, export, and invalid input.
6. Test .env variable claims and LIB synchronization.
7. Test nested control export and re-import.
8. Test task-local and LIB explorer resolution.
9. Run the existing Editor smoke test.
10. Fix the first failure.
11. Repeat until all baseline and new acceptance tests pass.

Definition of success:

- existing Editor behavior remains intact;
- serial .tsk files import and export without reorder;
- local/LIB REC and BLK references resolve correctly;
- variables are claimed and synchronized correctly;
- arrays/tables use logical names and data wires;
- IF/LOOP/SWITCH nesting is deterministic;
- invalid commands never silently pass;
- exported .tsk/.env files are readable by HandyRecorder;
- export -> close -> re-import restores the same meaningful graph;
- tests demonstrate the above.

Do not stop at a visually attractive canvas. Continue the implementation/test/fix loop until the grammar, graph, files, variables, nesting, and round trip all work together.
