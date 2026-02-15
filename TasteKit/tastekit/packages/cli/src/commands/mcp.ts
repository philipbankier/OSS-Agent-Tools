import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface MCPServerRegistry {
  servers: Record<string, {
    name: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    transport?: string;
    pinned?: boolean;
    added_at: string;
  }>;
}

function getRegistryPath(): string {
  return join(process.cwd(), '.tastekit', 'mcp', 'servers.json');
}

function loadRegistry(): MCPServerRegistry {
  const path = getRegistryPath();
  if (!existsSync(path)) {
    return { servers: {} };
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function saveRegistry(registry: MCPServerRegistry): void {
  const path = getRegistryPath();
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, JSON.stringify(registry, null, 2), 'utf-8');
}

const mcpAddCommand = new Command('add')
  .description('Add an MCP server')
  .argument('<server_ref>', 'Server command or URL')
  .option('--name <name>', 'Server name')
  .option('--args <args>', 'Command arguments (comma-separated)')
  .option('--pin', 'Pin server fingerprint after adding')
  .action(async (serverRef: string, options) => {
    const spinner = ora(`Adding MCP server: ${serverRef}`).start();

    try {
      const registry = loadRegistry();
      const name = options.name || serverRef.split('/').pop()?.replace(/[^a-zA-Z0-9-]/g, '') || 'server';

      // Determine if this is a command (stdio) or URL (http)
      const isUrl = serverRef.startsWith('http://') || serverRef.startsWith('https://');

      registry.servers[name] = {
        name,
        ...(isUrl ? { url: serverRef, transport: 'streamable-http' } : {
          command: serverRef,
          args: options.args ? options.args.split(',') : [],
          transport: 'stdio',
        }),
        pinned: false,
        added_at: new Date().toISOString(),
      };

      saveRegistry(registry);

      spinner.succeed(chalk.green(`MCP server added: ${name}`));
      console.log(chalk.gray(`  Transport: ${isUrl ? 'streamable-http' : 'stdio'}`));
      console.log(chalk.gray(`  Ref: ${serverRef}`));
      console.log(chalk.cyan('\nRun'), chalk.bold('tastekit mcp inspect ' + name), chalk.cyan('to discover tools.'));
      console.log(chalk.cyan('Run'), chalk.bold('tastekit mcp bind'), chalk.cyan('to select and bind tools.'));
    } catch (error: any) {
      spinner.fail(chalk.red(`Failed to add MCP server: ${error.message}`));
      process.exit(1);
    }
  });

const mcpListCommand = new Command('list')
  .description('List configured MCP servers')
  .action(async () => {
    console.log(chalk.bold('\nMCP Servers\n'));

    const registry = loadRegistry();
    const servers = Object.values(registry.servers);

    if (servers.length === 0) {
      console.log(chalk.gray('No MCP servers configured.'));
      console.log(chalk.cyan('\nRun'), chalk.bold('tastekit mcp add <command_or_url>'), chalk.cyan('to add a server.'));
      return;
    }

    for (const server of servers) {
      const pinIcon = server.pinned ? chalk.green('[pinned]') : chalk.gray('[unpinned]');
      console.log(`  ${chalk.bold(server.name)} ${pinIcon}`);
      console.log(`    Transport: ${server.transport || 'stdio'}`);
      if (server.command) console.log(`    Command: ${server.command} ${(server.args || []).join(' ')}`);
      if (server.url) console.log(`    URL: ${server.url}`);
      console.log(`    Added: ${server.added_at}`);
      console.log('');
    }

    console.log(chalk.gray(`${servers.length} server(s) configured.`));
  });

const mcpInspectCommand = new Command('inspect')
  .description('Inspect an MCP server (discover tools, resources, prompts)')
  .argument('<server>', 'Server name from registry')
  .action(async (serverName: string) => {
    const registry = loadRegistry();
    const serverConfig = registry.servers[serverName];

    if (!serverConfig) {
      console.error(chalk.red(`Server not found: ${serverName}`));
      console.log(chalk.cyan('Run'), chalk.bold('tastekit mcp list'), chalk.cyan('to see configured servers.'));
      process.exit(1);
    }

    const spinner = ora(`Connecting to ${serverName}...`).start();

    try {
      const { MCPClient } = await import('@tastekit/core/mcp');
      const client = new MCPClient(serverConfig);

      await client.connect();
      spinner.text = `Discovering capabilities of ${serverName}...`;

      const tools = await client.listTools();
      const resources = await client.listResources();
      const prompts = await client.listPrompts();
      const fingerprint = await client.getFingerprint();

      await client.disconnect();

      spinner.succeed(chalk.green(`Inspected: ${serverName}`));

      console.log(chalk.gray(`  Fingerprint: ${fingerprint}`));
      console.log('');

      if (tools.length > 0) {
        console.log(chalk.bold('  Tools:'));
        for (const tool of tools) {
          const risk = tool.annotations?.destructive ? chalk.red('[destructive]')
            : tool.annotations?.risk === 'high' ? chalk.yellow('[high-risk]')
            : '';
          console.log(`    ${tool.name} ${risk}`);
          if (tool.description) console.log(chalk.gray(`      ${tool.description}`));
        }
        console.log('');
      }

      if (resources.length > 0) {
        console.log(chalk.bold('  Resources:'));
        for (const r of resources) {
          console.log(`    ${r.uri} ${r.name ? chalk.gray(`(${r.name})`) : ''}`);
        }
        console.log('');
      }

      if (prompts.length > 0) {
        console.log(chalk.bold('  Prompts:'));
        for (const p of prompts) {
          console.log(`    ${p.name} ${p.description ? chalk.gray(`- ${p.description}`) : ''}`);
        }
        console.log('');
      }

      if (tools.length === 0 && resources.length === 0 && prompts.length === 0) {
        console.log(chalk.yellow('  No tools, resources, or prompts discovered.'));
      }
    } catch (error: any) {
      spinner.fail(chalk.red(`Failed to inspect: ${error.message}`));
      process.exit(1);
    }
  });

const mcpBindCommand = new Command('bind')
  .description('Select and bind tools from MCP servers')
  .option('--server <name>', 'Bind tools from specific server')
  .option('--all', 'Bind all tools from all servers')
  .action(async (options) => {
    const spinner = ora('Binding MCP tools...').start();

    try {
      const registry = loadRegistry();
      const servers = options.server
        ? [registry.servers[options.server]].filter(Boolean)
        : Object.values(registry.servers);

      if (servers.length === 0) {
        spinner.info(chalk.yellow('No servers to bind. Add servers with `tastekit mcp add`.'));
        return;
      }

      const { MCPClient, MCPBinder } = await import('@tastekit/core/mcp');
      const binder = new MCPBinder();
      const allBindings: any[] = [];
      const allGuardrails: any[] = [];

      for (const serverConfig of servers) {
        const client = new MCPClient(serverConfig);
        try {
          await client.connect();
          const { bindings, guardrails } = await binder.bindServer(
            client,
            serverConfig.name,
            serverConfig.url || serverConfig.command || '',
            { autoApproveRead: true }
          );
          allBindings.push(bindings);
          allGuardrails.push(...guardrails);
          await client.disconnect();
        } catch (err: any) {
          spinner.text = chalk.yellow(`Skipping ${serverConfig.name}: ${err.message}`);
        }
      }

      // Save bindings
      const bindingsArtifact = {
        schema_version: 'bindings.v1',
        servers: allBindings,
      };

      const artifactsDir = join(process.cwd(), '.tastekit', 'artifacts');
      mkdirSync(artifactsDir, { recursive: true });
      writeFileSync(
        join(artifactsDir, 'bindings.v1.json'),
        JSON.stringify(bindingsArtifact, null, 2),
        'utf-8'
      );

      const totalTools = allBindings.reduce((sum, b) => sum + (b.tools?.length || 0), 0);
      spinner.succeed(chalk.green(`Bound ${totalTools} tool(s) from ${allBindings.length} server(s)`));
      console.log(chalk.gray(`  Bindings saved to: .tastekit/artifacts/bindings.v1.json`));
    } catch (error: any) {
      spinner.fail(chalk.red(`Binding failed: ${error.message}`));
      process.exit(1);
    }
  });

export const mcpCommand = new Command('mcp')
  .description('Manage MCP server bindings')
  .addCommand(mcpAddCommand)
  .addCommand(mcpListCommand)
  .addCommand(mcpInspectCommand)
  .addCommand(mcpBindCommand);
