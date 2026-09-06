# HandyRecorder Current Handoff

Date: 2026-08-25

This is the practical handoff for the current `Z:\phyzjqk\scripts\handyrecorder` workspace. It supersedes the older reconstruction brief in `Agents.md` for live behavior, and should be read together with `HANDYRECORDER_COMPONENT_SPEC.md`, `HISTORY.md`, and `HANDOFF.md`.

## Where We Are

HandyRecorder is no longer only the original compact five-file recorder. It is now a desktop automation component intended to plug into AIFlow.

The active source still centers on `main.au3`, `config.au3`, `filehandler.au3`, `recorder.au3`, and `runner.au3`. There is also `runner_ExecuteCommand.au3`, which looks like an older/reference dispatcher and contains a duplicate `ExecuteCommand` function name.

The active binary appears to be `HR.exe`, last modified 2026-07-02, matching the source timestamps around the same date. The folder also contains many checkpoint EXEs through `HR_v1_98.exe`, so the live code is newer than the v1.80 wording in older docs.

## What We Have

- Config bootstrap and repair through `HandyRecorder.ini`.
- Runtime path setup for executable folder, task registry, active task folder, and task-local rec/block/env/index/export paths.
- Task registry file support through `<flow>.tasks`.
- Active task switching from UI.
- `.tsk` task editor with line edit, move, delete, block, fork, and rec/block browser insertion.
- Local `micracts`, `blk`, `index`, and `export` folders.
- `.env` loading and display in the task editor.
- First substantial variable-system code: env parsing, default generation, command-field promotion, and compile paths for anchor, MSP, MSM, drag, mouse, mouse move, keyboard, string, wheel, pause, and delay commands.
- Command array editing with active index sync.
- Record file list refresh, selection, duplication, creation, fork insertion, and flow list updates.
- Save pipeline with command compression, ID renumbering, resolution comment handling, and reload.
- Recording hooks/polling for mouse, wheel, keyboard, drag, string, pause, offset, manual focus, tooltip, and screenshot crops.
- Playback engine for task runs, single record runs, active command runs, numbered record hotkeys, compiled variable commands, manual focus handling, pause/continue, reanchor, and safe sleep.
- Review companion window for screenshots, crop rectangles, screen recrop, rem-label sync, and offset command lookup.
- Help popup and status/blink UI helpers.

## What We Do Not Have Yet

- A frozen AIFlow component release. The source is active and has many checkpoint binaries.
- Fully proven variable behavior across all command families and task-run paths.
- Final variable UI polish and insertion workflow from the variable popup/pane.
- Mature conditional/fork semantics driven by variables. Branch execution still appears simple and should be treated cautiously.
- Image search integration.
- OCR integration.
- A clean compile/test automation script documented as the one true build path.
- A current manual QA checklist for v1.98-era behavior.
- A fully updated top-level spec that reflects all variable-system work already present in code.

## Likely Bugs / Risk Areas

- Documentation drift: `HANDYRECORDER_COMPONENT_SPEC.md` says v1.80 before variables, but the source already contains many variable functions and v1.91-v1.98 binaries.
- Build drift: active `HR.exe` timestamp matches `HR_v1_93.exe`, while newer checkpoint binaries `HR_v1_97.exe` and `HR_v1_98.exe` exist. Verify which binary users are actually running.
- NAS locking: rebuilding over a running EXE can silently leave the old binary in place.
- Variable compilation needs end-to-end testing for every command family and for both active-command and task-run paths.
- Branch/fork execution should be audited before AIFlow depends on it for real decisions.
- Offset/reanchor logic is mid-evolution and has several separate code paths: recorder offset, runner reanchor, review offset crop lookup.
- Manual focus pause has several recovery paths and previous bugfix backups, so regressions are possible around empty recs, end-of-file, visible-next selection, and pause continuation.
- Task editor browser insertion must preserve selected task line edits and not overwrite them when rec/blk panes are clicked.
- Resolution comments/checks can block playback unless `SkipRes` behavior is correct for the session.
- `runner_ExecuteCommand.au3` contains another `ExecuteCommand` definition and should not be included together with `runner.au3` unless intentionally refactored.

## Function Inventory Summary

### `config.au3`

