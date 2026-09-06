# Antigravity Visual Task Editor Completion Guide

Status: working design contract for the HandyRecorder Visual Task Editor.
Audience: Antigravity editor agent and Codex AutoIt runtime agent.
Goal: make the graphical editor export grammar-correct HandyRecorder `.tsk` / `.env` / `.blk` files that can be executed by the AutoIt interpreter.

## 1. Core Goal

The editor is a graphical script composer, similar in spirit to LabVIEW.

The user should compose automation workflows by:

1. clicking tools in the left palette,
2. clicking files from the explorer/library panel,
3. placing blocks on the canvas,
4. connecting blocks with graphical wires,
5. editing block properties,
6. exporting a valid HR `.tsk` script and related `.env` data.

The editor does not need to run mouse/keyboard actions. AutoIt HandyRecorder is the runtime.

The editor's job is:

```text
Canvas graph + block properties + wires
        -> export
Grammar-correct .tsk / .env / .blk
        -> run by HandyRecorder AutoIt interpreter
```

The canvas graph is the user's main editing surface. The `.tsk` text file is the runtime/export format.

## 2. Success Definition

The editor project is successful when all of these are true:

1. A user can compose a workflow visually without manually writing most `.tsk` text.
2. The exported `.tsk` uses only the HandyRecorder grammar defined in this document.
3. The exported `.tsk` can be parsed back into the same meaningful graph structure.
4. The exported `.env` contains task-level and rec-level variables in the correct sections.
5. REC, LIB REC, BLK, BAT, CMD, PS1, EXE, variable assignment, IF, LOOP, SWITCH, PAUSE, BREAK, CONTINUE, and RETURN blocks can all be represented.
6. Nested IF / LOOP / SWITCH structures export as readable, correctly paired text blocks.
7. Data wires, if used, compile into normal `$variable`, argument, and `-> output` syntax in `.tsk`.
8. Execution wires compile into deterministic task order and control-flow structure.
9. The editor does not invent runtime behavior that AutoIt has not agreed to support.
10. A save/open round trip does not corrupt command names, variable names, library paths, or control-flow nesting.

## 3. HandyRecorder `.tsk` Grammar

### 3.1 Comments and Disabled Lines

```text
;= comment text
;= DisabledRec
```

Lines beginning with `;=` are not executed.

### 3.2 Variables

Variables always start with `$`.

```text
$A = 10
$patient = "John Smith"
$retry = $retry + 1
$result = $A + $B
$grid_path = "C:\\Temp\\table.csv"
```

No `SET` keyword is used. Every assignment line is executable.

Supported first-version variable types:

```text
number
string
boolean-like string or number, such as 1/0, true/false, OK/FAIL
file path string
small coordinate pair, such as 500,300
```

Large 2D data should be saved to a file and passed as a file path string.

### 3.3 REC Calls

Local rec calls do not include `.rec`.

```text
OpenPatient
SelDI
ChartCheck
```

Optional input and output syntax is allowed:

```text
OpenPatient $patient
CheckStatus -> $status
SelectPatient $mrn $dob -> $ok
```

The editor may generate these lines from block properties or data wires.

### 3.4 LIB REC Calls

Library rec calls use module path plus rec name. Do not include `.rec`.

```text
MOSAIQ\OpenPatient
MOSAIQ\SelDI $patient -> $ok
PiPsPro\ExportReport $case_id -> $report_path
```

The absolute library root is configured outside the `.tsk`, currently by `LIB.ini` near `HandyRecorder.exe`.

### 3.5 BLK Calls

Block/sub-task calls must include `.blk`.

```text
recordall.blk
chartcheck_subflow.blk $patient -> $ok
```

### 3.6 External Commands

External commands must include their extension:

```text
backup.bat $patient $date -> $ok
script.cmd $file -> $status
run.ps1 -Patient $patient -Mode $mode -> $out
check.exe $file -> $result
```

HandyRecorder only substitutes variables and captures return output. It does not define external program switches. Switches such as `-Patient`, `--mode`, `/q`, etc. belong to the external tool.

Return convention:

```text
command arguments -> $outVar
```

Runtime plan:

1. replace variables with current values,
2. execute command,
3. capture stdout into a task-local return file such as `returnvalue.txt`,
4. read that file,
5. assign the content to `$outVar`.

### 3.7 Pause

```textFo
PAUSE 2
PAUSE 0.5
```

Value is seconds.

### 3.8 IF / ELSE / ENDIF

```text
IF $ok = "OK"
    ApproveField
ELSE
    RetryOpen
ENDIF
```

`ELSE` is optional.

Allowed comparison operators for first version:

```text
=
!=
>
>=
<
<=
contains
```

The editor should export paired `IF` / `ELSE` / `ENDIF` blocks, not old `->N` branch syntax.

### 3.9 LOOP / ENDLOOP

First version uses count loops only.

```text
LOOP 5
    CheckStatus
ENDLOOP

LOOP $N
    NextPatient
ENDLOOP
```

Do not export `WHILE` in phase 1.

Use `BREAK` and `CONTINUE` inside loops:

```text
LOOP 999
    CheckStatus -> $status
    IF $status = "OK"
        BREAK
    ENDIF
    NextPage
ENDLOOP
```

