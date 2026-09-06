#include <Array.au3>
#include <File.au3>
#include <FileConstants.au3>

; Test 1: scalar variable created by Assign().
Assign("s_A", "1s3,", 2)
Local $scalarFromEval = Eval("s_A")
MsgBox(0, "Assign scalar via Eval", "Eval('s_A') = " & $scalarFromEval)
Execute('MsgBox(0, "Assign scalar via Execute", "$s_A inside Execute = " & $s_A)')

; Test 2: 2D array variable created by Assign().
Local $buffer2D[2][3]
For $r = 0 To 1
    For $c = 0 To 2
        $buffer2D[$r][$c] = ($r + 1) * 10 + $c
    Next
Next
Assign("a_B", $buffer2D, 2)
Local $arrayFromEval = Eval("a_B")
If IsArray($arrayFromEval) Then
    _ArrayDisplay($arrayFromEval, "Assign 2D array via Eval: $a_B")
Else
    MsgBox(0, "Assign 2D array", "Eval('a_B') is not an array")
EndIf
Execute('_ArrayDisplay($a_B, "Assign 2D array via Execute: $a_B")')

; Test 3: file-backed 1D array variable created by Assign().
Local $txtPath = @ScriptDir & "\assign_array_test_input.txt"
Local $h = FileOpen($txtPath, $FO_OVERWRITE)
FileWriteLine($h, "line one")
FileWriteLine($h, "line two")
FileWriteLine($h, "line three")
FileClose($h)

Local $fileBuffer
_FileReadToArray($txtPath, $fileBuffer, $FRTA_NOCOUNT)
Assign("t_C", $fileBuffer, 2)
Local $fileArrayFromEval = Eval("t_C")
If IsArray($fileArrayFromEval) Then
    _ArrayDisplay($fileArrayFromEval, "Assign 1D file array via Eval: $t_C")
Else
    MsgBox(0, "Assign 1D file array", "Eval('t_C') is not an array")
EndIf
Execute('_ArrayDisplay($t_C, "Assign 1D file array via Execute: $t_C")')

MsgBox(0, "Assign test done", "All Assign tests reached the final message.")
