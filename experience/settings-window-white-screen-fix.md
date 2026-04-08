# 设置窗口白屏问题复盘

## 问题现象
- 主挂件点击 `系统设置` 后，会弹出一个独立窗口，但窗口内容是白屏。
- 白屏状态下窗口无法正常进入后续交互，关闭路径也表现异常。
- Rust 侧日志稳定停在：

```text
[floatflow-debug] open_settings_window:start
[floatflow-debug] ensure_settings_window:create ...
```

- 之后看不到：

```text
ensure_settings_window:created
focus_settings_window:start
open_settings_window:success
```

## 初步排查结论
- 问题不在 React 设置页组件本身。
- 问题也不在前端路由切换本身，因为浏览器里的主界面渲染是正常的。
- 关键线索是日志停在 `WebviewWindowBuilder::build()` 前后，说明故障位于 Tauri 的运行时窗口创建链路。

## 根因
- Windows 下，Tauri 运行时创建新窗口时，如果是在同步 `#[tauri::command]` 中执行，可能在 `WebviewWindowBuilder::build()` 阶段卡住。
- 一旦卡住：
  - 新窗口只会表现为白屏
  - 后续的聚焦逻辑不会继续执行
  - 关闭逻辑也会一起表现异常
- 本次问题正是这个场景：
  - `open_settings_window`
  - `close_settings_window`
 之前是同步 command。

## 本次修复方案
- 将 Tauri 侧窗口管理命令改为异步：
  - `open_settings_window`
  - `close_settings_window`
- 保留原有调试日志，继续观察窗口创建、聚焦、关闭链路。
- 新增 Rust 回归测试，约束窗口管理命令保持 `async`，避免后续重构时把问题重新引回。

## 关键代码位置
- `src-tauri/src/lib.rs`
  - `async fn open_settings_window(...)`
  - `async fn close_settings_window(...)`
  - `window_management_commands_stay_async_to_avoid_windows_deadlocks`

## 修复后预期日志
- 点击 `系统设置` 后，应该继续看到：

```text
[floatflow-debug] ensure_settings_window:created
[floatflow-debug] focus_settings_window:start
[floatflow-debug] open_settings_window:success
```

## 已完成验证
- `cargo test`
- `cargo check`
- `npm test -- --run`
- `npm run build`

## 后续经验
- 以后在 Tauri 中做“运行时创建窗口”的能力时，优先把对应 command 设计成 `async`。
- 如果新窗口出现白屏，先确认日志是否停在 `WebviewWindowBuilder::build()`，不要第一时间把问题归因到 React 渲染。
- 多窗口场景下，日志一定要覆盖这几个节点：
  - command 入口
  - window builder 创建前
  - build 成功后
  - focus/show 后

## 一句话结论
- 这次设置窗口白屏的根因，是 Windows + Tauri 在同步 command 中创建运行时窗口导致的构建卡住；把窗口 command 改成 `async` 后问题恢复正常。