- Runtime/task path functions: `HR_InitRuntimePaths`, `HR_ClearActiveTask`, `HR_SetActiveTask`, `HR_NormalizePath`, `HR_TaskNameFromPath`, `HR_UniqueChildPath`, `_HR_CommandLineTaskPath`, `_HR_LooksLikeTaskFolder`, `_HR_CleanTaskName`.
- Task registry functions: `HR_SetTaskRegistryFile`, `HR_TaskRegistryPath`, `HR_TaskRegistryActivePath`, `HR_RegisterTaskPath`, `HR_TaskRegistryLoad`, `HR_TaskPathFromNewTaskChoice`, `_HR_TaskRegistryRead`, `_HR_TaskRegistryWrite`, `_HR_MigrateOldTaskRegistry`.
- INI/config functions: `InitConfig`, `CreateDefaultIni`, `EnsureDefaultIniValues`, `_IniEnsure`, `_IniMigrateDefault`, `CfgRead`, `CfgReadMultiline`, `_DefaultHelpText`, `SaveAppConfig`, `_CreateDefaultRecord`.
- Run/debug functions: `HR_NormalizeRunMode`, `HR_RunModeDisplay`, `HR_NextRunMode`, `HR_CurrentRunMode`, `HR_DebugMode`.

### `filehandler.au3`

- Workspace/env functions: `EnsureActionWorkspace`, `_EnsureActionEnv`, `_MigrateRootRecordsToMicracts`, `_EnsureActionFlow`, `_NormalizeActionFlowExtensions`, `RecordPath`.
- Variable load/storage functions: `VarLoadEnv`, `VarUnquote`, `VarAdd`, `VarFindIndexedRow`, `VarFindRowForCompile`, `VarGetValue`, `VarEnvHasSection`, `VarEnvSectionHasName`, `VarEnvAppendToSection`, `VarEnvAddVariable`, `VarEnvValueText`, `VarEnvQuoteIfNeeded`.
- Variable compile functions: `VarCompileCommands`, `VarCompileLine`, `_CompileAnchorLine`, `_CompileMspLine`, `_CompileMsmLine`, `_CompileDragLine`, `_CompileMouseLine`, `_CompileMouseMoveLine`, `_CompileKeyLine`, `_CompileStringLine`, `_CompileWheelLine`, `_CompilePauseLine`, `_CompileDelayLine`, `VarCompileField`, `VarCompositeExpression`, `VarFieldExpression`, `VarNumericLiteral`, `VarCodeQuote`, `VarCommandLineEnabled`, `VarRecordFlag`, `VarDebugShowCompiled`, `VarEnsureAllRecordDefaults`, `VarEnsureRecordDefaults`.
- Task parsing/run-list functions: `TaskStripMissingMarker`, `TaskTrimRight`, `TaskIndentLevel`, `TaskWithoutIndent`, `TaskIsBranchLine`, `TaskBranchNumber`, `TaskBranchRecordName`, `TaskLinePayload`, `TaskRecordNameFromLine`, `TaskDisplayLine`, `TaskRecordExists`, `TaskMarkMissingRecords`, `TaskLineWithoutMissingMarker`, `TaskMissingLine`, `TaskDisplayNameForRecord`, `RecordNameFromDisplay`, `TaskRepeatTabs`, `TaskBranchLine`, `TaskReplaceRecordNameInLine`, `_FlowEntryForRecord`, `TaskReadLines`, `TaskWriteLines`, `TaskBlockPath`, `TaskCleanBlockName`, `TaskIsExternalFileLine`, `TaskExternalFilePath`, `TaskIsBlockLine`, `TaskBlockNameFromLine`, `TaskBuildRunList`, `TaskExpandFile`.
- Flow/record list functions: `_LoadFlowNames`, `_FileNameArrayContains`, `_FlowContainsName`, `_FlowRecordNameFromLine`, `_AppendFlowName`, `_InsertFlowNameAfter`, `InsertFlowNameAfter`, `_UpdateFlowName`, `_BuildRecordFileList`, `_SortRecordFileNames`, `RefreshFiles`, `RefreshFilesWithExtra`, `GetStartupRecordName`, `SelectRecordByName`, `_FindRecordIndex`, `_FindRecordDisplayIndex`, `SelectRecordLineByIndex`, `SelectPreviousRecordFile`, `SelectNextRecordFile`, `SelectFirstRecordByPrefix`, `SelectRecordByListPosition`, `SelectFirstRecordFile`, `SelectNextRecordForRun`.
- Command/save/edit functions: `LoadCommands`, `LoadCommandsFromArray`, `_RenderCommands`, `UpdateActiveIndexOnly`, `_FindActiveIndex`, `_SyncActiveFromUI`, `_PruneEmptyCommandLines`, `CreateNewRecord`, `CreateRecordBuffer`, `CreateRecordBufferNoFlow`, `CreateForkFromActiveRecord`, `TaskInsertForkBranch`, `TaskCreateFirstForkBranch`, `TaskAppendForkBranch`, `TaskArrayAppend`, `_CreateInitialRecordFile`, `DuplicateActiveRecord`, `_UniqueCopyRecordName`, `_CleanRecordName`, `_UniqueRecordName`, `_PipeListContains`, `_ResolutionCommentLine`, `_IsResolutionComment`, `_EnsureResolutionComment`, `CompressCommands`, `_CommandPartValue`, `_CommandRepeatValue`, `_CommandRemTail`, `_MaskPrintableKeyRunsEnabled`, `_KeyLineGapWithinLimit`, `_IsPrintableKeyLine`, `_IsPrintableKeyValue`, `_BuildMaskedStringRem`, `_PrintableKeyToRemText`, `RenumberCommandIds`, `_IsMspBaseCommand`, `_CommandName`, `_CommandIdFamily`, `_ReplaceCommandName`, `SaveCurrentData`, `SaveCurrentDataNoFlow`, `InsertAfterSelected`, `DeleteSelectedCommand`, `DeleteSelectedCommandForRecord`, `MoveActiveLineUp`, `MoveActiveLineDown`, `SelectPreviousCommand`, `SelectNextCommand`, `AppendCommand`, `AppendCommandToEnd`, `_RecordInsertBaseIndex`, `_IsCommentLine`, `InsertPatchLinesAfter`, `RecordInsertAfterActive`, `ReloadRecordList`.

