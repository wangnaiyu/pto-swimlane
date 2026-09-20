$ErrorActionPreference = 'Stop'
$pointer = [IntPtr]::Zero
try {
    if ($env:OS -ne 'Windows_NT') { throw 'Windows required' }
    $secure = ConvertTo-SecureString ([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'credential.dpapi')))
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    if ($token -cnotmatch '^[A-Za-z0-9_-]{43}$') { throw 'Invalid credential' }
    [Console]::Out.WriteLine('{"Authorization":"Bearer ' + $token + '"}')
} catch {
    [Console]::Error.WriteLine('PTO credential unavailable. Use the same Windows account that installed it; contact your administrator if it persists.')
    exit 1
} finally {
    if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    $token = $null
}
