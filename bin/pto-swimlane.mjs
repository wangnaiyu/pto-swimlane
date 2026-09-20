#!/usr/bin/env node
try {
 const action=process.argv[2];
 if(action==='--help'||action==='help')console.log('pto-swimlane --allow-root <directory> [--max-file-mib 128] [--max-datasets 4]\npto-swimlane doctor [--allow-root <directory>]\npto-swimlane config --allow-root <directory>\nconfig prints Claude Code compatible MCP JSON; no configuration files are changed.');
 else if(action==='doctor'||action==='config'){const {setup}=await import('./setup.mjs');await setup(action,process.argv.slice(3));}
 else {const {register}=await import('tsx/esm/api');register();await import('../src/mcp/server.ts');}
}catch(error){console.error(error instanceof Error?error.message:error);process.exitCode=1;}
