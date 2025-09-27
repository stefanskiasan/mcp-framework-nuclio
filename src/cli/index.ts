#!/usr/bin/env node
import { Command } from 'commander';
import { createProject } from './project/create.js';
import { addTool } from './project/add-tool.js';
import { addPrompt } from './project/add-prompt.js';
import { addResource } from './project/add-resource.js';
import { validateCommand } from './commands/validate.js';
import { buildCommand } from './commands/build.js';

const program = new Command();
program.name('mfn').description('Nuclio-focused MCP CLI (programmatic config)').version('0.0.1');

program
  .command('create')
  .description('Create a new Nuclio MCP project')
  .argument('<name>', 'project name')
  .option('--no-examples', 'skip example tool/resource')
  .option('--tenants', 'include /mcp/:id tenants skeleton')
  .action((name: string, opts: any) => createProject(name, { examples: opts.examples, tenants: !!opts.tenants }));

const add = program.command('add').description('Add a new component');
add
  .command('tool')
  .argument('<name>', 'tool name')
  .option('--template <template>', 'prebuilt template name (e.g. outlook-send-mail)')
  .action((name: string, opts: any) => addTool(name, { template: opts.template }));
add.command('prompt').argument('<name>', 'prompt name').action(addPrompt);
add.command('resource').argument('<name>', 'resource name').action(addResource);

// Additional top-level commands
program.command('validate').description('Validate project schemas (Zod descriptions)').action(validateCommand);
program.command('build').description('Compile TypeScript and validate').action(buildCommand);

program.parse();