### 3.10 SWITCH / CASE / DEFAULT / ENDSWITCH

```text
SWITCH $mode
CASE "weekly"
    WeeklyNote
CASE "completeTx"
    CompleteTxNote
DEFAULT
    GeneralNote
ENDSWITCH
```

Each `CASE` branch exports its connected blocks under that case until the next `CASE`, `DEFAULT`, or `ENDSWITCH`.

### 3.11 RETURN

```text
RETURN
RETURN $ok
RETURN $result
```

`RETURN` ends the current task/block scope and optionally returns a variable value.

## 4. Graphical Editor Model

### 4.1 Canvas Is Source of Truth

The canvas graph should be treated as the primary editing model. Exported text is generated from the graph.

```text
Graph nodes + execution wires + optional data wires + node properties
        -> compiler/exporter
        -> .tsk / .env / .blk
```

### 4.2 Execution Wires

The hollow arrow line is the execution-flow wire.

It controls:

```text
sequence order
IF true branch
IF false branch
SWITCH case branches
LOOP body
LOOP done path
```

Execution wires should be deterministic. If a node has ambiguous outgoing execution wires, the editor should warn the user before export.

### 4.3 Data Wires

The editor may implement data wires. Data wires are graphical composition helpers.

Data wires should compile into `.tsk` text, not require AutoIt to understand graph wires directly.

Examples:

```text
GetPatient output $patient -> OpenPatient input
exports:
OpenPatient $patient

CheckStatus output $status -> IF condition
exports:
CheckStatus -> $status
IF $status = "OK"

backup.bat output $ok -> IF condition
exports:
backup.bat $patient -> $ok
IF $ok = "OK"
```

Data wire rules:

1. Every data wire must bind to a named `$variable`.
2. A block property panel must show generated input and output variables.
3. If a user edits variable names in the property panel, data wire labels should update.
4. Data wires should not create hidden runtime-only state.
5. Exported `.tsk` must still be readable without the graph.

## 5. Required Block Types

### 5.1 REC Block

Generated from local `.rec` file selection or from `+ Rec`.

Export:

```text
RecName
RecName $input1 $input2 -> $output
```

Properties:

```text
rec name
input variables
output variable
rec-specific variables
raw rec commands viewer/editor if available
```

### 5.2 LIB REC Block

Generated from library module explorer.

Export:

```text
Module\RecName
Module\RecName $input1 -> $output
```

Properties:

```text
module name
rec name
input variables
output variable
LIB env variable section
```

### 5.3 BLK Block

Export:

```text
subflow.blk
subflow.blk $input -> $output
```

A BLK block may open a mini-canvas, but export must remain `.blk` plus its content file.

### 5.4 Variable / Math Block

Export:

```text
$A = 10
$A = $B + 1
$patient = "John Smith"
```

Properties:

```text
output variable
expression
input variables detected from expression
```

### 5.5 External Script Block

Export:

```text
backup.bat $patient $date -> $ok
run.ps1 -Patient $patient -> $out
check.exe $file -> $result
```

Properties:

```text
file path or command name
argument template
input variables
output variable
working directory if needed later
```

### 5.6 IF Block

IF block has one input execution pin and two output execution pins:

```text
IN
TRUE
FALSE
```

Export:

```text
IF condition
    true branch
ELSE
    false branch
ENDIF
```

If the false branch is empty, export without `ELSE`.

### 5.7 LOOP Block

LOOP should be a control/container block, not just a normal sequential node.

Recommended pins:

```text
IN
BODY
DONE
```

Export:

```text
LOOP count_or_variable
    body branch
ENDLOOP
after loop branch
```

The loop should not be represented only by a wire that visually points backward. Use a loop container or structured control node so nesting is unambiguous.

### 5.8 SWITCH Block

SWITCH has one input pin and multiple case output pins.

Export:

```text
SWITCH $variable
CASE "case1"
    case1 branch
CASE "case2"
    case2 branch
DEFAULT
    default branch
ENDSWITCH
```

Properties:

```text
switch variable
case labels
optional default branch
```

### 5.9 BREAK / CONTINUE / RETURN Blocks

These can be small command blocks.

Export:

```text
BREAK
CONTINUE
RETURN
RETURN $value
```

Editor validation:

```text
BREAK and CONTINUE should be inside LOOP.
RETURN can be anywhere, but warns if unreachable blocks follow in the same branch.
```

## 6. Variable Storage Rules

### 6.1 Task-Level Variables

Pipeline variables created by `.tsk` assignment, external command output, rec output, IF, LOOP, and SWITCH should be stored in `<task>.env`:

```ini
[Global.Vars]
$patient=
$retry=0
$status=
$ok=
```

### 6.2 Local REC Variables

Local rec-specific variables should be stored in the current task env:

```ini
[Vars.OpenPatient]
$run=1
$next=0
$patient=
```

### 6.3 LIB REC Variables

LIB rec-specific variables belong to the library module env, not the local task env:

```text
LIB\MOSAIQ\MOSAIQ.env
```

Example:

```ini
[Vars.OpenPatient]
$run=1
$next=0
$patient=
```

The task env may still contain pipeline variables that feed the LIB rec.

