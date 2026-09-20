# Windows PowerShell 5.1 / native Codex desktop. No administrator privileges required.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0
$stage = $null
$temp = $null
$committed = $false
$pointer = [IntPtr]::Zero

function Assert-PlainPath([string]$Path) {
    $cursor = [IO.Path]::GetFullPath($Path)
    while ($cursor) {
        if (Test-Path -LiteralPath $cursor) {
            if (((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
                throw 'A configuration or credential path uses a link/junction. Installation stopped without replacing it.'
            }
        }
        $cursor = [IO.Path]::GetDirectoryName($cursor)
    }
}

function Protect-Directory([string]$Path) {
    $acl = New-Object Security.AccessControl.DirectorySecurity
    $acl.SetAccessRuleProtection($true, $false)
    $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $acl.SetOwner($sid)
    foreach ($id in @($sid.Value, 'S-1-5-18', 'S-1-5-32-544')) {
        $principal = New-Object Security.Principal.SecurityIdentifier($id)
        $rule = New-Object Security.AccessControl.FileSystemAccessRule($principal, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
        $acl.AddAccessRule($rule)
    }
    Set-Acl -LiteralPath $Path -AclObject $acl
}

try {
    if ($env:OS -ne 'Windows_NT') { throw 'Use this installer on native Windows, not macOS or WSL.' }
    if ($PSVersionTable.PSVersion -lt [Version]'5.1') { throw 'Windows PowerShell 5.1 or newer is required.' }
    . (Join-Path $PSScriptRoot 'config.ps1')
    $configDir = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
    if (-not [IO.Path]::IsPathRooted($configDir)) { throw 'CODEX_HOME must be an absolute path.' }
    $configDir = [IO.Path]::GetFullPath($configDir)
    $config = Join-Path $configDir 'config.toml'
    Assert-PlainPath $config
    $existed = Test-Path -LiteralPath $config
    $originalBytes = if ($existed) { [IO.File]::ReadAllBytes($config) } else { [byte[]]@() }
    $original = if ($existed) { [IO.File]::ReadAllText($config) } else { '' }
    $root = Join-Path $env:LOCALAPPDATA 'PTO-Swimlane-MCP'
    Assert-PlainPath $root
    $stage = Join-Path $root ([Guid]::NewGuid().ToString('N'))
    $helper = Join-Path $stage 'pto-swimlane-auth.ps1'
    # All conflicts are detected before asking for or storing a credential.
    $candidate = New-PtoConfig $original $helper
    Write-Host 'PTO Swimlane MCP - Windows installer'
    Write-Host ('Codex config: ' + $config)
    Write-Host 'Close Codex before continuing. Paste your personal 43-character token below.'
    $secure = Read-Host 'Token (hidden)' -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    if ($token -cnotmatch '^[A-Za-z0-9_-]{43}$') { throw 'Token format is invalid. Ask the administrator for your personal token.' }

    # Never follow redirects with Authorization. Keep normal TLS certificate validation.
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $request = [Net.HttpWebRequest]::Create('https://42.192.111.92/pto-swimlane/mcp')
    $request.Method = 'GET'
    $request.AllowAutoRedirect = $false
    $request.Timeout = 20000
    $request.ReadWriteTimeout = 20000
    $request.Headers['Authorization'] = 'Bearer ' + $token
    $response = $null
    try { $response = $request.GetResponse() }
    catch [Net.WebException] {
        $response = $_.Exception.Response
        if ($null -eq $response) { throw 'Cannot reach the HTTPS service. Check the network/proxy; config is unchanged.' }
    }
    $status = [int]$response.StatusCode
    $response.Close()
    if ($status -eq 401 -or $status -eq 403) { throw 'Token rejected or disabled. Ask the administrator to check it.' }
    if ($status -ne 405) { throw ('Service check failed (HTTP ' + $status + '). Config is unchanged.') }

    [void][IO.Directory]::CreateDirectory($root)
    [void][IO.Directory]::CreateDirectory($stage)
    Protect-Directory $stage
    [IO.File]::WriteAllText((Join-Path $stage 'credential.dpapi'), (ConvertFrom-SecureString $secure), [Text.Encoding]::ASCII)
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'pto-swimlane-auth.ps1') -Destination $helper
    $powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $output = & $powershell -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $helper 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'Credential helper validation failed. Config is unchanged.' }
    $headers = $output | ConvertFrom-Json
    if ($headers.Authorization -cne ('Bearer ' + $token)) { throw 'Credential round-trip validation failed.' }
    $output = $null
    $headers = $null

    [void][IO.Directory]::CreateDirectory($configDir)
    Assert-PlainPath $config
    if ((Test-Path -LiteralPath $config) -ne $existed) { throw 'Config changed during installation. Retry after closing Codex.' }
    if ($existed -and [Convert]::ToBase64String([IO.File]::ReadAllBytes($config)) -cne [Convert]::ToBase64String($originalBytes)) {
        throw 'Config changed during installation. Retry after closing Codex.'
    }
    $temp = Join-Path $configDir ('.pto-config-' + [Guid]::NewGuid().ToString('N') + '.tmp')
    [IO.File]::WriteAllText($temp, $candidate, (New-Object Text.UTF8Encoding($false)))
    if ($existed) {
        # Backup may contain private pre-existing settings; keep it in the protected folder.
        [IO.File]::WriteAllBytes((Join-Path $stage 'config-before-install.toml'), $originalBytes)
        # PowerShell coerces $null to an empty string for this .NET string parameter.
        [IO.File]::Replace($temp, $config, [NullString]::Value)
    } else { [IO.File]::Move($temp, $config) }
    $committed = $true
    Write-Host 'Installed. Completely exit and reopen Codex, then start a new task:' -ForegroundColor Green
    Write-Host 'Use pto-swimlane-mcp to analyze performance.'
    Write-Host 'Credential is encrypted for this Windows account. Do not share your config backup.'
} catch {
    Write-Host ('Installation stopped: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
} finally {
    if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    $token = $null
    if ($temp -and (Test-Path -LiteralPath $temp)) { Remove-Item -LiteralPath $temp -Force }
    if (-not $committed -and $stage -and (Test-Path -LiteralPath $stage)) { Remove-Item -LiteralPath $stage -Recurse -Force }
}
