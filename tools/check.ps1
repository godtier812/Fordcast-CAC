$ErrorActionPreference = 'Stop'
function Invoke-Check {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Check failed: $Command $Arguments" }
}
Push-Location (Join-Path $PSScriptRoot '..')
try {
    Invoke-Check uv @('run', '--project', 'backend', 'ruff', 'check', 'backend')
    Invoke-Check uv @('run', '--project', 'backend', 'ruff', 'format', '--check', 'backend')
    Invoke-Check uv @('run', '--project', 'backend', 'pytest', 'backend/tests', '-q')
    Invoke-Check uv @('run', '--project', 'backend', 'python', 'tools/qa_audit.py')
    Push-Location mobile
    try {
        Invoke-Check node @('node_modules/typescript/bin/tsc', '--noEmit')
        Invoke-Check node @('node_modules/eslint/bin/eslint.js', 'src')
        Invoke-Check node @('node_modules/jest/bin/jest.js', '--ci', '--runInBand')
    } finally { Pop-Location }
} finally { Pop-Location }
