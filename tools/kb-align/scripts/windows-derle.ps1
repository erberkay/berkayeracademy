# Windows: VST3 + CLAP derlemesi → dist/KB-Align-<sürüm>-windows.zip (imzasız; VST3 klasörü elle kopyalanır)
# Gerekenler: Visual Studio 2022 (C++ masaüstü), CMake, Git, Python 3 (numpy scipy soundfile)
# Kullanım (PowerShell, tools\kb-align içinden):  .\scripts\windows-derle.ps1 -Deps $HOME\kbdeps
param([string]$Deps = "$HOME\kbdeps")
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
if (-not (Test-Path "$Deps\juce")) {
  git clone --depth 1 --branch 9.0.6 https://github.com/juce-framework/JUCE.git "$Deps\juce"
  git clone --recurse-submodules https://github.com/free-audio/clap-juce-extensions.git "$Deps\clap-juce-extensions"
  git -C "$Deps\clap-juce-extensions" checkout 3837f4a6ed2ab0ba46aba69ae5b7041c7c64ce74
}
$ver = (Select-String -Path plugin\CMakeLists.txt -Pattern 'project\(KBAlign VERSION ([0-9.]+)').Matches[0].Groups[1].Value
cmake -S plugin -B plugin\build-win -G "Visual Studio 17 2022" -A x64 -DKB_DEPS_DIR="$Deps"
cmake --build plugin\build-win --config Release --target KBAlign_VST3 KBAlign_CLAP kb_tests
Push-Location prototype; python -I export_parity.py | Out-Null; Pop-Location
& plugin\build-win\Release\kb_tests.exe plugin\tests\parity | Select-Object -Last 1
$art = "plugin\build-win\KBAlign_artefacts\Release"
$st = "dist\win\KB-Align-$ver"
Remove-Item -Recurse -Force $st -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $st | Out-Null
Copy-Item -Recurse "$art\VST3\KB-Align.vst3" $st
Copy-Item "$art\CLAP\KB-Align.clap" $st
Copy-Item LICENSE $st
Copy-Item scripts\KURULUM-windows.txt "$st\KURULUM.txt"
Compress-Archive -Force -Path "$st\*" -DestinationPath "dist\KB-Align-$ver-windows.zip"
Get-FileHash "dist\KB-Align-$ver-windows.zip" -Algorithm SHA256
