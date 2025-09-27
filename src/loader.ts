import { readdir } from 'fs/promises';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { MCPTool } from './runtime/tool.js';
import { MCPResource } from './runtime/resource.js';
import { MCPPrompt } from './runtime/prompt.js';

async function listJs(dir: string) {
  try { return (await readdir(dir)).filter(f => f.endsWith('.js')); } catch { return []; }
}

export async function loadTools(baseDir = process.cwd()) {
  const dir = join(baseDir, 'dist', 'tools');
  const files = await listJs(dir);
  const tools: MCPTool[] = [];
  for (const f of files) {
    try {
      const m = await import(pathToFileURL(join(dir, f)).href);
      const C = m.default; if (typeof C === 'function') { const inst = new C(); if (inst && inst.name && inst.description) tools.push(inst); }
    } catch {}
  }
  return tools;
}

export async function loadResources(baseDir = process.cwd()) {
  const dir = join(baseDir, 'dist', 'resources');
  const files = await listJs(dir);
  const res: MCPResource[] = [];
  for (const f of files) {
    try {
      const m = await import(pathToFileURL(join(dir, f)).href);
      const C = m.default; if (typeof C === 'function') { const inst = new C(); if (inst && inst.uri && inst.name) res.push(inst); }
    } catch {}
  }
  return res;
}

export async function loadPrompts(baseDir = process.cwd()) {
  const dir = join(baseDir, 'dist', 'prompts');
  const files = await listJs(dir);
  const ps: MCPPrompt[] = [];
  for (const f of files) {
    try {
      const m = await import(pathToFileURL(join(dir, f)).href);
      const C = m.default; if (typeof C === 'function') { const inst = new C(); if (inst && inst.name && inst.description) ps.push(inst); }
    } catch {}
  }
  return ps;
}