### `main.au3`

- Main UI/hotkey functions: `SyncSelectedRecordDisplay`, `HR_EnableDpiAwareness`, `RegisterAppHotkeys`, `StopOrOff`, `StopRecordOnly`, `_RegisterHotkey`, `_ClearRegisteredHotkeys`, `CycleRunMode`, `ReloadConfigAndRecordList`.
- Task registry/editor functions: `TaskRegistry_Open`, `TaskRegistry_Close`, `TaskRegistry_LoadTasksFile`, `TaskRegistry_AddExisting`, `TaskRegistry_CreateNew`, `TaskRegistry_CreateEmptyTask`, `TaskRegistry_RefreshCombo`, `TaskRegistry_SwitchSelected`, `TaskRegistry_SwitchToPath`, `TaskRegistry_UpdateTitle`, `TaskEditor_Toggle`, `TaskEditor_Open`, `TaskEditor_Close`, `TaskEditor_Load`, `TaskEditor_LoadSelectedLine`, `TaskEditor_SyncLineEdit`, `TaskEditor_SelectedRange`, `TaskEditor_SelectRange`, `TaskEditor_MoveSelected`, `TaskEditor_AskBlockName`, `TaskEditor_ForkSelected`, `TaskEditor_BlockSelected`, `TaskEditor_LoadVariables`, `TaskEditor_RefreshSidePanels`, `TaskEditor_LoadBrowsers`, `TaskEditor_LoadBrowserList`, `TaskEditor_ChooseBrowserFolder`, `TaskEditor_LoadBrowserSelection`, `TaskEditor_InsertBrowserSelection`, `TaskEditor_SelectedBrowserEntry`, `_TaskBrowserBaseName`, `TaskEditor_InsertLineAfterSelection`, `TaskEditor_DeleteSelected`.
- Status/help functions: `UpdateBlinkUI`, `_ResetBlinkUI`, `_UpdateBlinkControls`, `_BlinkSetStatusText`, `_BlinkSetStatusColor`, `_BlinkSetCommandColor`, `BlinkActiveRunCommand`, `_BlinkSetStartText`, `_BlinkSetRecText`, `HR_WM_NCHITTEST`, `HR_ToggleHelp`, `HR_ShowHelp`, `HR_HideHelp`.
- Review functions: `Review_Init`, `Review_Toggle`, `Review_UpdateFromActive`, `Review_ShowLatestIndex`, `Review_ShowTextOnly`, `Review_ShowFile`, `Review_Close`, `Review_Poll`, `Review_Clamp`, `Review_ZoomRatio`, `Review_DisplayToImageX`, `Review_DisplayToImageY`, `Review_TargetPos`, `Review_AttachToMain`, `Review_SyncEditRem`, `Review_SyncZoomSlider`, `Review_ApplyZoomLayout`, `Review_SetRect`, `Review_RenderImage`, `Review_RenderOverlay`, `Review_DrawDashedRect`, `Review_CommitCrop`, `Review_RecropFromCommandAnchor`, `Review_ApplyScreenRecrop`, `Review_LoadScreenRectFromLine`, `Review_UpdateActiveRemAfterCrop`, `Review_CommandMousePoint`, `Review_OffsetBaseForCurrentLine`, `Review_OffsetGroupNumber`, `Review_OffsetStepNumber`, `Review_CommandCanRecrop`, `Review_CropTokenIndex`, `Review_XYTokenIndex`, `Review_BaseLabelPartCount`, `Review_IsIntegerToken`, `Review_IdxLabelFromRem`, `Review_ReplaceIdxLabelInCommand`, `Review_FileFromCommand`, `Review_RemFromCommand`, `Review_ReplaceRemInCommand`, `Review_RemFieldIndex`, `Review_NormalizeRemText`, `_MouseInsideReviewWindow`.
- Variable popup/UI functions: `VarOpenPopup`, `VarCandidateSetValueFromText`, `_VarCandV2Text`, `VarCandidateIndexFromList`, `VarShortTypeLabel`, `VarPauseInstructionDefault`, `VarPauseRemBody`, `VarPauseValueToRem`, `VarBuildCandidates`, `VarAddPairFieldCandidate`, `VarAddCandidate`, `VarPromoteCandidate`, `VarSetCommandField`, `VarCommandPreRemCount`.