## 7. Parser / Exporter Requirements

Update `task_editor/js/tsk_env_parser.js` so `parseTsk`, `parseCommandLine`, and `exportTsk` follow this contract.

Required parser support:

```text
IF / ELSE / ENDIF
LOOP / ENDLOOP
SWITCH / CASE / DEFAULT / ENDSWITCH
BREAK / CONTINUE
RETURN
REC with optional args and -> output
LIB REC with optional args and -> output
BLK with optional args and -> output
BAT/CMD/PS1/EXE with optional args and -> output
PAUSE seconds
$var = expression
;= disabled/comment
```

Do not export these in phase 1:

```text
RUN
SET
WHILE
old ->N branch syntax
.rec extension for rec calls
```

## 8. Editor Workflow Requirements

### 8.1 Tool Palette

Tool buttons should generate HR grammar templates:

```text
Variable: $A = 0
Math Add: $A = $B + 1
IF: IF $A = 1 / ENDIF
IF ELSE: IF $A = 1 / ELSE / ENDIF
LOOP: LOOP 5 / ENDLOOP
SWITCH: SWITCH $mode / CASE "case1" / DEFAULT / ENDSWITCH
Pause: PAUSE 2
Break: BREAK
Continue: CONTINUE
Return: RETURN $result
External: script.bat $A -> $ok
```

### 8.2 Explorer/File Clicks

File explorer insertion should generate:

```text
local .rec       -> RecName
library .rec     -> Module\RecName
.blk             -> name.blk
.bat/.cmd/.ps1/.exe -> file.ext
```

Advanced users may still type a full command line in the one-line insert modal.

### 8.3 Property Panel

Every block should expose a concise property panel:

```text
command line preview
input variables
output variable
rec/local variables if applicable
case labels if switch
loop count/expression if loop
condition if if
```

The command line preview should show exactly what will be exported to `.tsk` for that block or control structure.

## 9. Validation Before Export

The editor should block or warn on:

```text
unpaired IF / ELSE / ENDIF
unpaired LOOP / ENDLOOP
unpaired SWITCH / CASE / DEFAULT / ENDSWITCH
BREAK or CONTINUE outside LOOP
empty IF condition
empty LOOP count
empty SWITCH variable
external command without extension
local rec exported with .rec extension
unknown file extension treated as executable script
ambiguous execution wires
unreachable blocks after RETURN in same branch
missing output variable after ->
variable name not starting with $
```

## 10. Vibe Code Loop for Antigravity

Keep iterating until the editor passes the acceptance tests below.

Recommended loop:

```text
1. Read this guide and current task_editor source.
2. Patch parser/exporter to match HR grammar.
3. Patch palette/context menu templates to generate HR grammar.
4. Patch graph compiler so execution wires export structured IF/LOOP/SWITCH blocks.
5. Patch variable property handling so data wires and properties export `$vars` and `-> $out` correctly.
6. Run local browser/editor smoke test.
7. Export sample .tsk and .env.
8. Re-import exported files and confirm graph round trip.
9. Fix the first mismatch.
10. Repeat until all acceptance tests pass.
```

Do not stop at visual success. Success means exported files are correct and round-trip safely.

## 11. Acceptance Test Scripts

### 11.1 Basic Pipeline

Editor should export exactly this style:

```text
;= Basic pipeline
$patient = "Test Patient"
OpenPatient $patient -> $open_ok
IF $open_ok = "OK"
    ChartCheck
ELSE
    RETURN $open_ok
ENDIF
PAUSE 1
RETURN "DONE"
```

### 11.2 Loop With Break

```text
;= Loop test
$N = 5
LOOP $N
    CheckStatus -> $status
    IF $status = "OK"
        BREAK
    ENDIF
    NextPage
ENDLOOP
RETURN $status
```

### 11.3 Switch Case

```text
;= Switch test
SWITCH $mode
CASE "weekly"
    WeeklyNote
CASE "completeTx"
    CompleteTxNote
DEFAULT
    GeneralNote
ENDSWITCH
```

### 11.4 LIB REC and External Command

```text
;= LIB and external test
$patient = "P001"
MOSAIQ\OpenPatient $patient -> $ok
backup.bat $patient -> $backup_status
run.ps1 -Patient $patient -Status $backup_status -> $ps_status
RETURN $ps_status
```

### 11.5 ENV Export

For the above examples, exported env should include task-level pipeline variables:

```ini
[Global.Vars]
$patient=
$open_ok=
$N=5
$status=
$mode=
$ok=
$backup_status=
$ps_status=
```

Local rec variables should use:

```ini
[Vars.OpenPatient]
$run=1
$next=0
```

LIB rec variables should go to the LIB module env, not be mixed into the task env.

## 12. Runtime Boundary

Antigravity should not implement AutoIt runtime behavior in JavaScript.

The editor should only guarantee:

```text
valid graph
valid `.tsk` grammar
valid `.env` variables
safe round trip
clear block properties
```

Codex AutoIt runtime will implement:

```text
instruction pointer `ip`
block map
loop stack
runtime variable table
rec/blk/lib/external execution
pause/stop/debug handling
```

This boundary keeps the project practical and testable.

## 13. Initial Graph Creation From Existing HandyRecorder Tasks

