#!/usr/bin/env python3
"""Install the prepared personal MCP fragment; never print credentials."""
import argparse
import json
import os
from pathlib import Path
import tempfile
import time


def install(fragment, credential, config):
    if (fragment is not None and fragment.is_symlink()) or credential.is_symlink():
        raise ValueError('凭据文件不能是符号链接')
    meta = json.loads(credential.read_text())
    if meta['expires_at'] != 0 and meta['expires_at'] <= time.time() * 1000:
        raise ValueError('测试凭据已到期，请先重新发放；原配置未修改')
    if not isinstance(meta.get('token'), str) or not meta['token'] or any(c.isspace() for c in meta['token']):
        raise ValueError('凭据格式错误')
    addition = fragment.read_text().strip() if fragment is not None else ('[mcp_servers.pto-swimlane-mcp]\n'
        'url = "https://42.192.111.92/pto-swimlane/mcp"\n'
        'startup_timeout_sec = 30\n'
        'tool_timeout_sec = 30\n'
        'http_headers = { Authorization = ' + json.dumps('Bearer ' + meta['token']) + ' }')
    if not addition.startswith('[mcp_servers.pto-swimlane-mcp]') or meta['token'] not in addition:
        raise ValueError('配置片段与凭据不匹配；原配置未修改')
    config.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if config.is_symlink():
        raise ValueError('配置文件为符号链接，请指定实际配置文件路径')
    original = config.read_bytes() if config.exists() else None
    text = original.decode() if original is not None else ''
    if addition in text:
        print('同一 MCP 配置已存在，无需重复添加。')
        return
    if 'pto-swimlane-mcp' in text or 'pto_swimlane_https' in text:
        raise ValueError('检测到同名或旧名称 MCP 配置，未重复添加；请先迁移已有配置')
    updated = (text + ('\n\n' if text else '') + addition + '\n').encode()
    temporary = None
    try:
        fd, temporary = tempfile.mkstemp(prefix='.pto-mcp-', dir=config.parent)
        with os.fdopen(fd, 'wb') as output:
            output.write(updated)
            output.flush()
            os.fsync(output.fileno())
        if config.is_symlink() or (config.read_bytes() if config.exists() else None) != original:
            raise ValueError('配置在操作期间发生变化，已停止，请重试')
        if original is not None:
            backup_fd, backup = tempfile.mkstemp(prefix='config.toml.before-pto-', dir=config.parent)
            with os.fdopen(backup_fd, 'wb') as output:
                output.write(original)
            print('原配置备份：' + backup)
        os.replace(temporary, config)
        temporary = None
        print('已配置 pto-swimlane-mcp：' + str(config))
        print('请重新加载 Codex Desktop 的 MCP 连接或重启应用，再开始一个新对话。')
    finally:
        if temporary is not None:
            Path(temporary).unlink(missing_ok=True)


def main():
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, default=Path(os.environ.get('CODEX_HOME', str(Path.home() / '.codex'))) / 'config.toml')
    private = root / '.local' / 'd4-desktop'
    parser.add_argument('--fragment', type=Path, default=None)
    parser.add_argument('--credential', type=Path, default=private / 'credential.json')
    args = parser.parse_args()
    try:
        install(args.fragment.expanduser() if args.fragment else None, args.credential.expanduser(), args.config.expanduser())
    except (OSError, ValueError, KeyError) as error:
        parser.exit(1, '接入未完成：' + str(error) + '\n')


if __name__ == '__main__':
    main()
