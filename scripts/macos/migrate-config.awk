# Preserve unrelated configuration and per-tool settings; replace only PTO transport/auth fields.
function target(s) { return s ~ /^\[mcp_servers\.(pto_swimlane_https|pto-swimlane-mcp)(\.|\])/ }
function emit() {
 print "url = \"https://42.192.111.92/pto-swimlane/mcp\""
 print "http_headers_helper = \"" helper "\""
 print "startup_timeout_sec = 30"
 print "tool_timeout_sec = 30"
 print "enabled = true"
}
BEGIN { inside=0; main=0; auth=0; found=0; failed=0 }
{
 line=$0; sub(/\r$/, "",line); normalized=line; sub(/^[ \t]+/,"",normalized);sub(/[ \t]*(#.*)?$/,"",normalized)
 gsub(/"pto_swimlane_https"/,"pto_swimlane_https",normalized);gsub(/"pto-swimlane-mcp"/,"pto-swimlane-mcp",normalized)
 if (normalized ~ /^\[/) {
  inside=target(normalized);auth=0;main=0
  if(inside) {
   if(normalized ~ /^\[mcp_servers\.(pto_swimlane_https|pto-swimlane-mcp)\]$/) {
    main=1;found++;if(found>1){failed=1;exit 2}
    print "[mcp_servers.pto-swimlane-mcp]";emit();next
   }
   if(normalized ~ /\.(http_headers|env_http_headers)\]$/){auth=1;next}
   gsub(/pto_swimlane_https/,"pto-swimlane-mcp",line); print line;next
  }
 }
 if(auth)next
 if(main && normalized ~ /^(url|name|enabled|startup_timeout_sec|tool_timeout_sec|http_headers_helper|http_headers|env_http_headers|bearer_token_env_var|bearer_token)[ \t]*=/) {
  if(normalized ~ /^(http_headers|env_http_headers)[ \t]*=/ && normalized !~ /\{.*\}/){failed=1;exit 3}
  if(normalized ~ /^url[ \t]*=/ && index(normalized,"https://42.192.111.92/pto-swimlane/mcp")==0){failed=1;exit 4}
  next
 }
 print line
}
END {if(!failed && !found){print "\n[mcp_servers.pto-swimlane-mcp]";emit()}}