In real use, the editor usually starts from an existing HandyRecorder task folder, not from a blank canvas.

Current HandyRecorder `.tsk` files are mostly serial lists with no explicit stream-control syntax. The editor must therefore auto-create an initial graph from a plain serial `.tsk`.

### 13.1 Open Existing Task Behavior

When the user opens an existing `<task>.tsk`:

```text
1. Read the `.tsk` line by line.
2. Parse each runnable line into a graph node.
3. Preserve disabled/comment lines as disabled/comment nodes.
4. Connect runnable nodes in original file order using hollow execution arrows.
5. Attach `<task>.env` variables to matching nodes when available.
6. Load local rec files from `micracts/`, blk files from `blk/`, and assets from `index/` / `export/`.
7. If a line is a LIB call such as `MOSAIQ\OpenPatient`, resolve it visually as a LIB REC node.
8. If a line cannot be classified, keep it as an unknown command node and warn instead of deleting it.
```

A plain serial task:

```text
OpenPatient
SelDI
ChartCheck
MakeNote
```

should become this graph:

```text
OpenPatient -> SelDI -> ChartCheck -> MakeNote
```

The first opened graph should match the user's current task order exactly. The editor must not reorder the task during initial import.

### 13.2 Initial Plot Rules

For imported serial tasks:

```text
node sequence = original line order
execution wire = line N to line N+1
layout = automatic readable staircase or vertical flow
comments/disabled lines = visible but disabled nodes
unknown lines = visible warning nodes
```

The user can then insert IF / LOOP / SWITCH blocks around existing nodes and reconnect arrows to make the task non-linear.

## 14. Nested Stream-Control Rules

The editor must support nested stream control, but nesting must be structural and deterministic.

The exported `.tsk` is the source of runtime truth, so every graphical nesting must compile to paired text blocks:

```text
IF ... ENDIF
LOOP ... ENDLOOP
SWITCH ... ENDSWITCH
```

### 14.1 Control Blocks Own Their Branches

IF, LOOP, and SWITCH are not ordinary single-step nodes. They are control structures that own one or more child branches.

Recommended internal graph model:

```text
IF node:
  condition
  trueBranch: node list
  falseBranch: node list
  next: node after ENDIF

LOOP node:
  countExpression
  body: node list
  next: node after ENDLOOP

SWITCH node:
  switchExpression
  cases:
    case label -> node list
  defaultBranch: node list
  next: node after ENDSWITCH
```

This prevents ambiguous wire loops and makes nested export possible.

### 14.2 Visual Nesting Rule

A node belongs to the nearest visible control container or branch that encloses it.

Examples:

```text
Top level
  IF block
    TRUE branch
      LOOP block
        body
    FALSE branch
  After IF
```

This exports as:

```text
IF $ok = "OK"
    LOOP 3
        SomeAction
    ENDLOOP
ELSE
    OtherAction
ENDIF
AfterIf
```

### 14.3 Importing Nested `.tsk`

When importing an already structured `.tsk`, the editor must use a stack parser.

Parser stack behavior:

```text
IF      -> push IF context
ELSE    -> switch current IF context from true branch to false branch
ENDIF   -> pop IF context
LOOP    -> push LOOP context
ENDLOOP -> pop LOOP context
SWITCH  -> push SWITCH context
CASE    -> create/switch current case branch
DEFAULT -> switch to default branch
ENDSWITCH -> pop SWITCH context
```

Any normal node is appended to the currently active branch on top of the stack. If the stack is empty, append to top level.

### 14.4 Exporting Nested Graphs

The exporter should recursively serialize graph structures.

Pseudo export:

```text
exportNodes(topLevel):
  for node in topLevel:
    if normal node:
      write node command line

    if IF node:
      write IF condition
      export trueBranch with indent + 1
      if falseBranch not empty:
        write ELSE
        export falseBranch with indent + 1
      write ENDIF

    if LOOP node:
      write LOOP countExpression
      export body with indent + 1
      write ENDLOOP

    if SWITCH node:
      write SWITCH expression
      for each case:
        write CASE label
        export caseBranch with indent + 1
      if defaultBranch not empty:
        write DEFAULT
        export defaultBranch with indent + 1
      write ENDSWITCH
```

Indentation is for readability only. AutoIt runtime will rely on keywords and the block map, not spaces.

### 14.5 Invalid Nesting Must Be Blocked

The editor should not export these invalid structures:

```text
ENDIF without IF
ELSE without IF
ENDLOOP without LOOP
CASE without SWITCH
DEFAULT without SWITCH
ENDSWITCH without SWITCH
BREAK outside LOOP
CONTINUE outside LOOP
execution wire that creates an uncontrolled cycle
node with multiple execution parents unless it is an intentional merge point after IF/SWITCH
```

### 14.6 Loops Should Not Be Backward Execution Wires

Do not represent loop repetition by drawing an execution wire from the end of the loop body back to the LOOP node.

Use a structured LOOP container/block instead:

```text
LOOP $N
  body nodes
DONE output -> next node
```

The backward jump is a runtime behavior generated by `LOOP/ENDLOOP`, not a raw graph wire.

### 14.7 First-Version Practical Scope

