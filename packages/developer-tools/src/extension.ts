import * as vscode from 'vscode';
import { ComponentGenerator } from './generators/ComponentGenerator';
import { ThemeGenerator } from './generators/ThemeGenerator';
import { AccessibilityAnalyzer } from './analyzers/AccessibilityAnalyzer';
import { DevServerManager } from './services/DevServerManager';
import { DesignSystemViewer } from './views/DesignSystemViewer';
import { ComponentValidator } from './validators/ComponentValidator';

/**
 * VS Code Extension for CogUI Developer Tools
 * Provides comprehensive development support for CogUI applications
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('CogUI Developer Tools extension is now active!');

    // Initialize services
    const componentGenerator = new ComponentGenerator(context);
    const themeGenerator = new ThemeGenerator(context);
    const accessibilityAnalyzer = new AccessibilityAnalyzer(context);
    const devServerManager = new DevServerManager(context);
    const designSystemViewer = new DesignSystemViewer(context);
    const componentValidator = new ComponentValidator(context);

    // Register commands
    registerCommands(context, {
        componentGenerator,
        themeGenerator,
        accessibilityAnalyzer,
        devServerManager,
        designSystemViewer,
        componentValidator
    });

    // Register providers
    registerProviders(context);

    // Setup workspace watchers
    setupWorkspaceWatchers(context);

    // Setup status bar
    setupStatusBar(context);

    // Auto-start features if enabled
    autoStartFeatures(context);

    vscode.window.showInformationMessage('CogUI Developer Tools activated successfully!');
}

/**
 * Register VS Code commands
 */
