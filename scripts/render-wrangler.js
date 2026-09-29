#!/usr/bin/env node
/**
 * scripts/render-wrangler.js — 渲染 wrangler.toml 里的部署占位符
 *
 * 用法：
 *   CF_D1_ID=<数据库ID> node scripts/render-wrangler.js
 *   CF_D1_ID=<数据库ID> CF_CRONS="0 1 * * *;0 13 * * *" node scripts/render-wrangler.js
 *   node scripts/render-wrangler.js --check      # 只校验、不写回
 *
 * CF_D1_ID 的取值顺序（只在 wrangler.toml 里还有 {CF_D1_ID} 时才会去找）：
 *   1. 环境变量 CF_D1_ID（GitHub Actions 走这条）
 *   2. `npx wrangler d1 list --json` 按 database_name 反查 —— Cloudflare Workers Builds 的
 *      构建环境里 wrangler 已经带好了凭据（它就是靠这个跑 deploy 的），所以这条在那边开箱即用
 *   3. Cloudflare REST API（需要环境里有 CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID）
 * 三条都拿不到就直接失败 —— 宁可部署失败，也不要静默绑到别人的数据库。
 *
 * CF_CRONS  选填。留空则保留 wrangler.toml 里的默认 cron。
 *           多个表达式用 ";" 分隔（不能用逗号——cron 表达式内部本身就有逗号，如 0 1,13 * * *）。
 *           也接受 JSON 数组写法：["0 1 * * *","0 13 * * *"]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const FILE = path.join(__dirname, '..', 'wrangler.toml');
const D1_PLACEHOLDER = '{CF_D1_ID}';
// 本仓库作者的数据库 ID：Fork 之后几乎不可能仍然正确，命中时给出告警
const AUTHOR_D1_ID = '56ef27f7-6783-4a52-9a7a-7ee9154e8351';
const CRON_FIELD_COUNT = 5;
const D1_NAME_RE = /^[A-Za-z0-9_-]+$/;

const checkOnly = process.argv.slice(2).includes('--check');

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function tomlString(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** 从 wrangler.toml 里读出 database_name（按名字反查 ID 时要用） */
function readD1Name(text) {
  const m = text.match(/^\s*database_name\s*=\s*"([^"]+)"/m);
  if (!m) return null;
  if (!D1_NAME_RE.test(m[1])) fail(`wrangler.toml 里的 database_name 含非法字符：${m[1]}`);
  return m[1];
}

/** 从任意输出里抠出 JSON（wrangler 会在 JSON 前后打日志/横幅） */
function extractJson(output) {
  const start = output.search(/[[{]/);
  if (start === -1) return null;
  for (let end = output.length; end > start; end--) {
    try {
      return JSON.parse(output.slice(start, end));
    } catch {
      /* 继续往前缩 */
    }
  }
  return null;
}

/** 路径 2：wrangler d1 list --json（Workers Builds 环境里 wrangler 自带凭据） */
function resolveD1IdFromWrangler(dbName) {
  // 用整条命令字符串 + shell，而不是 (可执行文件, args[])：
  // Windows 上 .cmd 必须经 shell 执行，而 shell + args 数组会触发 DEP0190。
  // 命令是固定串，不含任何外部输入（dbName 只用于比对结果）。
  const r = spawnSync('npx --yes wrangler d1 list --json', {
    encoding: 'utf8',
    timeout: 180000,
    shell: true,
  });
  if (r.error) return { id: null, reason: `执行 wrangler 失败：${r.error.message}` };
  if (r.status !== 0) {
    const detail = (r.stderr || r.stdout || '').trim().split('\n').filter(Boolean).slice(-2).join(' ');
    return { id: null, reason: `wrangler 退出码 ${r.status}${detail ? '：' + detail : ''}` };
  }
  const parsed = extractJson(r.stdout || '');
  if (!parsed) return { id: null, reason: 'wrangler 输出里找不到 JSON' };
  const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.result) ? parsed.result : []);
  const hit = list.find(db => db && db.name === dbName);
  if (!hit?.uuid) return { id: null, reason: `wrangler 列出的 ${list.length} 个库里没有名为 ${dbName} 的` };
  return { id: hit.uuid, reason: `wrangler d1 list 按名字匹配到 ${dbName}` };
}

/** 路径 3：Cloudflare REST API（需要环境里显式提供 token + account id） */
async function resolveD1IdFromApi(dbName) {
  const token = (process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || '').trim();
  const account = (process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || '').trim();
  if (!token || !account) return { id: null, reason: '环境里没有 CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID' };
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database?per_page=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    return { id: null, reason: `Cloudflare API HTTP ${res.status} ${JSON.stringify(json?.errors ?? '')}` };
  }
  const hit = (json.result || []).find(db => db && db.name === dbName);
  if (!hit?.uuid) return { id: null, reason: `账号里没有名为 ${dbName} 的 D1 数据库` };
  return { id: hit.uuid, reason: `Cloudflare API 按名字匹配到 ${dbName}` };
}

