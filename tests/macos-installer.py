from pathlib import Path
import tempfile,subprocess,shutil,tomllib,os
import sys
python=sys.executable
source=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parents[1]/'scripts/macos'
with tempfile.TemporaryDirectory(prefix='pto-install-test-') as folder:
 root=Path(folder)
 for scenario in ['success','invalid-token','keychain-failed','conflict']:
  d=root/scenario;d.mkdir();config=d/'config';config.mkdir();helper=d/'bin';helper.mkdir()
  original='model="preserved"\n[mcp_servers.other]\nurl="https://other.example"\n[mcp_servers.pto_swimlane_https]\nurl="https://42.192.111.92/pto-swimlane/mcp"\nhttp_headers={Authorization="Bearer old-synthetic-token"}\n[mcp_servers.pto_swimlane_https.tools.get_view_session]\nenabled=false\n'
  if scenario=='conflict':original+='[mcp_servers.pto-swimlane-mcp]\n'
  (config/'config.toml').write_text(original)
  security=d/'security';security.write_text(f'''#!{python}
import sys,re
from pathlib import Path
store=Path({str(d/'fake-keychain')!r})
if sys.argv[1]=='-i':
 text=sys.stdin.read()
 if {scenario=='keychain-failed'!r}:sys.exit(1)
 store.write_text(re.search(r'-w "([A-Za-z0-9_-]+)"',text).group(1))
else:print(store.read_text())
''');security.chmod(0o755)
  curl=d/'curl';curl.write_text('#!/bin/sh\ncat >/dev/null\nprintf '+('401' if scenario=='invalid-token' else '405')+'\n');curl.chmod(0o755)
  codex=d/'codex';codex.write_text(f'''#!{python}
import tomllib
from pathlib import Path
d=tomllib.loads(Path({str(config/'config.toml')!r}).read_text())
assert d['mcp_servers']['pto-swimlane-mcp']['http_headers_helper']
''');codex.chmod(0o755)
  s=(source/'setup-pto-swimlane-macos.command').read_text()
  s=s.replace('CONFIG_DIR="${CODEX_HOME:-$HOME/.codex}"','CONFIG_DIR="'+str(config)+'"').replace('HELPER_DIR="$HOME/.local/bin"','HELPER_DIR="'+str(helper)+'"')
  start=s.index("CODEX_BIN=''\n");end=s.index('[ -n "$CODEX_BIN" ]',start);s=s[:start]+'CODEX_BIN="'+str(codex)+'"\n'+s[end:]
  s=s.replace('/usr/bin/security',str(security)).replace('/usr/bin/curl',str(curl))
  (d/'install.command').write_text(s)
  for name in ['migrate-config.awk','pto-swimlane-auth']:shutil.copyfile(source/name,d/name)
  token='A'*43;r=subprocess.run(['bash',str(d/'install.command')],input=token+'\n',text=True,capture_output=True)
  assert token not in r.stdout+r.stderr
  if scenario=='success':
   assert r.returncode==0,r.stdout+r.stderr
   parsed=tomllib.loads((config/'config.toml').read_text());assert parsed['model']=='preserved';assert 'other' in parsed['mcp_servers'];assert not parsed['mcp_servers']['pto-swimlane-mcp']['tools']['get_view_session']['enabled'];assert 'old-synthetic-token' not in (config/'config.toml').read_text();assert (helper/'pto-swimlane-auth').stat().st_mode&0o777==0o700
  else:
   assert r.returncode!=0
   assert (config/'config.toml').read_text()==original
 print('PASS installer fixtures: success, invalid token, keychain failure, duplicate-config conflict; original config preserved and token absent from output')