function registerCommands(
    context: vscode.ExtensionContext,
    services: {
        componentGenerator: ComponentGenerator;
        themeGenerator: ThemeGenerator;
        accessibilityAnalyzer: AccessibilityAnalyzer;
        devServerManager: DevServerManager;
        designSystemViewer: DesignSystemViewer;
        componentValidator: ComponentValidator;
    }
) {
    const commands = [
        // Component Generation
        vscode.commands.registerCommand('cogui.createComponent', async (uri?: vscode.Uri) => {
            try {
                await services.componentGenerator.createComponent(uri);
                vscode.window.showInformationMessage('CogUI component created successfully!');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to create component: ${error}`);
            }
        }),

        // Theme Generation
        vscode.commands.registerCommand('cogui.generateTheme', async () => {
            try {
                await services.themeGenerator.generateTheme();
                vscode.window.showInformationMessage('Theme generated successfully!');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to generate theme: ${error}`);
            }
        }),

        // Accessibility Analysis
        vscode.commands.registerCommand('cogui.analyzeAccessibility', async () => {
            try {
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) {
                    vscode.window.showWarningMessage('No active editor found');
                    return;
                }

                const analysis = await services.accessibilityAnalyzer.analyzeDocument(activeEditor.document);
                await services.accessibilityAnalyzer.showResults(analysis);
                
                vscode.window.showInformationMessage('Accessibility analysis completed!');
            } catch (error) {
                vscode.window.showErrorMessage(`Accessibility analysis failed: ${error}`);
            }
        }),

        // Development Server
        vscode.commands.registerCommand('cogui.startDevServer', async () => {
            try {
                await services.devServerManager.start();
                vscode.window.showInformationMessage('Development server started!');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to start development server: ${error}`);
            }
        }),

        vscode.commands.registerCommand('cogui.stopDevServer', async () => {
            try {
                await services.devServerManager.stop();
                vscode.window.showInformationMessage('Development server stopped!');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to stop development server: ${error}`);
            }
        }),

        // Design System
        vscode.commands.registerCommand('cogui.openDesignSystem', async () => {
            try {
                await services.designSystemViewer.open();
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to open design system: ${error}`);
            }
        }),

        // Component Validation
        vscode.commands.registerCommand('cogui.validateComponents', async () => {
            try {
                const results = await services.componentValidator.validateWorkspace();
                await services.componentValidator.showResults(results);
                vscode.window.showInformationMessage('Component validation completed!');
            } catch (error) {
                vscode.window.showErrorMessage(`Component validation failed: ${error}`);
            }
        }),

        // Quick Actions
        vscode.commands.registerCommand('cogui.quickStart', async () => {
            const options = [
                'Create New Component',
                'Generate Theme',
                'Analyze Accessibility',
                'Start Dev Server',
                'Open Design System'
            ];

            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: 'Choose a CogUI action'
            });

            switch (selected) {
                case 'Create New Component':
                    vscode.commands.executeCommand('cogui.createComponent');
                    break;
                case 'Generate Theme':
                    vscode.commands.executeCommand('cogui.generateTheme');
                    break;
                case 'Analyze Accessibility':
                    vscode.commands.executeCommand('cogui.analyzeAccessibility');
                    break;
                case 'Start Dev Server':
                    vscode.commands.executeCommand('cogui.startDevServer');
                    break;
                case 'Open Design System':
                    vscode.commands.executeCommand('cogui.openDesignSystem');
                    break;
            }
        })
    ];

    // Register all commands
    commands.forEach(command => context.subscriptions.push(command));
}

/**
 * Register VS Code providers
 */
function registerProviders(context: vscode.ExtensionContext) {
    // Hover provider for CogUI components
    const hoverProvider = vscode.languages.registerHoverProvider(
        ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'],
        {
            provideHover(document, position) {
                const wordRange = document.getWordRangeAtPosition(position);
                const word = document.getText(wordRange);

                // Check if it's a CogUI component
                if (word.startsWith('Cog') || word.includes('CogUI')) {
                    const hoverContent = new vscode.MarkdownString();
                    hoverContent.appendMarkdown(`**CogUI Component: ${word}**\n\n`);
                    hoverContent.appendMarkdown('This is a CogUI component with built-in accessibility features.\n\n');
                    hoverContent.appendMarkdown('[View Documentation](https://cogui.dev/components)');
                    
                    return new vscode.Hover(hoverContent);
                }
            }
        }
    );

    // Completion provider for CogUI imports
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'],
        {
            provideCompletionItems() {
                const completions = [
                    new vscode.CompletionItem('CogUI Button', vscode.CompletionItemKind.Class),
                    new vscode.CompletionItem('CogUI Input', vscode.CompletionItemKind.Class),
                    new vscode.CompletionItem('CogUI Modal', vscode.CompletionItemKind.Class),
                    new vscode.CompletionItem('CogUI Card', vscode.CompletionItemKind.Class),
                    new vscode.CompletionItem('CogUIProvider', vscode.CompletionItemKind.Class),
                    new vscode.CompletionItem('useTheme', vscode.CompletionItemKind.Function),
                    new vscode.CompletionItem('useAccessibility', vscode.CompletionItemKind.Function),
                    new vscode.CompletionItem('useAdaptiveUI', vscode.CompletionItemKind.Function)
                ];

                return completions;
            }
        }
    );

    // Diagnostic provider for accessibility issues
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('cogui-accessibility');
    context.subscriptions.push(diagnosticCollection);

    // Code action provider for quick fixes
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(
        ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'],
        {
            provideCodeActions(document, range, context) {
                const actions: vscode.CodeAction[] = [];

                // Add accessibility improvements
                const accessibilityAction = new vscode.CodeAction(
                    'Add accessibility attributes',
                    vscode.CodeActionKind.QuickFix
                );
                accessibilityAction.command = {
                    title: 'Add accessibility attributes',
                    command: 'cogui.addAccessibilityAttributes',
                    arguments: [document, range]
                };
                actions.push(accessibilityAction);

                return actions;
            }
        }
    );

    context.subscriptions.push(hoverProvider, completionProvider, codeActionProvider);
}

/**
 * Setup workspace file watchers
 */
function setupWorkspaceWatchers(context: vscode.ExtensionContext) {
    // Watch for CogUI configuration changes
    const configWatcher = vscode.workspace.createFileSystemWatcher('**/cogui.config.{js,ts,json}');
    
    configWatcher.onDidChange(() => {
        vscode.window.showInformationMessage('CogUI configuration changed. Reloading...');
        // Reload configuration
    });

    configWatcher.onDidCreate(() => {
        vscode.window.showInformationMessage('CogUI configuration file created!');
    });

    configWatcher.onDidDelete(() => {
        vscode.window.showWarningMessage('CogUI configuration file deleted!');
    });

    // Watch for component changes
    const componentWatcher = vscode.workspace.createFileSystemWatcher('**/src/components/**/*.{ts,tsx,js,jsx}');
    
    componentWatcher.onDidChange((uri) => {
        // Trigger component validation
        vscode.commands.executeCommand('cogui.validateComponent', uri);
    });

    context.subscriptions.push(configWatcher, componentWatcher);
}

/**
 * Setup status bar items
 */
function setupStatusBar(context: vscode.ExtensionContext) {
    // CogUI status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = '$(cogui) CogUI';
    statusBarItem.tooltip = 'CogUI Developer Tools';
    statusBarItem.command = 'cogui.quickStart';
    statusBarItem.show();

    // Development server status
    const serverStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    serverStatusItem.text = '$(server) Server: Stopped';
    serverStatusItem.tooltip = 'CogUI Development Server';
    serverStatusItem.command = 'cogui.startDevServer';
    serverStatusItem.show();

    context.subscriptions.push(statusBarItem, serverStatusItem);
}

/**
 * Auto-start features based on configuration
 */
function autoStartFeatures(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('cogui');
    
    if (config.get('server.autoStart')) {
        vscode.commands.executeCommand('cogui.startDevServer');
    }

    if (config.get('accessibility.enableLinting')) {
        // Enable accessibility linting
    }
}

/**
 * Extension deactivation
 */
export function deactivate() {
    console.log('CogUI Developer Tools extension deactivated');
}