### `recorder.au3`

- Hook/key functions: `_InitWheelHook`, `_MouseHookProc`, `_AddKey`, `_InitKeyWatch`, `_ResetKeyStates`.
- Recording lifecycle functions: `ToggleRecord`, `CreateNewRecordAndStartRecording`, `SaveRecordButtonAction`, `_BeginPatchRecordBuffer`, `_PatchRecordNameFromPath`, `_BeginManualFlowPatchRecordBuffer`, `_CreatePatchNewRecordBuffer`, `_FinishPatchRecordBuffer`, `PollRecorder`.
- Mouse/key/string recording functions: `PollMouse`, `PollKeys`, `_RecordButtonKey`, `_FormatSeconds`, `_BufferStringKey`, `_CanBufferStringKey`, `_BuildAutoItKey`, `_IsRecorderControlKey`, `_MatchesConfiguredHotkey`, `_RecordMouseDrag`, `RecordMouseMoveHotkey`, `ToggleOffsetMouseMarkerHotkey`, `_RecordAnchorRegionCommand`, `_RecordMouseClick`, `_RecordMouseDown`, `_UpdateMouseDownDelay`, `_RecordMouseUp`, `_RecordWheel`, `_TryMergeWheel`, `ToggleStringRecord`, `_CommitStringMode`, `TogglePauseRecord`, `_RecorderSetFocusPauseLine`, `RecordManualFocusResume`, `RecordManualFocusTick`, `_RecorderAppendManualFocusRem`, `_UpdatePauseDelayFromRecordTimer`, `_RecorderSetCsvField`, `ToggleOffsetMode`.
- Autocomment/tooltip/crop functions: `_AutoCommentEnabled`, `_GetCurrentRecordBaseName`, `_ApplyAutoCommentToActiveMouseLine`, `_ApplyAutoCommentToActiveMouseLineRegion`, `_ApplyAutoCommentToActiveDragLine`, `_BuildIndexCropLabel`, `ToggleTooltipDisplay`, `_UpdateRecorderTooltip`, `_HideRecorderTooltip`, `_ClearTooltipOneShot`, `_ClearTooltipOneShotAfterAction`, `_GetMouseCropRect`, `_GetDragCropRect`, `_CaptureCropRect`, `_ReplaceRemField`, `_CaptureMouseCrop`, `_MouseInsideRecorderUI`, `_MouseInsideWindow`.

