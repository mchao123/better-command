# better-command

一个轻量化的类型友好的命令行解析工具，适用于Bun运行时。提供完整的 TypeScript 类型支持和灵活的命令行参数处理能力。

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 特性

- 🎯 完整的 TypeScript 类型支持
- 🚀 轻量级设计，零依赖
- 💪 支持命令嵌套
- 🎨 灵活的参数解析
- 📦 支持位置参数和命名参数
- 🔧 内置帮助命令生成

## 安装

传统Nodejs
```bash
bun add better-command
# 或
npm install better-command
# 或
yarn add better-command
# 或
pnpm add better-command

```

## 快速开始

```typescript
// index.ts
import { defineCommandParser, arg, ArgType } from 'better-command';
import { helpCommand } from 'better-command/plugin';

const { parse } = defineCommandParser(
  {
    name: 'mycli',
    commands: [helpCommand],
  },
  arg('name', { type: ArgType.String, required: true }),
  arg(['port', 'p'], { type: ArgType.Number }),
  arg(['debug', 'd'], { type: ArgType.Boolean })
);

parse.parse(process.argv.splice(2), (args) => {
  console.log('Name:', args.name); // args.name is string
  console.log('Port:', args.port); // args.port is number|undefined
  console.log('Debug:', args.debug); // args.debug is boolean|undefined
});
```
```bash
bun run index.ts test 3000
# Name: test
# Port: 3000
# Debug: undefined

bun run index.ts --name test --port 3000 --debug true
# Name: test
# Port: 3000
# Debug: true

bun run index.ts help
# help info...
```

### 自定义命令
```typescript
import { defineCommandParser, arg, ArgType, command } from 'better-command';

const test2Parser = defineCommandParser(
  {
    name: 'test2',
  },
  arg('name', { type: ArgType.String, required: true }),
  arg(['port', 'p'], { type: ArgType.Number }),
  arg(['debug', 'd'], { type: ArgType.Boolean })
);

const { parse } = defineCommandParser(
  {
    name: 'mycli',
    commands: [
      command({
        name: 'test',
        action: (e) => {
          console.log('test command');
        },
      }),
      command(test2Parser, (args) => {
        console.log('test2 command', args);
      }),
    ],
  }
);

parse.parse(process.argv.splice(2));
```

```bash
bun run index.ts test
# test command

bun run index.ts test2 test 3000
# test2 command { name: 'test', port: 3000, debug: undefined }
```
### 扩充类型
有些时候可能需要对命令传入的对象进行扩充，但是传入新属性在命令中类型会丢失，此时则可以使用ts的接口扩充。
```typescript
import { defineCommandParser, arg, ArgType, command } from 'better-command';

declare module 'better-command' {
  interface Argument { // 对应的是arg方法
    description?: string;
  }

  interface Command { // 对应的是command方法
    description?: string;
  }

  interface CommandParserOpts { // 对应的是defineCommandParser方法，注意：CommandParserOpts本身继承了Command
    examples?: string[];
    version?: string;
  }
}

const { parse } = defineCommandParser({
  name: 'mycli',
  description: 'mycli description',
  examples: ['mycli test', 'mycli test2'],
  version: '1.0.0',
  commands: [
    command({
      name: 'version',
      alias: ['-v', '--version'],
      description: '查看程序版本',
      action: (e) => {
        console.log(e.opts.version); // e.opts is string|undefined
        // log: 1.0.0
      },
    }),
  ],
})
// ...
```


## 其它

1. 这个包我最初是给bun使用的，nodejs用户版本可能需要稍微高一些（我也不确定）
2. 不咋会写文档，有问题欢迎PR
3. 如果可以的话，请给仓库点个Star，感谢！！！


## License

MIT License


