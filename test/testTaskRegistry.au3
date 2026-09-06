#include "..\config.au3"
#include "..\filehandler.au3"

Opt("MustDeclareVars", 1)

Global $gFailCount = 0
Global $gTestRoot = @ScriptDir & "\task_registry_tmp"
Global $gExeRoot = $gTestRoot & "\HRBin"
Global $gTaskRoot = $gTestRoot & "\TaskAlpha"
Global $gEmptyTaskRoot = $gTestRoot & "\TaskEmpty"

DirRemove($gTestRoot, 1)
DirCreate($gExeRoot)
DirCreate($gTaskRoot)

HR_InitRuntimePaths($gExeRoot, $gTaskRoot)
EnsureActionWorkspace()
InitConfig()

_AssertEqual($gExeDir, $gExeRoot, "exe dir is independent")
_AssertEqual($gFlowName, "HRBin", "flow name comes from exe folder")
_AssertEqual($gTaskRegistryFile, $gExeRoot & "\HRBin.tasks", "flow registry file name")
_AssertEqual($appPath, $gTaskRoot, "app path is task folder")
_AssertEqual($iniFile, $gTaskRoot & "\HandyRecorder.ini", "ini is task-local")
_AssertEqual($gFlowFile, $gTaskRoot & "\TaskAlpha.tsk", "tsk is task-local")
_AssertEqual($gEnvFile, $gTaskRoot & "\TaskAlpha.env", "env is task-local")
_AssertTrue(FileExists($gTaskRoot & "\micracts"), "task micracts exists")
_AssertTrue(FileExists($gTaskRoot & "\index"), "task index exists")
_AssertTrue(FileExists($gTaskRoot & "\export"), "task export exists")
_AssertTrue(FileExists($gTaskRoot & "\blk"), "task blk exists")
_AssertTrue(Not FileExists($gExeRoot & "\micracts"), "exe dir is not used as task dir")
_AssertTrue(FileExists($gExeRoot & "\HRBin.tasks"), "flow registry exists")
_AssertTrue(StringInStr(FileRead($gExeRoot & "\HRBin.tasks"), "TaskAlpha|" & $gTaskRoot) > 0, "flow registry contains task line")
_AssertTrue(StringInStr(FileRead($gExeRoot & "\HRBin.tasks"), ";= active|" & $gTaskRoot) > 0, "flow registry contains active task")
_AssertEqual(HR_TaskPathFromNewTaskChoice($gTestRoot & "\TaskBeta.tsk"), $gTestRoot & "\TaskBeta", "new task strips tsk extension")

DirCreate($gEmptyTaskRoot)
Local $emptyTsk = $gEmptyTaskRoot & "\TaskEmpty.tsk"
Local $hEmpty = FileOpen($emptyTsk, 2)
If $hEmpty <> -1 Then FileClose($hEmpty)

HR_InitRuntimePaths($gExeRoot, $gEmptyTaskRoot)
EnsureActionWorkspace()

_AssertTrue(FileExists($gEmptyTaskRoot & "\micracts"), "empty task micracts exists")
_AssertTrue(FileExists($gEmptyTaskRoot & "\index"), "empty task index exists")
_AssertTrue(FileExists($gEmptyTaskRoot & "\export"), "empty task export exists")
_AssertTrue(FileExists($gEmptyTaskRoot & "\blk"), "empty task blk exists")
_AssertEqual(FileGetSize($emptyTsk), 0, "empty task tsk remains empty")
_AssertTrue(Not FileExists($gEmptyTaskRoot & "\micracts\record1.rec"), "empty task does not seed record1")

If $gFailCount > 0 Then
    ConsoleWrite("FAIL task registry checks: " & $gFailCount & @CRLF)
    Exit 1
EndIf

ConsoleWrite("PASS task registry checks" & @CRLF)
Exit 0

Func _AssertEqual($actual, $expected, $label)
    If $actual = $expected Then Return
    ConsoleWrite("FAIL " & $label & ": expected=[" & $expected & "] actual=[" & $actual & "]" & @CRLF)
    $gFailCount += 1
EndFunc

Func _AssertTrue($condition, $label)
    If $condition Then Return
    ConsoleWrite("FAIL " & $label & @CRLF)
    $gFailCount += 1
EndFunc

Func Review_UpdateFromActive()
EndFunc

Func Review_SyncEditRem()
EndFunc
