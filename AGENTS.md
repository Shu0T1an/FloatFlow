# Repository Guidelines

## 项目结构与模块组织
`src/` 是 React + TypeScript 前端代码。`src/app/` 放应用壳层与运行时接线，`src/features/` 放面向用户的功能模块，`src/shared/` 放可复用的领域逻辑与 UI 基础组件，`src/store/` 放 Zustand 状态管理，`src/desktop/` 放 Tauri 交互适配层。测试文件与源码就近放置，命名为 `*.test.ts` 或 `*.test.tsx`。`src-tauri/` 保存 Rust 宿主、Tauri 配置、能力声明和图标。`dist/`、`node_modules/`、`src-tauri/target/` 都是生成产物，不要手改。产品说明与计划文档位于 `doc/` 和 `docs/`。

## 构建、测试与开发命令
- `npm install`：安装前端依赖与 Tauri CLI。
- `npm run dev`：启动 Vite 开发服务器，默认端口 `1420`。
- `npm run tauri dev`：启动完整桌面应用，联动 Rust 宿主与前端。
- `npm test`：以 `jsdom` 环境执行一次 Vitest 测试。
- `npm run build`：先执行 `tsc` 类型检查，再输出生产构建到 `dist/`。
- `npm run check`：执行主校验流程，先测后构建。

在 Windows 上进行 Tauri 构建时，需要 Windows SDK 提供的 `rc.exe` 已加入 `PATH`，或通过 `RC` 环境变量显式指定。

## 代码风格与命名约定
保持现有风格：TypeScript 开启严格模式，使用 2 空格缩进、分号和双引号。应用内部导入优先使用 `@/` 别名。React 组件文件使用 `PascalCase`，如 `TodoPanel.tsx`；工具函数、状态方法和普通变量使用 `camelCase`；非组件 TypeScript 文件使用 kebab-case，例如 `app-store.ts`。测试文件应与被测代码同目录。`src-tauri/src/` 下的 Rust 代码保持 `rustfmt` 友好，并使用 `snake_case`。

## 测试规范
测试框架为 Vitest，配合 Testing Library 与 `jest-dom`。优先编写贴近模块的单元测试，例如 `src/features/memo/MemoPanel.test.tsx`。重点覆盖状态更新、领域函数和关键交互流程。提交 PR 前至少运行 `npm run check`；如果修改了 Rust 或 Tauri 行为，再补跑一次 `npm run tauri dev` 做本地验证。

## `task.md` 使用说明
`task.md` 是当前阶段的任务看板与验收记录，开始新一轮开发前先阅读，确认背景、范围、进行中事项、风险和验证状态。实现过程中如果完成了明确任务、调整了处理结论、补充了验证结果，或发现新的阻塞项，需要同步更新对应条目，而不是只改代码不改记录。更新时优先保持原有结构，例如“已完成 / 进行中 / 未开始 / 验证记录 / 下一步计划”，并使用可核对的描述。不要在未沟通的情况下随意扩大或重写“当前范围”和“明确不做”部分；如果需求发生变化，应先更新范围说明，再继续实现。

## 提交与 Pull Request 规范
当前工作区快照不包含 Git 历史，因此无法直接总结既有提交风格。建议统一使用简短的祈使句提交标题，例如 `Add quick capture focus handling`。每次提交只聚焦一个变更主题。PR 需要说明用户可见影响、列出验证命令、关联任务或问题；涉及界面改动时，附上截图或简短录屏。