/** 解析 CF_CRONS：分号分隔（或 JSON 数组），并去掉可能被一起粘贴进来的引号 */
function parseCrons(raw) {
  const trimmed = String(raw).trim();
  let parts;
  if (trimmed.startsWith('[')) {
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      return fail(`CF_CRONS 看起来是 JSON 数组但解析失败：${err.message}`);
    }
    if (!Array.isArray(parsed)) fail('CF_CRONS 是 JSON，但不是数组');
    parts = parsed.map(String);
  } else {
    parts = trimmed.split(';');
  }
  return parts
    .map(part => part.trim().replace(/^["']|["']$/g, '').trim())
    .filter(Boolean);
}

function validateCrons(crons) {
  for (const expr of crons) {
    const fields = expr.split(/\s+/);
    if (fields.length !== CRON_FIELD_COUNT) {
      fail(`Cron 表达式 "${expr}" 应为 ${CRON_FIELD_COUNT} 个字段（分 时 日 月 周），实际 ${fields.length} 个`);
    }
    for (const field of fields) {
      if (!/^[0-9A-Za-z*/,?-]+$/.test(field)) {
        fail(`Cron 表达式 "${expr}" 含非法字符：${field}`);
      }
    }
  }
}

/** 只替换 [triggers] 段里的 crons 行，避免误伤其它配置 */
function replaceCronsLine(text, crons) {
  const lines = text.split('\n');
  const triggerIndex = lines.findIndex(line => line.trim() === '[triggers]');
  if (triggerIndex === -1) fail('wrangler.toml 中找不到 [triggers] 段，无法写入 CF_CRONS');
  const cronsIndex = lines.findIndex((line, i) => i > triggerIndex && /^\s*crons\s*=/.test(line));
  if (cronsIndex === -1) fail('wrangler.toml 的 [triggers] 段中找不到 crons 配置行，无法写入 CF_CRONS');
  lines[cronsIndex] = `crons = [${crons.map(tomlString).join(', ')}]`;
  return lines.join('\n');
}

// 注意：本文件是 CommonJS（require），不能出现顶层 await ——
// 有顶层 await 时 Node 会报 ERR_AMBIGUOUS_MODULE_SYNTAX。所以整段逻辑包在 async main 里。
async function main() {
  if (!fs.existsSync(FILE)) fail(`找不到 ${FILE}`);

  let text = fs.readFileSync(FILE, 'utf8');
  const original = text;
  const notes = [];

  // ---- CF_D1_ID ----
  const d1Id = (process.env.CF_D1_ID || '').trim();
  if (text.includes(D1_PLACEHOLDER)) {
    let resolvedId = d1Id;
    let resolvedBy = d1Id ? 'CF_D1_ID' : null;
    const attempts = [];

    if (!resolvedId) {
      const dbName = readD1Name(text);
      if (!dbName) {
        fail('wrangler.toml 里找不到 database_name，无法按名字反查 D1 ID；请直接提供 CF_D1_ID');
      }
      console.log(`未提供 CF_D1_ID，尝试按数据库名 "${dbName}" 反查…`);

      const viaWrangler = resolveD1IdFromWrangler(dbName);
      attempts.push(`wrangler d1 list：${viaWrangler.reason}`);
      if (viaWrangler.id) {
        resolvedId = viaWrangler.id;
        resolvedBy = viaWrangler.reason;
      } else {
        const viaApi = await resolveD1IdFromApi(dbName);
        attempts.push(`Cloudflare API：${viaApi.reason}`);
        if (viaApi.id) {
          resolvedId = viaApi.id;
          resolvedBy = viaApi.reason;
        }
      }
    }

    if (!resolvedId) {
      fail(
        '拿不到 D1 数据库 ID，wrangler.toml 里的 {CF_D1_ID} 无法渲染。\n' +
        '   · GitHub Actions：添加 Secret CF_D1_ID\n' +
        '   · 本地：CF_D1_ID=<你的 D1 数据库 ID> node scripts/render-wrangler.js\n' +
        '   · 或者在已登录 wrangler 的环境里运行（会自动按 database_name 反查）\n' +
        '   尝试记录：\n     - ' + attempts.join('\n     - ')
      );
    }

    if (resolvedId.includes('{') || resolvedId.includes('}')) fail(`解析出的 D1 ID 看起来仍是占位符：${resolvedId}`);
    if (resolvedId === AUTHOR_D1_ID) {
      console.warn('⚠️  解析出的 D1 ID 等于本仓库作者的数据库 ID —— Fork 场景下几乎肯定是错的，请改成自己的。');
    }
    text = text.split(D1_PLACEHOLDER).join(resolvedId);
    notes.push(`database_id ← ${resolvedId}（来源：${resolvedBy}）`);
  } else {
    notes.push('wrangler.toml 中已无 {CF_D1_ID} 占位符，保持现有 database_id 不变');
  }

  // ---- CF_CRONS ----
  const cronsRaw = (process.env.CF_CRONS || '').trim();
  if (cronsRaw) {
    const crons = parseCrons(cronsRaw);
    if (crons.length === 0) fail(`CF_CRONS 解析后为空：${cronsRaw}`);
    validateCrons(crons);
    const updated = replaceCronsLine(text, crons);
    if (updated === text) {
      notes.push(`crons 已是 ${crons.join(' ; ')}，无需改动`);
    } else {
      text = updated;
      notes.push(`crons ← ${crons.join(' ; ')}`);
    }
  } else {
    notes.push('未提供 CF_CRONS，保留 wrangler.toml 中的默认 cron');
  }

  // ---- 收尾 ----
  for (const note of notes) console.log(`   · ${note}`);

  if (text.includes(D1_PLACEHOLDER)) {
    fail('渲染后 wrangler.toml 中仍残留 {CF_D1_ID} 占位符');
  }

  if (text === original) {
    console.log('✅ wrangler.toml 无需改动');
    return;
  }

  if (checkOnly) {
    console.log('❌ --check：wrangler.toml 需要更新（未写回）');
    process.exit(1);
  }

  fs.writeFileSync(FILE, text, 'utf8');
  console.log(`✅ 已写入 ${path.relative(process.cwd(), FILE)}`);
}

main().catch(err => {
  console.error(`❌ 渲染失败：${err?.stack || err}`);
  process.exit(1);
});
