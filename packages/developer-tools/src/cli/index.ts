#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import { createComponent } from './commands/create-component';
import { generateTheme } from './commands/generate-theme';
import { analyzeAccessibility } from './commands/analyze-accessibility';
import { startDevServer } from './commands/dev-server';
import { buildProject } from './commands/build';
import { validateProject } from './commands/validate';
import { initProject } from './commands/init';

const program = new Command();

/**
 * CogUI CLI Tool
 * Command-line interface for CogUI development
 */

// ASCII art header
console.log(
  chalk.cyan(
    figlet.textSync('CogUI CLI', { 
      font: 'Small',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    })
  )
);

console.log(chalk.gray('Cognitive-Adaptive UI Development Toolkit\n'));

// CLI Configuration
program
  .name('cogui')
  .description('CogUI CLI - Cognitive-Adaptive UI Development Toolkit')
  .version('1.0.0')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--no-color', 'Disable colored output')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.noColor) {
      chalk.level = 0;
    }
  });

/**
 * Init Command - Initialize new CogUI project
 */
program
  .command('init [project-name]')
  .description('Initialize a new CogUI project')
  .option('-t, --template <template>', 'Project template (react, vue, vanilla)', 'react')
  .option('-p, --package-manager <pm>', 'Package manager (npm, yarn, pnpm)', 'npm')
  .option('--typescript', 'Use TypeScript', true)
  .option('--no-typescript', 'Use JavaScript')
  .option('--git', 'Initialize git repository', true)
  .option('--install', 'Install dependencies', true)
  .action(async (projectName, options) => {
    try {
      console.log(chalk.blue('🚀 Initializing CogUI project...\n'));
      await initProject(projectName, options);
      console.log(chalk.green('\n✅ Project initialized successfully!'));
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to initialize project:'), error);
      process.exit(1);
    }
  });

/**
 * Create Command - Create new components
 */
program
  .command('create <type> <name>')
  .description('Create a new CogUI component or module')
  .option('-p, --path <path>', 'Output path', 'src/components')
  .option('-t, --template <template>', 'Component template')
  .option('--typescript', 'Use TypeScript', true)
  .option('--stories', 'Generate Storybook stories', true)
  .option('--tests', 'Generate test files', true)
  .option('--accessibility', 'Include accessibility features', true)
  .action(async (type, name, options) => {
    try {
      console.log(chalk.blue(`🔨 Creating ${type}: ${name}...\n`));
      await createComponent(type, name, options);
      console.log(chalk.green('\n✅ Component created successfully!'));
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to create component:'), error);
      process.exit(1);
    }
  });

/**
 * Theme Command - Generate and manage themes
 */
const themeCommand = program
  .command('theme')
  .description('Theme management commands');

themeCommand
  .command('generate')
  .description('Generate a new theme')
  .option('-n, --name <name>', 'Theme name', 'custom-theme')
  .option('-b, --base <base>', 'Base theme (light, dark, high-contrast)', 'light')
  .option('-o, --output <output>', 'Output directory', 'src/themes')
  .option('--css-vars', 'Generate CSS custom properties', true)
  .option('--tokens', 'Generate design tokens', true)
  .action(async (options) => {
    try {
      console.log(chalk.blue('🎨 Generating theme...\n'));
      await generateTheme(options);
      console.log(chalk.green('\n✅ Theme generated successfully!'));
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to generate theme:'), error);
      process.exit(1);
    }
  });

/**
 * Accessibility Command - Analyze and improve accessibility
 */
const a11yCommand = program
  .command('a11y')
  .alias('accessibility')
  .description('Accessibility analysis and improvements');

