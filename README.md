# 域名到期监控系统

基于 Cloudflare Workers + D1（SQLite）构建的域名到期监控仪表盘。支持 WHOIS 自动查询、分组管理、到期提醒、数据导入导出等功能。

## 功能特性

- ✅ **双模式访问**: `/` 公开页面(只读、域名脱敏) 和 `/admin` 管理页面(需密码)
- ✅ **域名管理**: 支持一级和二级域名的添加、编辑、删除、克隆
- ✅ **批量操作**: 复选框多选、全选、批量删除
- 🔍 **WHOIS 自动查询**: 一级域名自动获取注册和到期信息(主源 ip.sb + 备用 RDAP)
- 📊 **可视化仪表盘**: 域名状态概览、进度条、分组展示
- 🔐 **密码保护**: Cookie 鉴权，7 天有效期
- 💾 **D1 数据库**: Cloudflare D1（SQLite），支持事务和 SQL 查询
- 💾 **数据备份**: 支持 JSON 导出和导入
- 📱 **Telegram 通知**: 定时检查并推送即将到期提醒
- 🎨 **响应式设计**: 适配移动端和桌面端
- 🏷️ **分组标签**: 自定义分组 + 智能筛选
- 🔄 **域名续费**: 支持年/月续费，自动更新到期时间

## 路由架构

| 路径 | 权限 | 说明 |
|------|------|------|
| `/` | 🔓 公开 | 域名/账号脱敏展示 |
| `/admin` | 🔒 需密码 | 完整管理页面 |
| `/login` | 🔓 公开 | 登录页 |
| `/logout` | 🔓 公开 | 退出登录 |
| `/api/domains` | 🔒 需鉴权 | 域名 CRUD API |
| `/api/whois/<domain>` | 🔓 公开 | WHOIS 查询 |
| `/api/config` | 🔓 公开 | 前端配置 |
| `/cron` | 🔓 公开 | 手动触发到期检查 |

## 快速部署

### 1. Fork 本项目

点击右上角 Fork 按钮。

### 2. 在 Cloudflare 创建 D1 数据库

- 进入 [Cloudflare Dashboard](https://dash.cloudflare.com)
- Workers & Pages → D1 SQL Database → 创建数据库
- 名称填写：`domain-monitor-db`（必须和 wrangler.toml 一致）
- 创建后记录 **数据库 ID**（一串字符串）

### 3. 设置 GitHub Secrets 和 Variables

进入仓库 `Settings` → `Secrets and variables` → `Actions`:

**Secrets 标签:**
| 名称 | 说明 | 必填 |
|------|------|------|
| `CF_API_TOKEN` | Cloudflare API Token（需要 Workers + D1 权限） | ✅ |
| `CF_D1_ID` | 刚创建的 D1 数据库 ID | ✅ |
| `PASSWORD` | 管理页密码（默认 `123123`） | ✅ |
| `TGID` | Telegram 通知 Chat ID | ❌ |
| `TGTOKEN` | Telegram Bot Token | ❌ |

**Variables 标签:**
| 名称 | 说明 | 必填 |
|------|------|------|
| `CF_ACCOUNT_ID` | Cloudflare 账户 ID（是 ID 不是邮箱） | ✅ |
| `CF_CRONS` | Cron 表达式，如 `"0 1,13 * * *"`(北京时间 9:00/21:00) | ❌ |

### 4. 运行部署

- 点击 `Actions` → `部署到 Cloudflare Workers` → `Run workflow`
- Action 会自动：
  1. 构建前端代码
  2. 部署 Worker
  3. **执行 D1 数据库迁移**（自动建表）
  4. 设置 Secret 环境变量

### 5. 绑定自定义域名(可选)

在 Cloudflare Workers 管理后台给 Worker 绑定自定义域名。

## 可选环境变量

在 Cloudflare Workers → Settings → Variables 中添加:

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DAYS` | 到期提醒天数 | `30` |
| `SITENAME` | 网站标题 | `域名到期监控` |
| `ICON` | 网站图标 URL | - |
| `BGIMG` | 背景图片 URL | - |
| `GITHUB_URL` | GitHub 链接 | - |
| `BLOG_URL` | 博客链接 | - |
| `BLOG_NAME` | 博客名称 | - |

## D1 数据库结构

```sql
CREATE TABLE domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL UNIQUE,
  registration_date TEXT,
  expiration_date TEXT,
  system TEXT,
  system_url TEXT,
  register_account TEXT,
  groups TEXT,
  renewal_period INTEGER,
  renewal_unit TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

## 本地开发

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录
wrangler login

# 创建本地 D1 数据库
npx wrangler d1 create domain-monitor-db

# 执行本地迁移
npx wrangler d1 migrations apply domain-monitor-db --local

# 构建前端
node frontend/build.js

# 本地运行
npx wrangler dev

# 远程迁移
npx wrangler d1 migrations apply domain-monitor-db --remote

# 部署
npx wrangler deploy
```

## 项目结构

```
├── src/
│   ├── index.js          # Worker 主入口(路由)
│   ├── utils.js          # 工具函数
│   ├── auth.js           # 认证模块
│   ├── whois.js          # WHOIS 查询
│   ├── domains.js        # 域名 CRUD + D1
│   ├── cron.js           # 定时任务
│   └── api/
│       └── config.js     # 配置 API
├── frontend/
│   ├── index.js          # HTML 模板
│   ├── style.js          # CSS 样式
│   ├── build.js          # 构建脚本
│   ├── script.js         # 构建产物
│   └── src/              # 前端模块源码
│       ├── 00-config.js
│       ├── 01-utils.js
│       ├── 02-api.js
│       ├── 03-ui.js
│       ├── 04-form.js
│       ├── 05-filters.js
│       ├── 06-init.js
│       ├── 07-modal.js
│       └── 08-renewal.js
├── migrations/
│   └── 0001_initial.sql  # D1 建表迁移
├── wrangler.toml
├── package.json
└── .github/workflows/deploy.yml
```

## License

MIT
