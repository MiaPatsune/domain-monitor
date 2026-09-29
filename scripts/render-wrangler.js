#!/usr/bin/env node
/**
 * scripts/render-wrangler.js — 渲染 wrangler.toml 里的部署占位符
 *
 * 用法：
 *   CF_D1_ID=<数据库ID> node scripts/render-wrangler.js
 *   CF_D1_ID=<数据库ID> CF_CRONS="0 1 * * *;0 13 * * *" node scripts/render-wrangler.js
 *   node scripts/render-wrangler.js --check      # 只校验、不写回
 *
 * 规则：
 *   CF_D1_ID  必填（当 wrangler.toml 里还有 {CF_D1_ID} 占位符时）。
 *             缺少就直接失败，避免"静默部署到别人的 D1 数据库"。
 *   CF_CRONS  选填。留空则保留 wrangler.toml 里的默认 cron。
 *             多个表达式用 ";" 分隔（不能用逗号——cron 表达式内部本身就有逗号，如 0 1,13 * * *）。
 *             也接受 JSON 数组写法：["0 1 * * *","0 13 * * *"]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'wrangler.toml');
const D1_PLACEHOLDER = '{CF_D1_ID}';
// 本仓库作者的数据库 ID：Fork 之后几乎不可能仍然正确，命中时给出告警
const AUTHOR_D1_ID = '56ef27f7-6783-4a52-9a7a-7ee9154e8351';
const CRON_FIELD_COUNT = 5;

const checkOnly = process.argv.slice(2).includes('--check');

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function tomlString(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
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

if (!fs.existsSync(FILE)) fail(`找不到 ${FILE}`);

let text = fs.readFileSync(FILE, 'utf8');
const original = text;
const notes = [];

// ---- CF_D1_ID ----
const d1Id = (process.env.CF_D1_ID || '').trim();
if (text.includes(D1_PLACEHOLDER)) {
  if (!d1Id) {
    fail(
      '缺少 CF_D1_ID：wrangler.toml 里的 {CF_D1_ID} 还没渲染。\n' +
      '   · GitHub Actions：在仓库 Settings → Secrets and variables → Actions 里添加 Secret CF_D1_ID\n' +
      '   · 本地：CF_D1_ID=<你的 D1 数据库 ID> node scripts/render-wrangler.js'
    );
  }
  if (d1Id.includes('{') || d1Id.includes('}')) fail(`CF_D1_ID 看起来仍是占位符：${d1Id}`);
  if (d1Id === AUTHOR_D1_ID) {
    console.warn('⚠️  CF_D1_ID 等于本仓库作者的数据库 ID —— Fork 场景下几乎肯定是错的，请改成自己的。');
  }
  text = text.split(D1_PLACEHOLDER).join(d1Id);
  notes.push(`database_id ← ${d1Id}`);
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
  process.exit(0);
}

if (checkOnly) {
  console.log('❌ --check：wrangler.toml 需要更新（未写回）');
  process.exit(1);
}

fs.writeFileSync(FILE, text, 'utf8');
console.log(`✅ 已写入 ${path.relative(process.cwd(), FILE)}`);
