/**
 * 域名 CRUD + D1 存储模块
 * D1 SQLite: domains 表
 */

import { queryWhois } from './whois';
import { isPrimaryDomain } from './utils';

// snake_case (DB) ↔ camelCase (前端) 映射
function toRow(d) {
  return {
    domain: d.domain,
    registration_date: d.registrationDate || d.registration_date || null,
    expiration_date: d.expirationDate || d.expiration_date || null,
    system: d.system || null,
    system_url: d.systemURL || d.system_url || null,
    register_account: d.registerAccount || d.register_account || null,
    groups: d.groups || null,
    renewal_period: d.renewalPeriod || d.renewal_period || null,
    renewal_unit: d.renewalUnit || d.renewal_unit || null,
  };
}

function fromRow(r) {
  return {
    domain: r.domain,
    registrationDate: r.registration_date,
    expirationDate: r.expiration_date,
    system: r.system,
    systemURL: r.system_url,
    registerAccount: r.register_account,
    groups: r.groups,
    renewalPeriod: r.renewal_period,
    renewalUnit: r.renewal_unit,
  };
}

export async function getDomainsFromD1(env) {
  if (!env.DB) throw new Error('未绑定 D1 数据库');
  const { results } = await env.DB.prepare('SELECT * FROM domains ORDER BY expiration_date ASC').all();
  return results.map(fromRow);
}

// ---------- 路由处理 ----------

export async function onRequest(context) {
  const { request, env } = context;
  try {
    if (request.method === 'GET') {
      const domains = await getDomainsFromD1(env);
      return new Response(JSON.stringify(domains), { headers: { 'Content-Type': 'application/json' } });
    }
    if (request.method === 'POST') return handlePost(request, env);
    if (request.method === 'PUT') return handlePut(request, env);
    if (request.method === 'DELETE') return handleDelete(request, env);
    if (request.method === 'PATCH') return handlePatch(request, env);
    return new Response('Method Not Allowed', { status: 405 });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function handlePost(request, env) {
  let data;
  try {
    data = await request.json();
    if (!data?.domain) throw new Error('缺少域名');
  } catch {
    return new Response(JSON.stringify({ error: '无效的 JSON 或缺少域名' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const domainName = data.domain;
  const originalDomain = data.originalDomain || domainName;

  // 判断是编辑还是新增
  let isEdit = false;
  if (originalDomain) {
    const existing = await env.DB.prepare('SELECT domain FROM domains WHERE domain = ?').bind(originalDomain).first();
    isEdit = !!existing;
  }

  // WHOIS 自动填充
  if (isPrimaryDomain(domainName) && !data.expirationDate) {
    const whois = await queryWhois(domainName);
    if (whois) {
      data.registrationDate = whois.creationDate;
      data.expirationDate = whois.expiryDate;
      data.system = whois.registrar;
      data.systemURL = whois.registrarUrl;
    } else if (!isEdit) {
      return new Response(JSON.stringify({ error: 'WHOIS 查询失败，请手动填写信息' }), { status: 422, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (!data.expirationDate) {
    if (!data.registrationDate || !data.system) {
      return new Response(JSON.stringify({ error: '请填写注册时间、到期时间和注册商' }), { status: 422, headers: { 'Content-Type': 'application/json' } });
    }
  }

  const row = toRow(data);

  if (isEdit) {
    // UPDATE
    const setClauses = [];
    const values = [];
    for (const [k, v] of Object.entries(row)) {
      if (k === 'domain') continue;
      setClauses.push(k + ' = ?');
      values.push(v);
    }
    setClauses.push("updated_at = datetime('now')");
    values.push(domainName);        // WHERE domain = ? (new)
    values.push(originalDomain);    // WHERE domain = ? (old, in case renamed)

    await env.DB.prepare(
      'UPDATE domains SET ' + setClauses.join(', ') + ' WHERE domain = ?'
    ).bind(...values).run();

    // 如果域名改名了
    if (originalDomain !== domainName) {
      await env.DB.prepare('UPDATE domains SET domain = ? WHERE domain = ?').bind(domainName, originalDomain).run();
    }
  } else {
    // INSERT
    const columns = Object.keys(row).join(', ');
    const placeholders = Object.keys(row).map(() => '?').join(', ');
    const values = Object.values(row);
    await env.DB.prepare('INSERT INTO domains (' + columns + ') VALUES (' + placeholders + ')').bind(...values).run();
  }

  return new Response(JSON.stringify({ success: true, domain: domainName }), { headers: { 'Content-Type': 'application/json' } });
}

async function handlePut(request, env) {
  let domains;
  try {
    domains = await request.json();
    if (!Array.isArray(domains)) throw new Error();
  } catch {
    return new Response(JSON.stringify({ error: '需要 JSON 数组' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // 事务：清空后批量插入
  const batch = [];
  batch.push(env.DB.prepare('DELETE FROM domains'));
  for (const d of domains) {
    const row = toRow(d);
    const cols = Object.keys(row).join(', ');
    const vals = Object.keys(row).map(() => '?').join(', ');
    batch.push(env.DB.prepare('INSERT INTO domains (' + cols + ') VALUES (' + vals + ')').bind(...Object.values(row)));
  }
  await env.DB.batch(batch);

  return new Response(JSON.stringify({ success: true, count: domains.length }), { headers: { 'Content-Type': 'application/json' } });
}

async function handleDelete(request, env) {
  let list;
  try {
    const body = await request.json();
    list = Array.isArray(body) ? body : [body.domain];
    list = list.filter(Boolean);
    if (list.length === 0) throw new Error();
  } catch {
    return new Response(JSON.stringify({ error: '请提供要删除的域名' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const placeholders = list.map(() => '?').join(',');
  const { meta } = await env.DB.prepare('DELETE FROM domains WHERE domain IN (' + placeholders + ')').bind(...list).run();
  return new Response(JSON.stringify({ success: true, deletedCount: meta.changes, message: '已删除 ' + meta.changes + ' 个域名' }), { headers: { 'Content-Type': 'application/json' } });
}

async function handlePatch(request, env) {
  let data;
  try {
    data = await request.json();
    if (!data?.domain || !data?.duration || !data?.unit) throw new Error();
  } catch {
    return new Response(JSON.stringify({ error: '缺少 domain/duration/unit' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const existing = await env.DB.prepare('SELECT * FROM domains WHERE domain = ?').bind(data.domain).first();
  if (!existing) return new Response(JSON.stringify({ error: '域名未找到' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const duration = parseInt(data.duration);
  if (duration < 1) return new Response(JSON.stringify({ error: '续费时长必须大于0' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const current = new Date(existing.expiration_date);
  if (isNaN(current.getTime())) return new Response(JSON.stringify({ error: '到期日期格式无效' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const next = new Date(current);
  data.unit === 'year' ? next.setFullYear(current.getFullYear() + duration) : next.setMonth(current.getMonth() + duration);
  const newDate = next.toISOString().split('T')[0];

  await env.DB.prepare(
    "UPDATE domains SET expiration_date = ?, renewal_period = ?, renewal_unit = ?, updated_at = datetime('now') WHERE domain = ?"
  ).bind(newDate, duration, data.unit, data.domain).run();

  return new Response(JSON.stringify({ success: true, domain: data.domain, newExpirationDate: newDate }), { headers: { 'Content-Type': 'application/json' } });
}
