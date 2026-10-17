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
    Push-Location mobile
    try {
        Invoke-Check npm @('run', 'typecheck')
        Invoke-Check npm @('run', 'lint')
        Invoke-Check npm @('test', '--', '--ci')
    } finally { Pop-Location }
} finally { Pop-Location }
