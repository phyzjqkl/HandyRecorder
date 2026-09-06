
# HandyRecorder Interpreter Language Handoff

Status: focused implementation handoff draft.
Scope: HandyRecorder .tsk language, variables, LIB synchronization, flow control, and runtime execution.

## 1. Purpose

HandyRecorder is the desktop-action runtime for AIFlow. The Visual Task Editor composes graphical workflows and exports .tsk, .env, and .blk files. HandyRecorder interprets those files and executes the complete task.

The user language must remain small and practical. Users focus on REC, BLK, commands, variables, and flow blocks. AutoIt translation, instruction pointer, stacks, and internal buffers are implementation details.

The interpreter must execute every valid task line. It must never silently skip an unknown command.

## 2. Preserve the Current Baseline

Extend the current AutoIt implementation. Do not replace it with a Python runner or a separate prototype.

Preserve:

- serial .tsk execution;
- local REC calls without .rec;
- local BLK calls with .blk;
- LIB REC and LIB BLK resolution;
- task .env loading;
- existing mouse, keyboard, wheel, drag, offset, pause, review, stop, and editing behavior;
- current task folders and LIB folder organization.

## 3. Language Grammar

Every ordinary executable line translates to one HR runtime action. Flow-control lines are interpreted by HR.

Assignments:

    $A = 1
    $A = $B + 1
    $name = "John Smith"

REC calls do not include .rec:

    OpenPatient
    MOSAIQ\OpenPatient

BLK calls include .blk:

    patient_check.blk
    MOSAIQ\patient_check.blk

External programs retain their extensions:

    backup.bat
    script.cmd
    run.ps1
    check.exe

Do not add SET, RUN, or WHILE in the first language version.

## 4. Variable Contract

Every variable reference must be claimed in an environment. This includes variables found in REC, BLK, LIB REC, LIB BLK, BAT, CMD, PS1, EXE, data wires, and expressions.

Before execution, report unresolved variables with task file, line number, variable name, and expected scope. Do not silently create unclaimed variables.

Scalar examples:

    $A = 1
    $status = "OK"
    $patient = "P001"
    $path = "C:\Temp\result.txt"

Coordinate and indexed values may use:

    $pos[0]
    $pos[1]
    $grid[1][2]

The project must choose one indexing convention and apply it consistently. Inspect current HR behavior before finalizing zero-based or one-based indexing.

## 5. Scope and LIB Synchronization

Task pipeline variables are stored in the active task environment.

Local REC variables use:

    <task>.env [Vars.OpenPT]

A LIB call such as:

    MOSAIQ\OpenPT

reads source claims from:

    LIB\MOSAIQ\MOSAIQ.env [Vars.OpenPT]

and synchronizes missing claims into:

    <task>.env [Vars.MOSAIQ\OpenPT]

The library environment is the source/template. The task environment is the synchronized local runtime claim table.

Synchronize when:

- the Editor inserts a LIB entry;
- a task is opened or switched;
- a manually typed LIB line is saved;
- a local item is promoted.

Do not overwrite existing task-local values.

Editing a LIB call must not silently modify shared library files. Normal editing uses a local copy. Explicit Promote creates a new library version. Explicit Overwrite backs up the old version before replacement.

## 6. Arrays and Tables

The user-facing names are logical:

    $grid[1][2]
    $patients_table

Do not expose internal names such as $buffer1 in exported .tsk files. HR may use a pool of internal buffers and an array/table register.

Register metadata should include:

    scope
    logical name
    kind: array or table
    runtime buffer
    row count when known
    column count when known
    source file path when file-backed
    occupied/released state

A table may be loaded from the task table folder or produced by a BLK/external command. A BLK may consume or produce an array/table. The logical name travels through data wires; internal buffer allocation stays inside HR.

Do not use AutoIt Execute or Assign as public task syntax. They may be internal implementation techniques only if normal array operations remain reliable.

## 7. Command Inputs and Outputs

Input substitution:

    backup.bat $A $name
    run.ps1 -Patient $patient -Mode $mode
    check.exe $file

