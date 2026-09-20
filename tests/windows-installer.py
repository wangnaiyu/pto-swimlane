"""Run with Python 3.11+, pwsh path, and scripts/windows path. No real credentials."""
import base64
import json
import pathlib
import re
import subprocess
import sys
import tempfile
import tomllib

pwsh, source = sys.argv[1], pathlib.Path(sys.argv[2]).resolve()

def run(script):
    return subprocess.run([pwsh, '-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand',
                           base64.b64encode(script.encode('utf-16le')).decode()], capture_output=True, text=True)

def quote(s):
    return "'" + str(s).replace("'", "''") + "'"

for path in source.glob('*.ps1'):
    p = run("$t=$null;$e=$null;[void][System.Management.Automation.Language.Parser]::ParseFile(" + quote(path) + ",[ref]$t,[ref]$e);if($e){$e;exit 1}")
    assert p.returncode == 0, (path, p.stdout, p.stderr)

helper = "C:\\Users\\\u6d4b\u8bd5 O'Brien & Co\\AppData\\Local\\PTO-Swimlane-MCP\\auth.ps1"
cases = [
    ('', True),
    ('model = "test"\n[mcp_servers.other]\ncommand = "demo"\n[mcp_servers.other.tools.lookup]\nenabled = false\n', True),
    ('# pto-swimlane-mcp documentation only\n[features]\nexample = true\n', True),
    ('[mcp_servers.pto-swimlane-mcp]\nurl="https://other.test"\n', False),
    ('[mcp_servers."pto_swimlane_https"]\nurl="https://other.test"\n', False),
    ('mcp_servers = {}\n', False),
    ('instructions = """hello\nworld"""\n', False),
]
with tempfile.TemporaryDirectory() as temp:
    temp = pathlib.Path(temp)
    for i, (original, succeeds) in enumerate(cases):
        fixture = temp / f'{i}.toml'
        output = temp / f'{i}-out.toml'
        fixture.write_text(original)
        script = "$ErrorActionPreference='Stop'; . " + quote(source / 'config.ps1')
        script += '; try {$text=New-PtoConfig ([IO.File]::ReadAllText(' + quote(fixture) + ')) ' + quote(helper)
        script += '; [IO.File]::WriteAllText(' + quote(output) + ",$text,(New-Object Text.UTF8Encoding($false)))}catch{exit 2}"
        p = run(script)
        assert fixture.read_text() == original
        assert (p.returncode == 0) == succeeds, (i, p.stdout, p.stderr)
        if not succeeds:
            assert not output.exists()
            continue
        generated = output.read_text()
        assert generated.startswith(original)
        parsed = tomllib.loads(generated)
        mcp = parsed['mcp_servers']['pto-swimlane-mcp']
        encoded = mcp['http_headers_helper'].split(' -EncodedCommand ')[1]
        assert base64.b64decode(encoded).decode('utf-16le') == "& '" + helper.replace("'", "''") + "'"
        assert mcp['url'] == 'https://42.192.111.92/pto-swimlane/mcp'
        assert mcp['enabled'] and mcp['startup_timeout_sec'] == 30
        old = tomllib.loads(original)
        del parsed['mcp_servers']['pto-swimlane-mcp']
        if not parsed['mcp_servers']:
            del parsed['mcp_servers']
        assert parsed == old
    if sys.platform != 'win32':
        p = run('& ' + quote(source / 'setup-pto-swimlane-windows.ps1'))
        assert p.returncode == 1 and 'native Windows' in p.stdout
        p = run('& ' + quote(source / 'pto-swimlane-auth.ps1'))
        assert p.returncode == 1 and not p.stdout.strip()
# Exercise the actual installer call, rather than a separately duplicated fix.
installer = (source / 'setup-pto-swimlane-windows.ps1').read_text(encoding='utf-8-sig')
replace_call = re.search(r'^\s*(\[IO.File\]::Replace\([^\n]+)', installer, re.M).group(1)
with tempfile.TemporaryDirectory(prefix='pto replace ') as directory:
    config = pathlib.Path(directory) / 'config.toml'
    staged = pathlib.Path(directory) / 'candidate.tmp'
    backup = pathlib.Path(directory) / 'backup.toml'
    old = b'model = "preserved"\r\n'
    new = old + b'# installed\r\n'
    config.write_bytes(old)
    staged.write_bytes(new)
    backup.write_bytes(old)
    script = "$ErrorActionPreference='Stop';$temp=" + quote(staged) + ';$config=' + quote(config) + ';' + replace_call
    result = run(script)
    assert result.returncode == 0, (result.stdout, result.stderr)
    assert config.read_bytes() == new and backup.read_bytes() == old and not staged.exists()
    # Failed replacement must leave the existing destination intact.
    result = run(script)
    assert result.returncode != 0 and config.read_bytes() == new
print(json.dumps({'powershell_parse': 'pass', 'config_cases': len(cases), 'unrelated_settings': 'preserved', 'unicode_apostrophe_path': 'pass', 'actual_config_replace_and_failure': 'pass', 'windows_native_integration': 'NOT RUN'}, indent=2))