For the first runnable version, prioritize:

```text
1. Import serial `.tsk` into a correct initial graph.
2. Export the same serial graph without changing the task.
3. Allow wrapping selected serial nodes into IF / LOOP / SWITCH containers.
4. Export nested control structures as valid HR grammar.
5. Re-import the exported `.tsk` and recover the same nesting.
```

Data wires can help compose variables, but stream-control correctness comes first.

## 15. File Explorer Defaults and Recent Task Memory

The editor must support practical daily navigation. Users should not repeatedly browse from an unrelated folder.

### 15.1 Default LIB Explorer Root

The editor should know the HandyRecorder library root.

Resolution order:

```text
1. Read `LIB.ini` next to `HandyRecorder.exe` / `main.au3`.
2. Use `[Library] root=...` if present.
3. If `LIB.ini` does not exist, use default `LIB` folder beside HandyRecorder.
4. If the default `LIB` folder does not exist, show it as the intended root and let HandyRecorder/runtime create it when needed.
```

When the user opens the LIB explorer in the editor, the first browse destination should be this LIB root.

Example:

```text
HandyRecorder\LIB.ini

[Library]
root=Z:\phyzjqk\scripts\handyrecorder\LIB
```

LIB explorer should show modules under that root:

```text
LIB\
  MOSAIQ\
  PiPsPro\
  MIM\
```

Clicking a LIB rec should insert/export:

```text
MOSAIQ\OpenPatient
PiPsPro\ExportReport $case_id -> $report_path
```

Do not export the absolute LIB root into the `.tsk` command line. The `.tsk` should keep portable module calls. Absolute root stays in `LIB.ini` or editor settings.

### 15.2 Local Task Explorer Root

When opening a HandyRecorder task, the editor should use the selected task folder as the local explorer root.

For a task folder:

```text
chartcheck\
  chartcheck.tsk
  chartcheck.env
  micracts\
  blk\
  index\
  export\
```

Explorer behavior:

```text
local rec list starts from `micracts/`
local blk list starts from `blk/`
local index/export are asset references, not normal insert targets
```

### 15.3 Recent Task Files

The editor should remember recent `.tsk` files for quick reopening from the File menu.

Suggested recent item data:

```text
task name
tsk absolute path
task folder path
last opened time
optional last selected node id or sequence
```

The File menu should provide:

```text
Open Task...
Open Recent >
  chartcheck - Z:\...\chartcheck\chartcheck.tsk
  Weekly - Z:\...\Weekly\Weekly.tsk
  completeTx - Z:\...\completeTx\completeTx.tsk
Clear Recent
```

Recent task storage can be browser localStorage for the offline HTML editor, unless a later HandyRecorder launcher provides a stronger shared settings file.

### 15.4 Startup Behavior

When the editor opens:

```text
1. If launched from HandyRecorder with a task path, open that task immediately.
2. Else if recent tasks exist, show recent tasks in the File menu and start with the most recent task option visible.
3. Else show a blank/new graph with a clear Open Task action.
4. LIB explorer root should still be available from `LIB.ini` / default `LIB`.
```

This keeps the editor aligned with actual HandyRecorder use: open an existing task first, then add stream control and variable structure around it.

## 16. Mandatory Variable Claim Law

This is a hard compatibility rule for the editor.

Every variable used anywhere in exported HandyRecorder files must be claimed in an environment scope before runtime.

Data wires, property-panel variable fields, text editing, and automatic templates do not replace env claims. They only create variable usage. The editor must also create or update the matching env entry.

### 16.1 Why This Is Required

Current HandyRecorder does not run unknown variables dynamically.

Runtime flow:

```text
.env
  -> VarLoadEnv()
  -> gVarArray / gVarIndex
  -> VarCompileCommands()
  -> gCompiledLines[]
  -> Execute(compiled AutoIt function call)
```

If a rec or task command contains `$var` but `$var` is not claimed in env, the compiler cannot map it to a `gVarArray` row and runtime will fail or run the wrong raw value.

Example rec command:

```text
M_P1,$pos[1],$pos[2],L,1,,rem_click
```

Required env claim:

```ini
[Vars.OpenPatient]
$pos=500,300
```

Then HandyRecorder can compile it to an AutoIt-callable expression similar to:

```autoit
HR_RunMouseAction($gVarArray[row][2], $gVarArray[row][3], "L", 1)
```

### 16.2 Variables That Must Be Claimed

The editor must claim variables that appear in:

```text
rec command fields
local REC block inputs or outputs
LIB REC block inputs or outputs
BLK block inputs or outputs
external BAT/CMD/PS1/EXE arguments
external command `-> $output`
assignment lines such as `$A = $B + 1`
IF conditions
LOOP counts
SWITCH selectors
RETURN values
data-wire generated inputs/outputs
property-panel generated inputs/outputs
```

No `$variable` reference should be exported without a matching env claim.

### 16.3 Correct Claim Scope

Task/pipeline variables used in `.tsk` lines are claimed in the task env global scope.

Current HandyRecorder runtime scope:

```ini
[Vars.global]
$patient=
$status=
$ok=
```

Future normalized name may also support:

```ini
[Global.Vars]
```

