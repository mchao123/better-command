import { ArgType, command } from "./mod";

declare module './mod' {
    interface Argument {
        description?: string;
    }

    interface Command {
        description?: string;
    }

    interface CommandParserOpts {
        examples?: string[];
        version?: string;
    }

}

export const helpCommand = command({
    name: 'help',
    alias: ['-h'],
    description: '帮助信息',
    action: ({ opts, args, commands = [] }) => {
        const output: string[] = [];

        const addLine = (text = '', indent = 0) =>
            output.push('  '.repeat(indent) + text);

        addLine();
        addLine(opts.description);
        addLine('\nOptions:');

        const maxAliasLength = args.reduce((max, arg) => {
            const length = `--${arg.name}, ${arg.alias.map(a => `-${a}`).join(', ')}`.length;
            return Math.max(max, length);
        }, 0);

        for (const arg of args) {
            const argName = `--${arg.name}, ${arg.alias.map(a => `-${a}`).join(', ')}`;
            const typeInfo = arg.type === ArgType.Boolean ? '' : ` <${ArgType[arg.type].toLowerCase()}>`;
            const requiredInfo = arg.required ? ' (required)' : '';
            addLine(`${argName.padEnd(maxAliasLength)}${typeInfo}  ${arg.description}${requiredInfo}`, 1);
        }

        if (opts.examples?.length) {
            addLine();
            addLine('Examples:');
            opts.examples.forEach(example => addLine(`${opts.name} ${example}`, 1));
        }

        if (commands.length) {
            addLine();
            addLine('Commands:');
            const maxCmdLength = commands.reduce((max, cmd) => {
                const length = [cmd.name, ...cmd.alias].join(', ').length;
                return Math.max(max, length);
            }, 0);

            for (const cmd of commands) {
                const aliases = [cmd.name, ...cmd.alias].join(', ');
                addLine(`${aliases.padEnd(maxCmdLength)}  ${cmd.description}`, 1);
            }
        }
        addLine();
        console.log(output.join('\n'));
    },
})
