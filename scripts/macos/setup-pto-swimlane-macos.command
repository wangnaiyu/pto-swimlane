#!/bin/bash
# PTO Swimlane invitation installer. No Python or Node installation required.
set -eu
umask 077
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin"
HERE=$(cd "$(dirname "$0")" && pwd)
CONFIG_DIR="${CODEX_HOME:-$HOME/.codex}"
CONFIG="$CONFIG_DIR/config.toml"
HELPER_DIR="$HOME/.local/bin"
HELPER="$HELPER_DIR/pto-swimlane-auth"
ACCOUNT=$(/usr/bin/id -un)
TOKEN='';TMP_CONFIG='';TMP_HELPER='';BACKUP=''
finish(){ unset TOKEN; [ -z "$TMP_CONFIG" ] || /bin/rm -f "$TMP_CONFIG"; [ -z "$TMP_HELPER" ] || /bin/rm -f "$TMP_HELPER"; }
trap finish EXIT
pause(){ if [ -t 0 ]; then printf '\n按回车关闭窗口。'; IFS= read -r _ || true; fi; }
fail(){ printf '\n安装未完成：%s\n' "$1" >&2; pause; exit 1; }
[ "$(uname -s)" = Darwin ] || fail '此安装包适用于 macOS。'
[[ "$ACCOUNT" =~ ^[A-Za-z0-9_.-]+$ ]] || fail '当前系统账号名称需要人工接入。'
CODEX_BIN=''
for candidate in /Applications/ChatGPT.app/Contents/Resources/codex /Applications/Codex.app/Contents/Resources/codex "$HOME/Applications/ChatGPT.app/Contents/Resources/codex" "$HOME/Applications/Codex.app/Contents/Resources/codex"; do
 if [ -x "$candidate" ]; then CODEX_BIN="$candidate"; break; fi
done
if [ -z "$CODEX_BIN" ]; then CODEX_BIN=$(command -v codex || true); fi
[ -n "$CODEX_BIN" ] || fail '未找到 Codex，请先安装 Codex Desktop。'
[ -f "$HERE/migrate-config.awk" ] && [ -f "$HERE/pto-swimlane-auth" ] || fail '安装包不完整，请重新解压。'
[ ! -L "$CONFIG" ] && [ ! -L "$CONFIG_DIR" ] && [ ! -L "$HELPER_DIR" ] && [ ! -L "$HELPER" ] || fail '配置或认证路径是符号链接，请使用实际路径人工接入。'
printf 'PTO Swimlane MCP 安装\n\n粘贴管理员发给你的个人 Token，然后按回车（输入不会显示）：'
IFS= read -r -s TOKEN || fail '没有读取到 Token。'
printf '\n'
[[ "$TOKEN" =~ ^[A-Za-z0-9_-]{43}$ ]] || fail 'Token 格式不正确，请复制完整内容。'
printf '正在验证 HTTPS 连接和 Token…\n'
# Authentication precedes method checking on this service: 405 means authenticated.
CODE=$(printf 'Authorization: Bearer %s\n' "$TOKEN" | /usr/bin/curl -q -sS --connect-timeout 10 --max-time 20 --header @- --output /dev/null --write-out '%{http_code}' 'https://42.192.111.92/pto-swimlane/mcp') || fail '连接失败，请检查网络；现有配置未修改。'
case "$CODE" in 405) ;; 401|403) fail 'Token 无效或已停用，请联系管理员。';; 429) fail '请求过于频繁，请稍后重试。';; *) fail "服务暂时不可用（HTTP $CODE），现有配置未修改。";; esac
mkdir -p "$CONFIG_DIR" "$HELPER_DIR"
TMP_CONFIG=$(mktemp "$CONFIG_DIR/.pto-install.XXXXXX")
ESCAPED_HELPER=$(printf '%s' "$HELPER" | sed 's/\\/\\\\/g;s/"/\\"/g')
# awk -v interprets backslashes; reject unusual control/quote paths rather than emit invalid TOML.
case "$HELPER" in *'"'*|*'\'*) fail '安装路径含特殊字符，请使用人工接入。';; esac
awk -v helper="$ESCAPED_HELPER" -f "$HERE/migrate-config.awk" "${CONFIG:-/dev/null}" > "$TMP_CONFIG" 2>/dev/null || {
 if [ ! -e "$CONFIG" ]; then awk -v helper="$ESCAPED_HELPER" -f "$HERE/migrate-config.awk" /dev/null > "$TMP_CONFIG";
 else fail '现有泳道配置存在冲突或特殊写法，已保留原配置，请联系管理员。'; fi
}
if [ -f "$CONFIG" ]; then BACKUP=$(mktemp "$CONFIG_DIR/config.toml.before-pto-keychain.XXXXXX"); cp "$CONFIG" "$BACKUP"; chmod 600 "$BACKUP"; fi
TMP_HELPER=$(mktemp "$HELPER_DIR/.pto-auth.XXXXXX")
cp "$HERE/pto-swimlane-auth" "$TMP_HELPER";chmod 700 "$TMP_HELPER"
# Feed the secret through stdin to security's interactive command parser; never argv/history.
printf 'add-generic-password -a "%s" -s "pto-swimlane-mcp" -l "PTO Swimlane Token" -U -w "%s"\n' "$ACCOUNT" "$TOKEN" | /usr/bin/security -i >/dev/null 2>&1 || fail '无法写入系统钥匙串，配置尚未替换。'
SAVED=$(/usr/bin/security find-generic-password -a "$ACCOUNT" -s pto-swimlane-mcp -w 2>/dev/null) || fail '无法读取钥匙串，请检查系统授权。'
[ "$SAVED" = "$TOKEN" ] || fail '钥匙串写入未成功，请重试。'
unset SAVED TOKEN
if [ -n "$BACKUP" ]; then cmp -s "$CONFIG" "$BACKUP" || fail '配置在安装期间发生变化，请重试，未覆盖新改动。';
else [ ! -e "$CONFIG" ] || fail '安装期间出现新的配置文件，请重试。'; fi
[ ! -L "$CONFIG" ] || fail '配置路径在安装期间变化，请重试。'
mv "$TMP_HELPER" "$HELPER";TMP_HELPER='' 
chmod 600 "$TMP_CONFIG";mv "$TMP_CONFIG" "$CONFIG";TMP_CONFIG=''
if ! "$CODEX_BIN" mcp get pto-swimlane-mcp >/dev/null 2>&1; then
 if [ -n "$BACKUP" ]; then cp "$BACKUP" "$CONFIG"; else mv "$CONFIG" "$CONFIG.failed-pto-install"; fi
 fail 'Codex 未能读取新配置，原配置已恢复。'
fi
printf '\n安装完成：\n✓ Token 已验证并存入系统钥匙串\n✓ pto-swimlane-mcp 已配置\n✓ 其他 MCP 配置保留\n\n请完全退出 Codex（⌘Q），重新打开并新建任务，输入：\n使用 pto-swimlane-mcp 分析性能，打开上传页面。\n\n在 Browser 设置中，将 Web URL and link open destination 设为应用内，便于恢复泳道图。\n'
if [ -n "$BACKUP" ]; then printf '\n旧配置的私密备份：%s\n旧备份可能含旧 Token，确认安装成功后可自行删除。\n' "$BACKUP";fi
pause
