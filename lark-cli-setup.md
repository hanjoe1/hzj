# lark-cli 企业应用初始化与权限配置

本文档面向 AI Agent（Cursor / Claude Code）执行。用户只需将本文档喂给 IDE，说"按照这个指南帮我完成 lark-cli 的安装和配置"。

---

## 第一阶段：安装

```bash
node --version  # 需要 >= 18
npm install -g @larksuite/cli
lark-cli --version
```

如果 `node` 不存在，提示用户先安装 Node.js LTS（https://nodejs.org），安装后重启终端。

---

## 第二阶段：创建企业应用

```bash
lark-cli config init --new
```

该命令会阻塞并输出一个二维码和链接。

**需要用户手动操作：**
1. 用飞书/Lark App 内置扫码器扫描终端中的二维码（不要用手机相机）
2. 扫码后会在飞书开放平台自动创建一个企业自建应用
3. 等待企业管理员审批该应用（管理员会收到飞书通知，一键审批）
4. 审批通过后回到 IDE 告诉 AI "done"

验证：

```bash
lark-cli auth status
```

应显示 `identity: bot` 和有效的 `appId`。

---

## 第三阶段：开通 Bot 应用权限（scope）

Bot 身份使用 `tenant_access_token`，权限需要在飞书开发者后台开通，不需要 `auth login`。

**需要用户手动操作：**

在浏览器中打开以下链接，一次性开通所有推荐权限：

```
https://open.larksuite.com/page/scope-apply?clientID=<APP_ID>&scopes=docx:document,docx:document:readonly,docs:doc,docs:doc:readonly,docs:permission.member:create,docs:permission.setting:write_only,drive:drive,drive:drive:readonly,drive:drive.metadata:readonly,drive:drive.search:readonly,drive:file,drive:file:readonly,drive:export:readonly,sheets:spreadsheet,sheets:spreadsheet:readonly,bitable:app,bitable:app:readonly,wiki:wiki,wiki:wiki:readonly,im:message,im:message:send_as_bot,im:message:readonly,im:chat,im:chat:readonly,im:resource,contact:user.base:readonly,contact:contact:readonly_as_app,calendar:calendar,calendar:calendar:readonly,task:task,task:task:readonly,approval:approval:readonly
```

> **AI Agent 注意**：`<APP_ID>` 需要替换为 `lark-cli auth status` 返回的 `appId` 值。用以下命令获取并拼接完整 URL：
>
> ```bash
> lark-cli auth status
> # 从输出中提取 appId 字段（格式为 cli_xxxxxxxxx）
> # 将上面 URL 中的 <APP_ID> 替换为实际值
> ```

权限覆盖 9 大业务域（32 个 scope），每个都有明确用途：

| 域 | 权限 | 说明 | 等级 |
|---|---|---|---|
| **文档** | `docx:document` | 创建和编辑新版文档（含只读） | 高级 |
| | `docx:document:readonly` | 查看新版文档 | 高级 |
| | `docs:doc` | 编辑旧版文档（含只读） | 高级 |
| | `docs:doc:readonly` | 查看旧版文档 | 高级 |
| | `docs:permission.member:create` | 添加文档协作者 | — |
| | `docs:permission.setting:write_only` | 修改文档分享设置 | — |
| **云空间** | `drive:drive` | 完整的云空间文件读写（含只读） | 高级 |
| | `drive:drive:readonly` | 查看和下载云空间文件 | 高级 |
| | `drive:drive.metadata:readonly` | 查看文件元数据 | 高级 |
| | `drive:drive.search:readonly` | 搜索云文档 | 高级 |
| | `drive:file` | 上传和下载文件 | 高级 |
| | `drive:file:readonly` | 下载文件 | 高级 |
| | `drive:export:readonly` | 导出云文档为本地文件 | 高级 |
| **表格** | `sheets:spreadsheet` | 电子表格完整读写（含只读） | 高级 |
| | `sheets:spreadsheet:readonly` | 查看电子表格 | 高级 |
| **多维表格** | `bitable:app` | 多维表格完整读写（含只读） | 高级 |
| | `bitable:app:readonly` | 查看多维表格 | 高级 |
| **知识库** | `wiki:wiki` | 知识库完整读写（含只读） | 高级 |
| | `wiki:wiki:readonly` | 查看知识库 | 高级 |
| **消息** | `im:message` | 收发单聊和群聊消息 | 普通 |
| | `im:message:send_as_bot` | 以应用身份发消息 | 普通 |
| | `im:message:readonly` | 读取消息内容 | 普通 |
| | `im:chat` | 获取和管理群组信息 | 普通 |
| | `im:chat:readonly` | 获取群组信息 | 普通 |
| | `im:resource` | 上传图片和文件资源 | 高级 |
| **通讯录** | `contact:user.base:readonly` | 获取用户基本信息（姓名、头像） | 普通 |
| | `contact:contact:readonly_as_app` | 以应用身份读取通讯录 | 普通 |
| **日历** | `calendar:calendar` | 日历完整读写 | 高级 |
| | `calendar:calendar:readonly` | 查看日历和日程 | 普通 |
| **任务** | `task:task` | 创建和管理任务 | 高级 |
| | `task:task:readonly` | 查看任务 | 普通 |
| **审批** | `approval:approval:readonly` | 查看审批定义和实例 | 高级 |

