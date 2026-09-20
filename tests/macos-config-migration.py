import subprocess,tempfile,tomllib,sys
from pathlib import Path
script=(Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parents[1]/'scripts/macos')/'migrate-config.awk'
def transform(text):
 r=subprocess.run(['awk','-v','helper=/tmp/auth-helper','-f',str(script)],input=text,text=True,capture_output=True)
 assert r.returncode==0,r.stderr
 return r.stdout
source='''model = "keep-me"
[mcp_servers.other]
url="https://other.example"
[mcp_servers.pto_swimlane_https]
url="https://42.192.111.92/pto-swimlane/mcp"
http_headers={Authorization="Bearer synthetic-test-only"}
[mcp_servers.pto_swimlane_https.tools.create_upload_session]
approval_policy="auto"
[projects."/some/project"]
trust_level="trusted"
'''
out=transform(source);data=tomllib.loads(out)
assert data['model']=='keep-me'
assert data['mcp_servers']['other']['url']=='https://other.example'
assert data['mcp_servers']['pto-swimlane-mcp']['tools']['create_upload_session']['approval_policy']=='auto'
assert 'synthetic-test-only' not in out
assert transform(out)==out
assert tomllib.loads(transform(''))['mcp_servers']['pto-swimlane-mcp']['http_headers_helper']=='/tmp/auth-helper'
for bad in [source+'\n[mcp_servers.pto-swimlane-mcp]\n',source.replace('https://42.192.111.92/pto-swimlane/mcp','https://unexpected.example')]:
 assert subprocess.run(['awk','-v','helper=/tmp/auth-helper','-f',str(script)],input=bad,text=True,capture_output=True).returncode!=0
print('PASS migration: old name, tool policy, other MCPs, secret removal, repeated install, conflict refusal')
