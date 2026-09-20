"""Build a deterministic Windows client-only ZIP; never packages any credentials."""
import hashlib
import json
import pathlib
import sys
import zipfile

source, output = map(pathlib.Path, sys.argv[1:3])
names = ['README.md', 'setup-pto-swimlane-windows.cmd', 'setup-pto-swimlane-windows.ps1', 'pto-swimlane-auth.ps1', 'config.ps1']
root = pathlib.Path(__file__).resolve().parents[1]
legal = ['LICENSE', 'Third_Party_Open_Source_Software_List.yaml', 'Third_Party_Open_Source_Software_Notice', 'UPSTREAM.md']
names += legal
manifest = {'release_version': json.loads((root / 'package.json').read_text())['version'], 'installer_version': 'windows-2', 'service_compatibility': '0.4.0-local.22', 'files': {}}
output.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name in names:
        text = ((root if name in legal else source) / name).read_text(encoding='utf-8-sig').replace('\r\n', '\n')
        data = text.replace('\n', '\r\n').encode('utf-8-sig' if name.endswith('.ps1') else 'utf-8')
        info = zipfile.ZipInfo('PTO-Swimlane-MCP-Windows/' + name, date_time=(1980,1,1,0,0,0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, data)
        manifest['files'][name] = hashlib.sha256(data).hexdigest()
manifest['zip_sha256'] = hashlib.sha256(output.read_bytes()).hexdigest()
output.with_suffix('.manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'zip': str(output), 'sha256': manifest['zip_sha256']}, indent=2))