But until runtime migration is finished, the editor must preserve compatibility with current HR behavior, especially `[Vars.global]`.

Local rec variables are claimed in the opened task env:

```ini
[Vars.OpenPatient]
$run=1
$next=0
$pos=500,300
$text=hello
```

LIB rec variables are claimed in the LIB module env, not mixed into the local task env:

```text
LIB\MOSAIQ\MOSAIQ.env
```

```ini
[Vars.OpenPatient]
$run=1
$next=0
$pos=500,300
```

A task may still claim global pipeline variables that feed a LIB rec call:

```ini
[Vars.global]
$patient=
$open_ok=
```

### 16.4 Editor Responsibilities

Before export/save, the editor must run a variable claim validation pass:

```text
1. Scan `.tsk` graph commands for every `$variable` usage.
2. Scan edited local rec commands for every `$variable` usage.
3. Scan edited LIB rec commands for every `$variable` usage.
4. Confirm each variable exists in the correct env scope.
5. Auto-create missing claims when safe.
6. Warn the user when a missing claim needs a default value or scope decision.
7. Block export if unresolved variables remain.
```

The editor should never silently export an unclaimed variable.

### 16.5 Current HR Variable Shape

Current HandyRecorder variable table supports simple values:

```text
scalar: one value
pair: value1,value2 used as $pos[1] and $pos[2]
```

Large 2D data should be represented as a file path variable rather than a large env array:

```ini
[Vars.global]
$patient_table=Z:\path\patients.csv
```

The editor may provide a visual 2D/table helper, but the exported runtime contract should remain simple unless the AutoIt interpreter is upgraded.

## 17. Current Draft Correction: LIB Variable Synchronization for Script Compose

> Draft status: this section records the current HandyRecorder decision as of the present discussion. It is not final law yet and may be adjusted after more testing and editor/runtime design review.

### 17.1 Main Decision

HandyRecorder still requires variables to be claimed before runtime can reliably build its variable table. For LIB calls, the LIB module env is treated as a template/source, while the active task env should contain the local runtime copy.

Example LIB call in `.tsk`:

```text
MOSAIQ\OpenPT
```

LIB default variable source:

```text
LIB\MOSAIQ\MOSAIQ.env
```

```ini
[Vars.OpenPT]
$run=1
$next=0
$pos=500,300
```

Task-local synchronized runtime copy:

```ini
[Vars.MOSAIQ\OpenPT]
$run=1
$next=0
$pos=500,300
```

The editor should understand this as synchronization/reclaim, not as blindly mixing all LIB variables into the task. Only variables for LIB modules actually used by the current task should be reclaimed.

### 17.2 Sync Timing

The editor/runtime should sync LIB variables as soon as practical:

```text
1. If user inserts a LIB rec from the HR/editor UI, sync that LIB rec vars immediately.
2. If user manually types a LIB call into the task editor, sync when the `.tsk` is saved/exported.
3. If task line is changed from local rec to LIB rec, sync after the task line is written.
4. When a task is opened/initialized, scan the active `.tsk` and sync all used LIB rec variables before building the runtime variable table.
```

The sync should import missing variables only. It should not overwrite task-local values already edited by the user.

### 17.3 Scope Rule for LIB Vars in Task Env

Inside the LIB module env, the scope is the rec name only:

```ini
[Vars.OpenPT]
```

Inside the local task env, the synchronized scope includes module and rec:

```ini
[Vars.MOSAIQ\OpenPT]
```

This prevents name collision when two LIB modules have the same rec name.

### 17.4 Editor Script Compose Requirements

When the visual editor composes or exports `.tsk`:

```text
Local rec call: OpenPT
LIB rec call: MOSAIQ\OpenPT
External file call: keep explicit extension/path as already defined
```

The editor should not export the absolute LIB root into the `.tsk`. The absolute LIB root belongs in `LIB.ini` or editor settings.

When the editor inserts a LIB rec block into the canvas or script, it should also ensure the synchronized `[Vars.MODULE\rec]` section exists in the active task env, copied from the LIB module env if available.

### 17.5 Edit/Save Safety Decision for LIB Calls

Normal edit/save of a LIB-called rec should not silently overwrite the shared LIB rec. Safer expected behavior:

```text
LIB call edited locally -> convert/copy to local task rec -> save local rec
Explicit Promote -> create new LIB version if same name exists
Explicit Overwrite -> overwrite LIB rec only after backup
```

This keeps shared LIB modules stable because other tasks may call the same LIB rec.

### 17.6 Current Limits

Current confirmed design covers scalar and pair variables used by rec commands.

2D/table variables are still draft. The current likely direction is a fixed buffer/register system for array/table values, but this is not final and should not be treated as editor completion law yet.

## 18. Draft Variable Creation Measures for the Visual Editor

> Draft status: this section is a working design for Antigravity Editor implementation. It describes what the editor should support now, and what should be prepared for future HandyRecorder runtime upgrades. It is not final law yet.

### 18.1 Main Rule

Every variable used by exported HR-readable script must have a claim in an env file before runtime.

The editor should help create variable claims in three ways:

```text
1. Auto-detect candidate variables from REC / BLK content.
2. Let user manually add variables from the variable panel.
3. Reclaim/sync variables from used LIB modules into the current task env.
```

