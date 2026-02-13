$version = "16.3-1"
$url = "https://get.enterprisedb.com/postgresql/postgresql-$version-windows-x64-binaries.zip"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $scriptDir) { $scriptDir = $PSScriptRoot }
if (-not $scriptDir) { $scriptDir = Get-Location }

$dest = Join-Path $scriptDir "src-tauri\resources\postgres-binaries.zip"
$extractPath = Join-Path $scriptDir "src-tauri\resources\postgres-tmp"
$finalPath = Join-Path $scriptDir "src-tauri\resources\postgres\windows-x64"

$resourcesDir = Join-Path $scriptDir "src-tauri\resources"
if (-not (Test-Path $resourcesDir)) {
    New-Item -ItemType Directory -Path $resourcesDir -Force
}

function Download-WithRetry {
    param($url, $dest)
    if (Test-Path $dest) {
        Write-Host "Zip already exists at $dest, skipping download."
        return $true
    }
    Write-Host "Downloading from $url ..."
    
    curl.exe -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" -o $dest $url
    
    if ($LASTEXITCODE -eq 0 -and (Test-Path $dest) -and (Get-Item $dest).Length -gt 1MB) {
        return $true
    } else {
        Write-Host "Failed to download from $url (or file too small)."
        return $false
    }
}

$success = Download-WithRetry $url $dest
if (-not $success) {
    Write-Host "Trying 16.2-1..."
    $version = "16.2-1"
    $url = "https://get.enterprisedb.com/postgresql/postgresql-$version-windows-x64-binaries.zip"
    $success = Download-WithRetry $url $dest
}

if (-not $success) {
    Write-Host "ERROR: Failed to download PostgreSQL binaries."
    exit 1
}

Write-Host "Extracting..."
if (Test-Path $extractPath) { Remove-Item $extractPath -Recurse -Force }
New-Item -ItemType Directory -Path $extractPath -Force
Expand-Archive -Path $dest -DestinationPath $extractPath -Force

if (-not (Test-Path $finalPath)) {
    New-Item -ItemType Directory -Path $finalPath -Force
}

Write-Host "Moving binaries..."
$src = "$extractPath\pgsql"
if (-not (Test-Path $src)) {
    $src = $extractPath
}

# Use robocopy for more reliable moving/copying on Windows
robocopy $src $finalPath /E /MOVE /NFL /NDL /NJH /NJS /nc /ns /np

Write-Host "Pruning unnecessary files to reduce bundle size and WiX file count..."
$dirsToRemove = "doc", "include", "pgAdmin*", "StackBuilder", "symbols"
foreach ($dir in $dirsToRemove) {
    $targetDirs = Get-ChildItem -Path $finalPath -Filter $dir -Directory
    foreach ($targetDir in $targetDirs) {
        Write-Host "Removing $($targetDir.Name)..."
        Remove-Item -Path $targetDir.FullName -Recurse -Force
    }
}

$filesToRemove = "bin\stackbuilder.exe", "bin\isolationtester.exe", "bin\pg_isolation_regress.exe"
foreach ($file in $filesToRemove) {
    $targetFile = Join-Path $finalPath $file
    if (Test-Path $targetFile) {
        Remove-Item -Path $targetFile -Force
    }
}

Write-Host "Cleaning up..."
if (Test-Path $dest) { 
    Start-Sleep -Seconds 1
    Remove-Item -Path $dest -Force 
}
if (Test-Path $extractPath) { Remove-Item -Path $extractPath -Recurse -Force }

Write-Host "PostgreSQL bundled successfully!"
