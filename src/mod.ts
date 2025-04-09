export enum ArgType {
  String = 0,
  Number = 1,
  Boolean = 2,
}


export type CommandActionEvent<T extends CommandParserInit = CommandParserInit> = {
  opts: T;
  args: readonly ArgumentObject[];
  argv: string[];
  commands: CommandObject[];
}

export declare interface Argument {
}

export declare interface Command {
}

export declare interface CommandParserOpts extends Command {
}


export type ArgumentObject<TName extends string = string, TRequired extends boolean = false, TAaray extends boolean = false, TType extends ArgType = ArgType> = Argument & {
  name: TName;
  alias: string[];
  type: TType;
  required: TRequired;
  isArray: TAaray;
}

export type CommandObject = Command & {
  name: string;
  alias: string[];
  action: (e: CommandActionEvent) => void;
}

export type CommandParserObject<T extends readonly ArgumentObject<any, any, any, any>[], Opts extends CommandParserInit = CommandParserInit> = {
  opts: Opts;
  parse: (argv: string[], callback: (args: ArgumentsToObject<T>) => void, onError?: (err: Error, args: string[]) => void) => Promise<boolean>;
}




type ArgTypeToTS<T extends ArgType> =
  T extends ArgType.String ? string :
  T extends ArgType.Number ? number :
  T extends ArgType.Boolean ? boolean :
  never;

type ArgumentsToObject<T extends readonly ArgumentObject<any, any, any, any>[]> = {
  [P in T[number]as P['name']]: P extends ArgumentObject<any, any, true, any>
  ? ArgTypeToTS<P['type']>[]
  : P extends ArgumentObject<any, true, false, any>
  ? ArgTypeToTS<P['type']>
  : ArgTypeToTS<P['type']> | undefined;
};




interface CommandArgInit<TType extends ArgType = ArgType, TRequired extends boolean = false, TAaray extends boolean = false> extends Argument {
  type: TType;
  required?: TRequired;
  isArray?: TAaray;
}

export const arg = <
  const TName extends string,
  const TRequired extends boolean = false,
  const TArray extends boolean = false,
  const TType extends ArgType = ArgType.String,
>(
  name: TName | [TName, ...string[]],
  init: CommandArgInit<TType, TRequired, TArray>,
): ArgumentObject<TName, TRequired, TArray, TType> => ({
  ...init,
  name: Array.isArray(name) ? name[0] : name,
  alias: Array.isArray(name) ? name.slice(1) : [],
  isArray: init.isArray ?? false as TArray,
  required: init.required ?? false as TRequired,
  type: init.type ?? ArgType.String,

});

const parseValue = (value: string, type: ArgType, name: string): any => {
  if (type === ArgType.Number) {
    const num = Number(value);
    if (isNaN(num)) throw new Error(`Invalid number value: ${value} for ${name}`);
    return num;
  }
  if (type === ArgType.Boolean) {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return value;
};

const parseArg = (current: string): [string, string | null] => {
  // Handle --key=value format
  if (current.includes('=')) {
    const [key, value] = current.split('=', 2);
    return [key, value];
  }
  return [current, null];
};

const addOrSetValue = (result: Record<string, any>, name: string, value: any, isArray: boolean) => {
  if (isArray) {
    if (!result[name]) {
      result[name] = [value];
    } else {
      result[name].push(value);
    }
  } else {
    result[name] = value;
  }
};

const isCommandParser = (obj: any): obj is CommandParserObject<any, any> => {
  return 'parse' in obj;
}


interface CommandInit extends Command {
  name: string;
  alias?: string[];
  action: (e: CommandActionEvent) => void;
}

export const command = <const T extends (CommandInit | CommandParserObject<any, any>), Args extends (T extends CommandParserObject<any, any> ? ([Parameters<T['parse']>[1], Parameters<T['parse']>[2]] | [Parameters<T['parse']>[1]]) : [])>(init: T, ...args: Args): CommandObject => {

  if (isCommandParser(init)) {
    return {
      ...init.opts,
      name: init.opts.name,
      alias: init.opts.alias ?? [],

      action: (e: CommandActionEvent) => {
        // @ts-ignore
        init.parse(e.argv.splice(1), ...args);
      },
    };
  } else {
    return {
      ...init,
      alias: init.alias ?? [],
    };
  }
}




interface CommandParserInit extends CommandParserOpts {
  name: string;
  alias?: string[];
  commands?: CommandObject[];
}

export const defineCommandParser = <Opts extends CommandParserInit, T extends readonly ArgumentObject<any, any, any, any>[]>(
  opts: Opts,
  ...args: T
): CommandParserObject<T, Opts> => {
  const commands = opts.commands ?? [];

  return {
    opts,
    parse: async (
      argv: string[],
      callback: (args: ArgumentsToObject<T>) => Promise<void> | void = console.log,
      onError: (err: Error, args: string[]) => void = (error) => {
        console.error(error.message);
      },
    ) => {
      argv = argv.filter(Boolean);

      const currentBasicCmd = commands.find(cmd =>
        cmd.name === argv[0] || cmd.alias.includes(argv[0])
      );
      if (currentBasicCmd) {
        currentBasicCmd.action({ opts, args, argv, commands });
        return true;
      }

      const argMap = new Map<string, ArgumentObject>();
      for (const arg of args) {
        argMap.set(`--${arg.name}`, arg);
        for (const alias of arg.alias) {
          argMap.set(`-${alias}`, arg);
        }
      }

      const result: Record<string, any> = {};
      let i = 0;
      let usingNamedArgs = false;
      let positionalIndex = 0;

      try {
        while (i < argv.length) {
          const current = argv[i];
          if (current.startsWith('-')) {
            usingNamedArgs = true;
            const [key, value] = parseArg(current);
            const argDef = argMap.get(key);
            if (!argDef) throw new Error(`Unknown option: ${key}`);

            if (argDef.type === ArgType.Boolean) {
              if (value !== null) {
                // Handle --bool=true/false format
                addOrSetValue(result, argDef.name, value.toLowerCase() === 'true' || value === '1', argDef.isArray);
              } else if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
                // Handle --bool true/false format
                addOrSetValue(result, argDef.name, parseValue(argv[++i], ArgType.Boolean, argDef.name), argDef.isArray);
              } else {
                // Handle flag format (--bool)
                addOrSetValue(result, argDef.name, true, argDef.isArray);
              }
              i++;
            } else {
              if (value !== null) {
                // Handle --key=value format
                addOrSetValue(result, argDef.name, parseValue(value, argDef.type, argDef.name), argDef.isArray);
                i++;
              } else {
                // Handle --key value format
                if (i + 1 >= argv.length) throw new Error(`Missing value for option: ${key}`);
                addOrSetValue(result, argDef.name, parseValue(argv[++i], argDef.type, argDef.name), argDef.isArray);
                i++;
              }
            }
          } else if (usingNamedArgs) {
            throw new Error(`Unexpected positional argument: ${current} after named arguments`);
          } else if (positionalIndex < args.length) {
            const argDef = args[positionalIndex++];
            addOrSetValue(result, argDef.name, parseValue(current, argDef.type, argDef.name), argDef.isArray);
            i++;
          } else {
            i++;
          }
        }

        // Set defaults and validate required args
        for (const argDef of args) {
          if (result[argDef.name] === undefined) {
            if (argDef.required) throw new Error(`Missing required argument: ${argDef.name}`);
            result[argDef.name] = argDef.isArray ? [] : (argDef.type === ArgType.Boolean ? false : undefined);
          }
        }

        await callback(result as ArgumentsToObject<T>);
        return true;
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)), argv);
        return false;
      }
    }
  }
};