The editor should never export a `$variable` reference that has no matching env claim.

### 18.2 Candidate Variables from REC

When editing or importing a `.rec`, the editor should scan command fields and offer practical variable candidates. These are candidates only; user decides which ones become variables.

Typical REC candidates:

```text
Mouse position: M_P1,500,300,L,...          -> $pos=500,300 or $click_pos=500,300
Mouse x only: field x                       -> scalar
Mouse y only: field y                       -> scalar
Delay: repeat/delay fields                  -> scalar
Keyboard key: K_B1,^c,...                   -> scalar/string
String input: S_S1,"text",...              -> scalar/string
Pause text / instruction: P_P1,"..."       -> scalar/string
Timer/wait value: T_...,seconds             -> scalar
Run control default: $run=1                 -> scalar
Next/fork control default: $next=0          -> scalar
```

Current HR pair variable convention uses one env line:

```ini
[Vars.OpenPT]
$pos=500,300
```

and the REC can use:

```text
M_P1,$pos[1],$pos[2],L,1,,rem_click
```

### 18.3 Candidate Variables from BLK

A `.blk` is closer to a mini task, so the editor should scan it like a script block, not just like a mouse recording.

Typical BLK candidates:

```text
Input values consumed by commands
Output values returned for later modules
Loop counters
Branch/condition values
File paths used by BAT / PS1 / EXE / table files
Array/table names passed into helper commands
```

For now, scalar and pair variables should be claimed in the active task env or synchronized LIB scope. Future array/table claims are draft and should be displayed separately from ordinary scalar vars.

### 18.4 Manual Variable Add

The editor should provide a variable panel for manual add/edit/delete. Minimum fields:

```text
Scope
Name
Type
Default value
Optional note/description
```

Scope choices should include:

```text
global                         task-wide scalar/pair variables
local rec scope                 e.g. [Vars.OpenPT]
LIB synchronized rec scope       e.g. [Vars.MOSAIQ\OpenPT]
BLK scope                       draft, for block-specific variables
FLW scope                       future, for flow-wide data exchange
```

The editor should write scalar/pair variables into env sections like:

```ini
[Vars.global]
$patient_id=12345

[Vars.OpenPT]
$pos=500,300

[Vars.MOSAIQ\OpenPT]
$pos=500,300
```

### 18.5 Variable Types

Current runtime-supported types:

```text
scalar: one value, string or number
pair: two values stored as value1,value2 and referenced as $name[1], $name[2]
```

Draft future types:

```text
array: 1D or 2D in-memory array using a runtime buffer/register system
table: file-backed data table, usually stored under task/table or another declared path
file: string path value used by BAT / PS1 / EXE / OCR / image modules
bool: scalar 0/1, mainly for IF / LOOP / SWITCH conditions
```

For now, bool and file can still be stored as scalar values in `[Vars.*]`.

### 18.6 Draft Array / Table Claim Direction

Array/table handling is not final. Current discussion direction:

```text
1. Scalar/pair variables stay in the existing HR variable table.
2. Array/table variables should use a separate array register.
3. HR may predeclare fixed buffers such as $buffer1 ... $buffer50 or more.
4. Array register maps logical variable names to buffer names.
5. If a table is file-backed, env claim stores the table file path or table identifier.
6. Runtime loads the table into an available buffer only when needed.
7. User/editor may need a release/clean command later to free buffer slots.
```

Possible draft register shape:

```text
Scope | variable name | type | buffer name | row count | column count | file path | using
```

Example draft claims, not final syntax:

```ini
[Tables.global]
$patients_table=table\patients.tsv

[Arrays.global]
$action_grid=2x3
```

The editor may prepare UI for array/table variables, but should mark them as draft until HR runtime support is implemented.

### 18.7 Variable Creation Workflow in Editor

Recommended editor behavior:

```text
1. User imports or opens existing task/rec/blk.
2. Editor scans all visible modules for literal values and existing $variable references.
3. Editor shows candidate variables beside the focused REC/BLK/module.
4. User selects candidates to promote into env claims.
5. User can manually add variables not found by scanning.
6. Editor validates all $variable references before export/save.
7. Missing variables block export unless user creates a claim or removes the reference.
```

For LIB modules:

```text
1. If user inserts MOSAIQ\OpenPT, editor/runtime syncs LIB\MOSAIQ\MOSAIQ.env [Vars.OpenPT].
2. Current task gets [Vars.MOSAIQ\OpenPT].
3. User edits task-local values there.
4. Editor does not overwrite local values during future sync unless user explicitly refreshes/reset from LIB.
```

### 18.8 Success Standard for This Part

Antigravity Editor variable work is considered successful when:

```text
1. Existing task opens and displays variables from env.
2. REC/BLK focused module shows candidate variables.
3. User can promote candidate values into env claims.
4. User can manually add scalar/pair/file/bool variables.
5. LIB rec insertion creates/syncs [Vars.MODULE\rec] in task env.
6. Exported `.tsk` and `.env` have no unresolved `$variable` references.
7. Array/table UI can exist as draft, but must not pretend runtime support is complete.
```
## 19. Binding Amendments - Must Override Earlier Draft Wording

This section is authoritative wherever an earlier section conflicts with it.

