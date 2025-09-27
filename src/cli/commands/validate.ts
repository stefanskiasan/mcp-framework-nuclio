import { loadTools, loadPrompts } from '../../loader.js';

export async function validateCommand() {
  try {
    const tools = await loadTools();
    const prompts = await loadPrompts();
    const errors: string[] = [];

    for (const t of tools) {
      const props = t?.inputSchema?.properties || {};
      const missing = Object.entries(props).filter(([_, v]: any) => !(v as any).description || (v as any).description.trim() === '').map(([k]) => k);
      if (missing.length) errors.push(`Tool ${t.name}: Missing descriptions for fields: ${missing.join(', ')}`);
    }
    for (const p of prompts) {
      const s = (p as any).schema || {};
      const missing = Object.entries(s).filter(([_, v]: any) => !v?.description || v.description.trim() === '').map(([k]) => k);
      if (missing.length) errors.push(`Prompt ${p.name}: Missing descriptions for arguments: ${missing.join(', ')}`);
    }

    if (errors.length) {
      console.error('✖ Validation failed:');
      for (const e of errors) console.error('  ❌ ' + e);
      process.exit(1);
    }
    console.log('✔ Validation passed');
  } catch (e: any) {
    console.error('✖ Validation error:', e?.message || e);
    process.exit(1);
  }
}

