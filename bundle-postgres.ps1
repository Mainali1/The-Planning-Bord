$version = "16.3-1"
$url = "https://get.enterprisedb.com/postgresql/postgresql-$version-windows-x64-binaries.zip"
$dest = "D:\Projects\The-Planning-Bord\src-tauri\resources\postgres-binaries.zip"
$extractPath = "D:\Projects\The-Planning-Bord\src-tauri\resources\postgres-tmp"
$finalPath = "D:\Projects\The-Planning-Bord\src-tauri\resources\postgres\windows-x64"

if (-not (Test-Path "D:\Projects\The-Planning-Bord\src-tauri\resources")) {
    New-Item -ItemType Directory -Path "D:\Projects\The-Planning-Bord\src-tauri\resources" -Force
}

function Download-WithRetry {
    param($url, $dest)
    Write-Host "Downloading from $url ..."
    if (Test-Path $dest) { Remove-Item $dest -Force }
    
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

Write-Host "Cleaning up..."
if (Test-Path $dest) { 
    Start-Sleep -Seconds 1
    Remove-Item -Path $dest -Force 
}
if (Test-Path $extractPath) { Remove-Item -Path $extractPath -Recurse -Force }

Write-Host "PostgreSQL bundled successfully!"