### 19.1 Upgrade the Existing Editor

Antigravity must develop from the current working Visual Task Editor source. This guide is an upgrade specification, not a replacement implementation.

Before changing code, run and inspect the current Editor and record its existing behavior. Preserve the current canvas/node model, serial .tsk import, task editor layout, right-click insertion workflow, REC/BLK explorer, task .env variable pane, save/reload behavior, selection, refresh behavior, file resolution, and graphical wires.

Do not rebuild the Editor from this document alone. Do not replace the current working Editor with a simplified prototype. Add capabilities incrementally and test existing behavior after every change.

### 19.2 Strict Interpreter Contract

Every exported .tsk line must be recognized by the HandyRecorder interpreter and translated into one executable HR action or one flow-control operation.

Unknown, malformed, or unsupported commands are fatal errors. The interpreter must stop and report the task file, line number, original line, and reason. It must never silently skip an unknown command.

The Editor may preserve an unrecognized line as an error node for repair, but it must block export/run until the line is valid.

### 19.3 Grammar Boundary

The user-facing language is the simple HandyRecorder grammar. Users should not need to write ordinary AutoIt code. AutoIt translation, runtime function calls, instruction pointer, control stack, and buffer allocation are implementation details.

No SET or RUN command is required. Assignment is written directly:

$A = 1
$A = $B + 1

A normal command line must translate to one HR runtime action. Structured flow control is interpreted by HR:

IF / ELSE / ENDIF
LOOP / ENDLOOP
SWITCH / CASE / DEFAULT / ENDSWITCH
BREAK / CONTINUE / RETURN

REC calls do not use .rec. BLK calls use .blk. External BAT/CMD/PS1/EXE commands retain their extensions.

### 19.4 Variable Claims and LIB Synchronization

Every variable reference must have an environment claim. This includes variables discovered in REC, BLK, LIB REC, LIB BLK, external commands, data wires, and manually typed expressions.

The library environment is the source/template. The active task environment is the synchronized local runtime claim table.

For this task line:

MOSAIQ\OpenPT

the expected relationship is:

source:  LIB\MOSAIQ\MOSAIQ.env [Vars.OpenPT]
runtime: <task>.env [Vars.MOSAIQ\OpenPT]

Synchronize missing claims immediately when a LIB entry is inserted, when a task is opened/switched, when a manually typed LIB line is saved, and when a local entry is promoted. Do not overwrite existing task-local values during synchronization.

Normal editing of a LIB call must not silently modify the shared LIB file. Use a local copy for ordinary editing. Explicit Promote creates a new version. Explicit Overwrite backs up the previous version before replacement.

### 19.5 Arrays and Tables

The Editor uses logical variables such as:

$pos[0]
$grid[1][2]
$patients_table

The Editor must not expose HR internal names such as $buffer1 in normal task grammar. HR may use a fixed buffer/register pool internally for arrays and tables, with metadata for scope, logical name, dimensions, source path, and occupied state.

A table may be file-backed under the task table folder or supplied by a producing BLK/external command. The logical table name travels through data wires; buffer assignment remains hidden runtime behavior.

### 19.6 Data and Execution Wires

A hollow arrow is an execution wire. It determines serial order, IF branches, LOOP body/done paths, and SWITCH case paths.

A data wire connects a named output to a named input. It must export ordinary variable references, never graph-only state or internal buffer names.

The selected canvas node is the insertion point. Right-click categories should provide Files, Flow Control, Variables, and Commands. The always-visible palette may contain common HR tools, but a tool must not insert without a selected insertion point.

### 19.7 Structured Nesting and Existing Serial Tasks

When an existing serial .tsk is opened, import every line in original order. Recognized lines become normal nodes; comments remain visible; unrecognized lines become repairable error nodes. Never delete or silently reorder content.

IF owns TRUE/FALSE branches. LOOP owns BODY/DONE. SWITCH owns CASE branches and optional DEFAULT. Nested controls are represented structurally and exported with paired keywords. A loop is not represented by a raw backward execution wire.

When a control block is inserted after node C, offer only continuous following nodes as candidates for each branch. External files may be inserted at the selected position through the explorer.

### 19.8 Image Search and OCR Extension Points

Image Search and OCR are future-capable Editor block types, not silently ignored commands.

Their first output contracts are:

image search -> coordinate, confidence, found/not-found
OCR          -> recognized text, confidence, status

They connect through normal data wires and logical variables. Their runtime implementation belongs to HandyRecorder/AIFlow and must be added before the blocks are marked runnable.

### 19.9 Completion Gate

The Editor is complete only when it preserves all baseline behavior and passes:

- serial task import/export;
- local REC, LIB REC, local BLK, LIB BLK, and external command insertion;
- variable candidate discovery and manual claims;
- LIB variable synchronization;
- IF, LOOP, SWITCH, BREAK, CONTINUE, and RETURN validation;
- nested export and re-import without structural loss;
- invalid-command rejection;
- unresolved-variable rejection;
- deterministic execution-wire validation;
- task-local and LIB explorer defaults;
- recent .tsk memory;
- save/reload and export/import round trips.

The vibe-code loop must repeat until these tests pass. Visual success alone is not completion.