The external program defines its own switches. HR only resolves variables and passes arguments. HR must not invent --x, --y, or other program-specific switches.

Output syntax:

    backup.bat $A -> $ok
    run.ps1 $input -> $output_path
    CheckStatus -> $status

External output is commonly status text or an output file path. A first implementation may use a controlled task return file such as returnvalue.txt, but BAT, CMD, PS1, and EXE output capture must be tested separately before being marked complete.

For large 2D data, prefer a file path unless the receiving BLK or executable contract defines a direct representation.

## 8. Flow-Control Grammar

IF:

    IF $ok = "OK"
        ApproveField
    ELSE
        RetryOpen
    ENDIF

First comparison operators:

    =
    !=
    >
    >=
    <
    <=
    contains

An unresolved condition is an error, not false.

LOOP uses a count or variable:

    LOOP 5
        NextPage
    ENDLOOP

    LOOP $N
        CheckStatus
    ENDLOOP

There is no WHILE.

SWITCH:

    SWITCH $mode
    CASE "weekly"
        WeeklyNote
    CASE "completeTx"
        CompleteTxNote
    DEFAULT
        GeneralNote
    ENDSWITCH

BREAK exits the nearest LOOP. CONTINUE advances the nearest LOOP iteration.

RETURN:

    RETURN
    RETURN $ok
    RETURN "DONE"

RETURN ends the current task or BLK scope and may provide one result value. Lines after RETURN in the same branch are unreachable and should be validated.

## 9. Runtime Execution Model

Parse before run:

1. Read the complete .tsk file.
2. Tokenize and parse all lines.
3. Build a structured instruction and block map.
4. Load and synchronize required environments.
5. Validate commands, variables, paths, and nesting.
6. Initialize runtime state.
7. Execute.

A parse or validation error must prevent partial execution.

Use an instruction pointer, IP, over the parsed instructions. Do not rewrite the .tsk file during execution.

Use a control stack for nested IF, LOOP, and SWITCH contexts. Each context must retain its parent relationship and jump information.

Precompute matching targets:

    IF -> ELSE and ENDIF
    LOOP -> ENDLOOP
    SWITCH -> CASE, DEFAULT, and ENDSWITCH

Do not match closing keywords by a text search that ignores nesting. Do not implement loops as raw backward graphical wires; LOOP/ENDLOOP creates the runtime repetition.

The dispatcher must classify:

    assignment
    local REC
    LIB REC
    local BLK
    LIB BLK
    external command
    PAUSE
    IF, ELSE, ENDIF
    LOOP, ENDLOOP
    SWITCH, CASE, DEFAULT, ENDSWITCH
    BREAK, CONTINUE, RETURN
    comment or disabled line

Use existing HR REC/BLK and desktop-action functions for normal actions. Do not duplicate mouse and keyboard execution logic in the parser.

## 10. Strict Error Policy

Unknown, malformed, or unsupported commands are fatal errors. The interpreter stops and reports task file, line number, original line, category, and reason.

Fatal cases include:

- unknown command;
- malformed command;
- invalid extension;
- missing REC, BLK, or LIB file;
- unresolved variable;
- invalid expression or array reference;
- missing LIB environment claim;
- mismatched flow-control keyword;
- ELSE without IF;
- CASE or DEFAULT outside SWITCH;
- BREAK or CONTINUE outside LOOP;
- invalid LOOP count;
- invalid external output contract;
- output assignment with no valid result.

The Editor may preserve an invalid line as an error node for repair, but must block export/run until fixed. The interpreter must never silently skip it.

## 11. Editor Contract

The Editor is a graphical composer similar to LabVIEW.

- Hollow arrows are execution wires.
- Data wires connect logical variables.
- Existing serial .tsk files import in exact order.
- Control blocks own their branches structurally.
- IF owns TRUE/FALSE.
- LOOP owns BODY/DONE.
- SWITCH owns CASE branches and optional DEFAULT.
- Nested controls export as paired keywords and re-import without structural loss.
- Inserting a control after node C offers continuous following nodes as candidates and preserves their order.
- Right-click insertion remains the primary insertion workflow: Files, Flow Control, Variables, Commands.
- Run, pause, stop, review, and debug remain HandyRecorder functions.

