$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $PSScriptRoot "HRMatchDLL.cpp"
$def = Join-Path $PSScriptRoot "HRMatchDLL.def"
$out = Join-Path $root "HRMatchDLL.dll"
$imp = Join-Path $root "HRMatchDLL.lib"

$compiler = Get-Command i686-w64-mingw32-g++ -ErrorAction SilentlyContinue
if (-not $compiler) {
    $searchRoots = @(
        "$env:LOCALAPPDATA\Microsoft\WinGet\Packages",
        "$env:ProgramFiles",
        "${env:ProgramFiles(x86)}",
        "C:\"
    )
    foreach ($r in $searchRoots) {
        if (-not $r -or -not (Test-Path $r)) { continue }
        $found = Get-ChildItem $r -Recurse -Filter i686-w64-mingw32-g++.exe -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $compiler = $found
            break
        }
    }
}

if (-not $compiler) {
    throw "Could not find i686-w64-mingw32-g++. Install LLVM-MinGW or put it on PATH."
}

$compilerPath = if ($compiler.Source) { $compiler.Source } else { $compiler.FullName }
$args = @(
    "-O2",
    "-shared",
    "-static-libgcc",
    "-static-libstdc++",
    "-o", $out,
    $src,
    $def,
    "-lole32",
    "-lwindowscodecs",
    "-lgdi32",
    "-luser32",
    "-Wl,--out-implib,$imp"
)

& $compilerPath @args

if ($LASTEXITCODE -ne 0) {
    throw "DLL build failed with exit code $LASTEXITCODE"
}

Get-Item $out