> **关于权限等级**：
> - **普通**权限：开通后立即生效，无需管理员审批
> - **高级**权限：开通后需要创建应用版本并提交发布，由企业管理员审批后生效
>
> **操作步骤**：
> 1. 打开上面的链接，在权限管理页面批量开通所有权限
> 2. 进入「版本管理与发布」→ 创建新版本 → 申请线上发布
> 3. 企业管理员审批通过后，所有权限生效
>
> 如果你本人就是管理员，可以自己审批通过。

---

## 第四阶段：User 身份授权（OAuth）

User 身份用于访问用户个人资源（日历、邮箱、个人文档等），需要用户本人 OAuth 授权。

以下命令按业务域分组，一次性申请所有常用 user scope。

推荐一次性全部授权（scope 之间用空格分隔，`auth login` 的 scope 是累积的，多次登录不会覆盖已有权限）：

```bash
lark-cli auth login --scope "auth:user.id:read contact:user.base:readonly contact:user.basic_profile:readonly contact:user:search docs:document.content:read docs:document.comment:read docs:permission.member:create docs:permission.setting:write_only docx:document:readonly docx:document:create docx:document:write_only drive:drive.metadata:readonly drive:file:view_record:readonly search:docs:read sheets:spreadsheet.meta:read sheets:spreadsheet.meta:write_only sheets:spreadsheet:create sheets:spreadsheet:read sheets:spreadsheet:write_only slides:presentation:read space:document:retrieve base:app:read base:dashboard:read base:field:read base:form:read base:history:read base:record:read base:role:read base:table:read base:view:read base:workflow:read wiki:member:retrieve wiki:node:read wiki:node:retrieve wiki:space:read wiki:space:retrieve im:chat.members:read im:chat.members:write_only im:chat:read im:chat:update im:message im:message.group_msg:get_as_user im:message.p2p_msg:get_as_user im:message.pins:read im:message.pins:write_only im:message.reactions:read im:message.reactions:write_only im:message.send_as_user im:message:readonly im:message:recall calendar:calendar:read calendar:calendar.event:read calendar:calendar.event:create calendar:calendar.event:update calendar:calendar.event:delete calendar:calendar.event:reply calendar:calendar.free_busy:read task:task:read task:tasklist:read approval:instance:read approval:task:read mail:user_mailbox:readonly mail:user_mailbox.message:readonly mail:user_mailbox.message.subject:read mail:user_mailbox.message.body:read mail:user_mailbox.message.address:read mail:user_mailbox.folder:read mail:user_mailbox.folder:write mail:user_mailbox.message:modify mail:user_mailbox.message:send mail:user_mailbox.mail_contact:read mail:user_mailbox.mail_contact:write mail:user_mailbox.rule:read mail:user_mailbox.rule:write mail:event minutes:minutes.basic:read minutes:minutes.search:read okr:okr.setting:read board:whiteboard:node:read vc:meeting.meetingevent:read vc:meeting.search:read vc:note:read vc:record:readonly offline_access"
```

User scope 覆盖的业务域：

| 域 | 覆盖能力 |
|---|---|
| 身份与通讯录 | 获取用户信息、搜索用户 |
| 文档 | 读写新版/旧版文档、管理协作者和分享设置 |
| 云空间 | 文件元数据、搜索 |
| 表格 | 读写电子表格、PPT |
| 多维表格 | 读取多维表格（记录、字段、视图、仪表盘等） |
| 知识库 | 读取 Wiki 空间和节点 |
| 消息 | 以用户身份收发消息、管理群成员、Pin、Reaction |
| 日历 | 读写日程、查忙闲 |
| 任务与审批 | 读取任务和审批 |
| 邮箱 | 读写邮件、管理文件夹和联系人 |
| 会议 | 查看会议和妙记 |
| OKR | 读取 OKR |
| 白板 | 读取白板 |

**需要用户手动操作：**

命令会输出一个浏览器链接。用户需要：
1. 在浏览器中打开该链接
2. 登录飞书/Lark 账号
3. 点击「授权」
4. 回到 IDE 告诉 AI "done"

验证：

```bash
lark-cli auth status
# 应显示 identity: user，userName 为当前用户，scope 列表包含上述所有权限
```

---

## 第五阶段：验证

依次运行以下命令验证所有权限是否就绪：

```bash
# Bot 身份验证
lark-cli api GET /open-apis/contact/v3/users/me --as bot
lark-cli im +chat-search --query "test" --as bot

# User 身份验证
lark-cli auth status
lark-cli calendar +agenda --as user

# 综合验证
lark-cli docs +create --title "lark-cli 权限验证" --markdown "权限配置成功！此文档可删除。" --as bot
```

如果所有命令正常返回，配置完成。

---

## 常见问题

| 问题 | 解决 |
|------|------|
| `command not found: lark-cli` | `npm install -g @larksuite/cli`，如果 npm 也没有则先装 Node.js |
| Windows PowerShell 报错 | 改用 `cmd.exe`，或在 PowerShell 中执行 `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| Bot 调用返回 `99991672 Permission denied` | Bot scope 未开通。从错误中提取 `console_url`，在浏览器中打开并开通对应权限 |
| User 调用返回 `missing required scope` | 执行 `lark-cli auth login --scope "<缺失的scope>"`，scope 累积授权不会覆盖已有的 |
| 管理员未审批 | 联系飞书管理员在通知中一键审批，或在管理后台「应用审核」中处理 |
| Token 过期 | Bot token 自动续期无需处理。User token 过期后重新 `lark-cli auth login` |
| 开发者后台有未提交版本导致权限不生效 | 去「版本管理与发布」删除未提交/待审核的旧版本，重新提交 |