The Editor must generate .env claims, synchronize used LIB variables, support local/LIB REC and BLK, external commands, variables, data wires, and flow controls. Image Search and OCR are future extension blocks with outputs such as coordinate, confidence, found/not-found, recognized text, and status. They must not be silently ignored or marked runnable before runtime support exists.

## 12. Completion Definition

The interpreter milestone is complete when:

1. Existing serial tasks still run correctly.
2. Every first-version grammar line is parsed.
3. Unknown commands fail clearly and never get skipped.
4. All variables are claimed before execution.
5. LIB claims synchronize into the active task environment.
6. Local and LIB REC/BLK paths resolve correctly.
7. Scalar input and output substitution works.
8. Logical arrays/tables work for task and BLK data exchange.
9. IF, LOOP, SWITCH, BREAK, CONTINUE, and RETURN work.
10. Nested structures use correct IP and control-stack behavior.
11. Parse errors occur before partial execution.
12. Runtime errors identify the exact source line.
13. Editor export and interpreter import agree on the grammar.
14. Export/import round trips preserve structure.
15. Existing desktop-action regression tests pass.

## 13. Pitfalls To Avoid

- silently skipping unknown commands;
- treating an invalid condition as false;
- matching ENDIF, ENDLOOP, or ENDSWITCH without nesting state;
- using backward wires as the loop implementation;
- mixing task scope with LIB source scope;
- overwriting task-local values during LIB synchronization;
- modifying shared LIB files during ordinary editing;
- exposing internal buffer names in .tsk;
- assuming every 2D table can be passed directly to an external program;
- claiming stdout capture works without testing each Windows command type;
- mixing array index conventions;
- loading variables from every LIB module instead of only used entries;
- executing a partially parsed task;
- changing current REC runner behavior during parser work;
- allowing Editor features the runtime cannot execute;
- judging completion by visual canvas appearance alone.

## 14. New Chat Handoff Prompt

You are implementing the HandyRecorder interpreter language.

Read HANDYRECORDER_INTERPRETER_LANGUAGE_HANDOFF.md first, then inspect the current AutoIt source and project handoff documents. Work from the current implementation. Do not build a Python replacement and do not replace working REC or desktop-action code with a prototype.

First identify the current .tsk loader, variable compiler, runner, REC/BLK resolver, task environment code, and existing tests. Report what is already implemented before changing it.

Implement incrementally:

1. preserve and test current serial .tsk execution;
2. add source-line-aware parsing;
3. enforce strict validation: unknown or malformed commands are fatal and never silently skipped;
4. implement scalar claims and substitution;
5. implement LIB variable synchronization;
6. build precomputed IF/LOOP/SWITCH matching;
7. add instruction-pointer and control-stack execution;
8. add BREAK, CONTINUE, and RETURN;
9. add BLK input/output;
10. add logical array/table register handling;
11. add tested external command input/output capture;
12. add Editor export and nested round-trip tests.

Required grammar includes:

    $A = 1
    $A = $B + 1
    OpenPatient
    MOSAIQ\OpenPatient
    patient_check.blk
    MOSAIQ\patient_check.blk
    backup.bat $A -> $ok
    IF / ELSE / ENDIF
    LOOP / ENDLOOP
    SWITCH / CASE / DEFAULT / ENDSWITCH
    BREAK
    CONTINUE
    RETURN

Do not add SET, RUN, or WHILE. REC calls do not use .rec. BLK and external commands retain their extensions.

Keep changes small and reversible. After every change, run syntax checks and focused tests. At the end of each cycle report files changed, grammar supported, tests run, remaining gaps, discovered risks, and the next smallest step.

Do not stop because the Editor looks attractive. Completion requires parser correctness, strict error behavior, variable scope correctness, LIB synchronization, nested flow correctness, runtime execution, and regression coverage.

