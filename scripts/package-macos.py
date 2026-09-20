#!/usr/bin/env python3
"""从规范源文件确定性构建公共 macOS 包；不读取凭据或已安装目录。"""
from pathlib import Path
import argparse, hashlib, json, zipfile

def build(output):
    root=Path(__file__).resolve().parents[1]
    names=['README.md','setup-pto-swimlane-macos.command','pto-swimlane-auth','migrate-config.awk']
    files={name:(root/'scripts/macos'/name).read_bytes() for name in names}
    files.update({name:(root/name).read_bytes() for name in ['LICENSE','Third_Party_Open_Source_Software_List.yaml','Third_Party_Open_Source_Software_Notice','UPSTREAM.md']})
    output=Path(output).resolve();output.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name,data in files.items():
            info=zipfile.ZipInfo('PTO-Swimlane-MCP/'+name,(1980,1,1,0,0,0))
            mode=0o755 if name in ['setup-pto-swimlane-macos.command','pto-swimlane-auth'] else 0o644
            info.create_system=3;info.external_attr=(0o100000|mode)<<16;info.compress_type=zipfile.ZIP_DEFLATED
            z.writestr(info,data)
    manifest={'release_version':json.loads((root/'package.json').read_text())['version'],'zip_sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'files':{name:hashlib.sha256(data).hexdigest() for name,data in files.items()}}
    print(json.dumps(manifest,ensure_ascii=False,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('output');build(parser.parse_args().output)