### `runner.au3`

- Run lifecycle functions: `ToggleRun`, `StartRun`, `StopRun`, `TogglePlaybackPause`, `PauseRunningFlow`, `ContinuePausedRun`, `RunNextCommand`, `_AdvanceRunTarget`, `_ResetRunFileState`, `SafeSleep`.
- Manual flow/focus functions: `ManualFocusResume`, `RunActiveCommand`, `RunActiveCommandAndNext`, `StartManualFlowStep`, `_FindNextRunnableDisplayIndex`, `_StopManualFlowAfterStep`, `_ManualFlowSelectNextVisibleRecord`, `_ManualFlowContinueFromPause`, `ManualFocusTick`, `ReloadPausedRunAfterRecord`.
- Task/record selection functions: `_ValidateCurrentFileResolution`, `_ValidateRunResolution`, `_SkipResolutionCheck`, `_ShowResolutionMismatch`, `_SelectTaskRunEntry`, `_SelectNextTaskRunRecord`, `_RestartTaskRunRecords`, `RunSelectedRecordFile`, `_RunRecordFileByNumber`, `RunRecordFile1` through `RunRecordFile0`.
- Offset/reanchor functions: `_OffsetReanchorEnabled`, `_IsOffsetStartComment`, `_WaitForOffsetReanchor`, `HR_RunMSP`, `HR_RunMSM`, `_MspStepNumber`.
- Command execution functions: `ExecuteCompiledCommand`, `ExecuteCompiledText`, `HR_RunAnchor`, `HR_RunDrag`, `HR_RunMouseAction`, `HR_RunMouseDown`, `HR_RunMouseUp`, `HR_RunMouseMove`, `HR_RunSend`, `HR_RunWheel`, `HR_RunPause`, `HR_RunDelay`, `ExecuteCommand`, `_GetRepeat`, `_GetDelayMs`, `_CsvField`, `_DoMouseAction`, `_MouseButtonName`.
- Pause/status label functions: `_PauseWait`, `PauseContinueStatusText`, `FocusPauseStatusText`, `_FocusPauseModifierSetting`, `_FocusPauseModifierCode`, `_FocusPauseModifierDown`, `_FocusPauseClickLabel`, `_PauseCurrentCommandAngleLabel`, `_PauseCurrentCommandLabel`, `_PauseNextCommandLabel`, `_NextExecutableRunLine`, `_FirstCommandLabelFromRecord`, `_CommandAngleLabel`, `_CommandAngleLabelByIndex`, `_PauseRemText`, `PauseNeedsManualFocusWarning`, `_PausedAtIndefinitePauseCommand`, `_PausedLineHasManualFocus`, `_MarkPausedLineManualFocus`, `_IsFocusPauseLine`, `_SetFocusPauseLine`, `_AppendManualFocusRem`, `_WriteRunLinesToCurrentFile`.

### `runner_ExecuteCommand.au3`

- `ExecuteCommand($line)`: older or standalone command dispatcher. Do not include it with `runner.au3` unless the duplicate function name is deliberately resolved.

## Recommended Next Work

1. Decide the true active version: `HR.exe`, `HR_v1_93.exe`, `HR_v1_97.exe`, or `HR_v1_98.exe`.
2. Update `HANDYRECORDER_COMPONENT_SPEC.md` to reflect the variable functions already present.
3. Build a small manual regression checklist for create/switch task, create rec, record click/key/wheel/string/drag/pause, autocomment/review recrop, save/compress/reload, active command run, selected rec run, task run, pause/manual focus/patch record, and variable compile execution.
4. Test variable compile with each command family before calling the Variable System complete.
5. Audit `runner_ExecuteCommand.au3` inclusion and remove/rename it if it can accidentally collide.
6. Freeze a clean handoff release before reopening OCR or image search.
