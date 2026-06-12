@echo off
title Echo Build - Windows One-Click
cd /d "%~dp0"

echo ============================================
echo  Echo v0.1.0 - One-Click Windows Build
echo ============================================
echo.

:: Step 1: MSVC
echo [1/4] Initializing MSVC x64 environment...
call "D:\AppGallery\Software\VisualStudio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if %errorlevel% neq 0 ( echo [ERROR] MSVC init failed! & pause & exit /b 1 )
echo [OK]
echo.

:: Step 2: Environment
set HTTP_PROXY=http://127.0.0.1:7897
set HTTPS_PROXY=http://127.0.0.1:7897
set LIBCLANG_PATH=D:\Tools\LLVM\bin
set PATH=D:\AppGallery\Software\Bun\bin;D:\AppGallery\Software\Rust\.cargo\bin;D:\Tools\LLVM\bin;D:\Tools\CMake\bin;%PATH%
echo [2/4] Proxy + Bun/Rust/LLVM/CMake PATH set
echo.

:: Step 3: Build installer via standard Tauri pipeline
echo [3/4] Running bun tauri build...
bun tauri build
set BUILD_EXIT=%errorlevel%

echo.
if %BUILD_EXIT% equ 0 (
    echo ============================================
    echo  [OK] Build complete!
    echo ============================================
    for %%I in ("src-tauri\target\release\echo.exe") do echo  Binary: %%~zI bytes
    echo  Installer:
    dir /s /b "src-tauri\target\release\bundle\nsis\*.exe" 2>nul
) else (
    echo ============================================
    echo  [FAIL] Build failed
    echo ============================================
    exit /b %BUILD_EXIT%
)
echo.
echo [4/4] Done
pause