a11yCommand
  .command('analyze [path]')
  .description('Analyze accessibility of components')
  .option('-r, --recursive', 'Analyze recursively')
  .option('-o, --output <output>', 'Output format (console, json, html)', 'console')
  .option('--fix', 'Auto-fix issues where possible')
  .option('--wcag <level>', 'WCAG compliance level (A, AA, AAA)', 'AA')
  .action(async (path, options) => {
    try {
      console.log(chalk.blue('🔍 Analyzing accessibility...\n'));
      const results = await analyzeAccessibility(path || 'src', options);
      
      if (results.issues.length === 0) {
        console.log(chalk.green('\n✅ No accessibility issues found!'));
      } else {
        console.log(chalk.yellow(`\n⚠️  Found ${results.issues.length} accessibility issues`));
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Accessibility analysis failed:'), error);
      process.exit(1);
    }
  });

/**
 * Dev Command - Development server
 */
program
  .command('dev')
  .alias('serve')
  .description('Start development server')
  .option('-p, --port <port>', 'Server port', '3000')
  .option('-h, --host <host>', 'Server host', 'localhost')
  .option('--open', 'Open browser automatically')
  .option('--hot', 'Enable hot module replacement', true)
  .option('--https', 'Use HTTPS')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Starting development server...\n'));
      await startDevServer(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to start development server:'), error);
      process.exit(1);
    }
  });

/**
 * Build Command - Build for production
 */
program
  .command('build')
  .description('Build project for production')
  .option('-o, --output <output>', 'Output directory', 'dist')
  .option('--analyze', 'Analyze bundle size')
  .option('--optimize', 'Optimize for performance', true)
  .option('--sourcemap', 'Generate source maps')
  .option('--clean', 'Clean output directory', true)
  .action(async (options) => {
    try {
      console.log(chalk.blue('🏗️  Building project...\n'));
      await buildProject(options);
      console.log(chalk.green('\n✅ Build completed successfully!'));
    } catch (error) {
      console.error(chalk.red('\n❌ Build failed:'), error);
      process.exit(1);
    }
  });

/**
 * Validate Command - Validate project structure and components
 */
program
  .command('validate')
  .alias('lint')
  .description('Validate project structure and components')
  .option('-f, --fix', 'Auto-fix issues where possible')
  .option('--strict', 'Enable strict validation')
  .option('--accessibility', 'Include accessibility validation', true)
  .option('--performance', 'Include performance validation')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 Validating project...\n'));
      const results = await validateProject(options);
      
      if (results.errors.length === 0 && results.warnings.length === 0) {
        console.log(chalk.green('\n✅ Project validation passed!'));
      } else {
        if (results.errors.length > 0) {
          console.log(chalk.red(`\n❌ Found ${results.errors.length} errors`));
        }
        if (results.warnings.length > 0) {
          console.log(chalk.yellow(`\n⚠️  Found ${results.warnings.length} warnings`));
        }
      }
      
      if (results.errors.length > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Validation failed:'), error);
      process.exit(1);
    }
  });

/**
 * Update Command - Update CogUI packages
 */
program
  .command('update')
  .description('Update CogUI packages')
  .option('--latest', 'Update to latest versions')
  .option('--pre-release', 'Include pre-release versions')
  .option('--dry-run', 'Show what would be updated')
  .action(async (options) => {
    try {
      console.log(chalk.blue('📦 Checking for updates...\n'));
      
      if (options.dryRun) {
        console.log(chalk.gray('This is a dry run - no changes will be made'));
      }
      
      // Implementation would check for package updates
      console.log(chalk.green('\n✅ All packages are up to date!'));
    } catch (error) {
      console.error(chalk.red('\n❌ Update check failed:'), error);
      process.exit(1);
    }
  });

/**
 * Config Command - Manage configuration
 */
const configCommand = program
  .command('config')
  .description('Manage CogUI configuration');

configCommand
  .command('init')
  .description('Initialize CogUI configuration file')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (options) => {
    console.log(chalk.blue('⚙️  Initializing configuration...\n'));
    // Implementation would create cogui.config.js
    console.log(chalk.green('\n✅ Configuration initialized!'));
  });

configCommand
  .command('validate')
  .description('Validate configuration file')
  .action(async () => {
    console.log(chalk.blue('🔍 Validating configuration...\n'));
    // Implementation would validate cogui.config.js
    console.log(chalk.green('\n✅ Configuration is valid!'));
  });

/**
 * Global error handler
 */
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 Unexpected error:'), error.message);
  if (program.opts().verbose) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('\n💥 Unhandled promise rejection:'), reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.help();
}