Set-StrictMode -Version 2.0

function New-PtoConfig([string]$Original, [string]$HelperPath) {
    # Fail closed for syntax that needs a full TOML parser. Never rewrite user tables.
    if ($Original.Contains('"""') -or $Original.Contains("'''")) {
        throw 'Config has multiline TOML strings. Ask the administrator to add this MCP manually; original config is unchanged.'
    }
    if ($Original -match '(?im)^\s*["'']?mcp_servers["'']?\s*=') {
        throw 'Inline MCP configuration needs manual setup; original config is unchanged.'
    }
    if ($Original -match '(?im)^[^#\r\n]*(pto-swimlane-mcp|pto_swimlane_https)') {
        throw 'An existing PTO MCP configuration was found. Remove only that server in Codex Settings > MCP before installing again. Other settings are unchanged.'
    }
    # EncodedCommand is UTF-16LE; it carries only a script path, never the token.
    $script = "& '" + $HelperPath.Replace("'", "''") + "'"
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
    $command = 'powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ' + $encoded
    $block = @"

# PTO Swimlane Windows installer v1 (remove this table to uninstall)
[mcp_servers.pto-swimlane-mcp]
url = "https://42.192.111.92/pto-swimlane/mcp"
http_headers_helper = "$command"
startup_timeout_sec = 30
tool_timeout_sec = 30
enabled = true
"@
    return $Original + "`r`n" + $block.Replace("`r`n", "`n").Replace("`n", "`r`n") + "`r`n"
}
