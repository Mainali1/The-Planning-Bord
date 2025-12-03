# Move remaining configuration files to build folder
Write-Host "Moving remaining configuration files to build folder..." -ForegroundColor Yellow

# Move package-lock.json to build folder
if (Test-Path "package-lock.json") {
    Move-Item -Path "package-lock.json" -Destination "build\package-lock.json" -Force
    Write-Host "Moved package-lock.json to build folder" -ForegroundColor Green
}

# Move commitlint config to build folder
if (Test-Path "commitlint.config.js") {
    Move-Item -Path "commitlint.config.js" -Destination "build\commitlint.config.js" -Force
    Write-Host "Moved commitlint.config.js to build folder" -ForegroundColor Green
}

# Move huskyrc to build folder
if (Test-Path ".huskyrc.json") {
    Move-Item -Path ".huskyrc.json" -Destination "build\.huskyrc.json" -Force
    Write-Host "Moved .huskyrc.json to build folder" -ForegroundColor Green
}

# Move lintstagedrc to build folder
if (Test-Path ".lintstagedrc.json") {
    Move-Item -Path ".lintstagedrc.json" -Destination "build\.lintstagedrc.json" -Force
    Write-Host "Moved .lintstagedrc.json to build folder" -ForegroundColor Green
}

# Update build README
$buildReadme = @"
# Build Configuration Files

This folder contains build and configuration files that are not required for the main application functionality.

## Docker Compose Files
docker-compose.yml - Main application stack
docker-compose.redis.yml - Redis-only configuration

## Redis Configuration
redis.conf - Redis server configuration

## Ecosystem Configuration
ecosystem.config.js - PM2 process manager configuration

## Package Lock Files
package-lock.json - Root package lock file

## Test Files
test-queue.js - Queue testing utilities

## Code Quality Configuration
commitlint.config.js - Commit message linting rules
.huskyrc.json - Husky git hooks configuration
.lintstagedrc.json - Lint-staged configuration
"@

$buildReadme | Out-File -FilePath "build\README.md" -Encoding UTF8

Write-Host "Updated build README with new file locations" -ForegroundColor Green