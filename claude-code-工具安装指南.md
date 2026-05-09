# Claude Code 工具安装与授权指南

本文档包含 lark-cli 和 meegle CLI 的完整安装、授权指南。
按顺序执行，每一步等用户在浏览器完成操作后再继续。

---

## 1. 安装 lark-cli

```bash
# 安装 CLI
npm install -g @larksuite/cli

# 安装官方 AI Agent Skills（24 个，必装）
npx skills add larksuite/cli -y -g
```

验证：`lark-cli --version`，期望 >= 1.0.23。

### 1.1 初始化配置（自动创建应用）

以 background 方式运行下面的命令，启动后读取输出，从中提取授权链接并发给用户：

```bash
lark-cli config init --new
```

> 该命令会自动在飞书/Lark 开放平台创建一个企业自建应用，输出一个浏览器链接让用户点击完成授权。
> **命令会阻塞等待用户操作，耐心等待，不要中断。**

### 1.2 用户登录（OAuth 授权）

以 background 方式运行，提取授权链接发给用户：

```bash
lark-cli auth login --recommend
```

> `--recommend` 自动选择常用 scope（日历、文档、消息、任务等），无需手动指定。
> 命令会阻塞等待用户在浏览器完成授权。

### 1.3 验证

```bash
lark-cli auth status
```

确认有 bot 和 user 身份。

---

## 2. 安装 Meegle CLI

```bash
npm install -g @lark-project/meegle
```

验证：`meegle inspect`，能列出命令说明安装成功。

### 2.1 OAuth 登录

先检查是否已登录：

```bash
meegle auth status --format json
```

如果 `authenticated` 为 `false`，执行登录：

```bash
meegle auth login --host project.larksuite.com
```

> 如果用户用的是国内飞书项目，改为 `--host project.feishu.cn`。不确定就问用户。

命令会自动打开浏览器让用户 OAuth 授权（浏览器回调流），**阻塞等待**。

> **⚠️ 注意：`--device-code` 方案不可用！**
>
> 不要使用 `meegle auth login --device-code`。该流程会返回错误码 `1000050271`（device authorization 未启用），浏览器上点击授权按钮后无法完成认证。这是 Meegle 服务端的限制，非用户操作问题。
>
> **必须使用默认的浏览器回调流**（不加 `--device-code`），Mac/Windows/Linux 均适用。

> **⚠️ Claude Code 环境下无法直接执行此命令**
>
> Claude Code 运行在非交互式终端，会报错 `the default Authorization Code flow requires an interactive browser callback`。
> 解决方式：向用户展示命令，让用户点击 **"Run in Terminal"** 按钮在交互式终端中执行。完成后用 `meegle auth status --format json` 验证即可。

### 2.2 验证

```bash
meegle auth status --format json
# 确认 authenticated: true
```

---

## 3. 权限配置（安装完成后必做）

安装完 lark-cli 和 Meegle CLI 后，需要一次性配置好所有权限，避免后续使用时反复授权。

### 3.1 开通 Bot 应用权限

Bot 身份使用 `tenant_access_token`，权限需要在飞书开发者后台开通。

先获取你的 App ID：

```bash
lark-cli auth status
# 记下 appId 字段值（格式 cli_xxxxxxxxx）
```

然后在浏览器中打开以下链接（将 `<APP_ID>` 替换为你的实际 appId），一次性开通所有推荐权限：

```
https://open.larksuite.com/page/scope-apply?clientID=<APP_ID>&scopes=docx:document,docx:document:readonly,docs:doc,docs:doc:readonly,docs:permission.member:create,docs:permission.setting:write_only,drive:drive,drive:drive:readonly,drive:drive.metadata:readonly,drive:drive.search:readonly,drive:file,drive:file:readonly,drive:export:readonly,sheets:spreadsheet,sheets:spreadsheet:readonly,bitable:app,bitable:app:readonly,wiki:wiki,wiki:wiki:readonly,im:message,im:message:send_as_bot,im:message:readonly,im:chat,im:chat:readonly,im:resource,contact:user.base:readonly,contact:contact:readonly_as_app,calendar:calendar,calendar:calendar:readonly,task:task,task:task:readonly,approval:approval:readonly
```

覆盖 32 个 scope，涵盖文档、云空间、表格、多维表格、知识库、消息、通讯录、日历、任务、审批。

> **开通后还需发布审批**：
> 1. 在开发者后台进入「版本管理与发布」→ 创建新版本 → 申请线上发布
> 2. 企业管理员审批通过后生效（如果你本人就是管理员，自己审批即可）
> 3. 普通等级权限（消息、通讯录基本信息等）开通后立即生效，无需审批

### 3.2 授权 User 身份权限

User 身份用于访问个人资源（日历、邮箱、个人文档等），需要用户本人 OAuth 授权。

如果步骤 1.2 已经用 `--recommend` 完成了登录，大部分常用 scope 已经授权。
如果需要补充特定领域的权限，可以按域增量授权：

```bash
lark-cli auth login --domain calendar,task,mail
```

或者指定具体 scope：

```bash
lark-cli auth login --scope "calendar:calendar.event:create mail:user_mailbox.message:send"
```

命令会输出浏览器链接，用户需要打开链接 → 登录 → 点击授权 → 回到 IDE 告诉 AI "done"。

> User scope 是累积的，多次 `auth login` 不会覆盖已有权限，只会新增。
> 遇到权限不足时，错误信息中会包含 `hint` 字段，按提示执行即可。

### 3.3 验证权限

```bash
# Bot 身份
lark-cli auth status           # 确认 bot 身份存在
lark-cli im +chat-search --query "test" --as bot   # 测试消息权限

# User 身份
lark-cli auth status           # 确认 user 身份和 scope 列表
lark-cli calendar +agenda --as user                 # 测试日历权限
```

---

## 4. 安装 Skill 文件

### 4.1 lark-cli Skills（已在步骤 1 完成）

步骤 1 中的 `npx skills add larksuite/cli -y -g` 已自动安装 24 个官方 lark-cli skill。
如需更新到最新版本：

```bash
npx skills add larksuite/cli -y -g
```

### 4.2 meegle Skill

meegle skill 不在官方 npm 包中，需要检查是否已存在：

```bash
ls ~/.agents/skills/meegle/SKILL.md
```

如果不存在，需要手动创建。参考 meegle CLI 仓库: https://github.com/larksuite/meegle-cli

---

## 5. 验证清单

```bash
lark-cli --version
lark-cli auth status
meegle auth status --format json
ls ~/.agents/skills/lark-shared/SKILL.md
ls ~/.agents/skills/lark-doc/SKILL.md
ls ~/.agents/skills/meegle/SKILL.md
```

三个 CLI 命令通过 + Skill 文件存在 = 全部完成。

> **更新 CLI 和 Skills**：
> ```bash
> npm update -g @larksuite/cli && npx skills add larksuite/cli -g -y
> ```
> 更新完成后需要**退出并重新打开 AI Agent** 以加载最新 Skills。
