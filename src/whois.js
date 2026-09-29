/**
 * WHOIS 查询模块：ip.sb（主源）+ RDAP（备用）
 *
 * 备用源顺序：IANA bootstrap 解析出该 TLD 注册局的 RDAP 地址 → 失败/未收录则用 rdap.org。
 * 注意：所有出站请求都必须带 User-Agent —— rdap.org 对没有 UA 的请求直接返回 403（实测），
 * 之前正是因为漏了 UA，整个备用链路是死的。
 */

import { isPrimaryDomain } from './utils';

const USER_AGENT = 'domain-monitor/1.0 (+https://github.com/MiaPatsune/domain-monitor)';

async function fetchWithTimeout(url, init = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, ...(init.headers || {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

// ---------- 主源：ip.sb WHOIS ----------

async function fetchWhoisFromIpSb(domain) {
  const res = await fetchWithTimeout(`https://ip.sb/whois/${encodeURIComponent(domain)}`, {}, 8000);
  if (!res.ok) throw new Error(`WHOIS 返回 ${res.status}`);
  return await res.text();
}

function parseWhoisHtml(html) {
  return {
    domain: (html.match(/Domain Name:\s*([^\n]+)/i) || [])[1]?.trim()?.toLowerCase() || null,
    creationDate: (html.match(/Creation Date:\s*([^\n]+)/i) || [])[1]?.trim() || null,
    updatedDate: (html.match(/Updated Date:\s*([^\n]+)/i) || [])[1]?.trim() || null,
    expiryDate: (html.match(/Registry Expiry Date:\s*([^\n]+)/i) || [])[1]?.trim() || null,
    registrar: (html.match(/Registrar:\s*([^\s,，]+)/i) || [])[1]?.trim() || null,
    registrarUrl: (html.match(/Registrar URL:\s*([^\n]+)/i) || [])[1]?.trim() || null,
    nameServers: [...new Set((html.match(/Name Server:\s*([^\n]+)/gi) || []).map(ns => ns.replace(/Name Server:\s*/i, '').trim().toLowerCase()))],
  };
}

// ---------- 备用源：RDAP ----------

// IANA bootstrap（TLD → 注册局 RDAP 地址）。只在 isolate 内缓存，取不到就下次重试。
// 注意：bootstrap 并未收录所有 TLD（例如 .io / .cn 就不在里面），这类后缀没有标准 RDAP
// 入口可退，只能依赖主源 ip.sb。
let rdapBootstrap = null;

async function resolveRdapBase(domain) {
  const tld = domain.split('.').pop().toLowerCase();
  if (!rdapBootstrap) {
    const res = await fetchWithTimeout('https://data.iana.org/rdap/dns.json', { headers: { Accept: 'application/json' } }, 8000);
    if (!res.ok) throw new Error(`RDAP bootstrap 返回 ${res.status}`);
    const json = await res.json();
    rdapBootstrap = Array.isArray(json.services) ? json.services : [];
  }
  const hit = rdapBootstrap.find(s => Array.isArray(s?.[0]) && s[0].some(t => String(t).toLowerCase() === tld));
  return hit?.[1]?.[0] || null;
}

async function fetchRDAP(domain) {
  const target = encodeURIComponent(domain);
  const urls = [];

  try {
    const base = await resolveRdapBase(domain);
    if (base) urls.push(`${base.replace(/\/+$/, '')}/domain/${target}`);
    else console.warn(`IANA bootstrap 未收录 .${domain.split('.').pop()}，改用 rdap.org`);
  } catch (err) {
    console.warn(`RDAP bootstrap 失败: ${err.message}`);
  }
  urls.push(`https://rdap.org/domain/${target}`); // 兜底：rdap.org 本身也是按 bootstrap 转发的

  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, { headers: { Accept: 'application/rdap+json' } }, 10000);
      if (!res.ok) throw new Error(`返回 ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`RDAP 源失败 (${url}): ${err.message}`);
    }
  }
  return null;
}

function parseRDAP(json, domain) {
  const events = json.events || [];
  const findEvent = (action) => (events.find(e => e.eventAction === action) || {}).eventDate || null;

  let registrar = null;
  let registrarUrl = null;
  for (const entity of (json.entities || [])) {
    if (entity.roles?.includes('registrar')) {
      const vcard = entity.vcardArray;
      if (Array.isArray(vcard) && vcard[1]) {
        for (const field of vcard[1]) {
          if (field[0] === 'fn') { registrar = field[3] || null; break; }
        }
      }
      if (!registrar && entity.handle) registrar = entity.handle;
    }
  }
  for (const link of (json.links || [])) {
    if (link.rel === 'related' && link.href) { registrarUrl = link.href; break; }
  }

  return {
    domain: json.ldhName || domain,
    creationDate: findEvent('registration'),
    updatedDate: findEvent('last changed'),
    expiryDate: findEvent('expiration'),
    registrar,
    registrarUrl,
    nameServers: (json.nameservers || []).map(ns => ns.ldhName).filter(Boolean),
  };
}

// ---------- 主入口 ----------

export async function queryWhois(domain) {
  // 主源
  try {
    const html = await fetchWhoisFromIpSb(domain);
    const data = parseWhoisHtml(html);
    if (data?.expiryDate) return data;
    console.warn(`ip.sb 数据不完整 (${domain})，尝试 RDAP...`);
  } catch (err) {
    console.warn(`ip.sb 失败 (${domain}): ${err.message}，尝试 RDAP...`);
  }
  // 备用
  try {
    const json = await fetchRDAP(domain);
    if (json) {
      const data = parseRDAP(json, domain);
      if (data?.expiryDate) return data;
      console.warn(`RDAP 数据不完整 (${domain})`);
    }
  } catch (err) {
    console.warn(`RDAP 失败 (${domain}): ${err.message}`);
  }
  return null;
}

// ---------- API 路由处理 ----------

export async function onRequest(context, domain) {
  const { request } = context;
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
  if (!domain) return new Response(JSON.stringify({ error: '缺少域名参数' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (!isPrimaryDomain(domain)) return new Response(JSON.stringify({ error: '仅支持一级域名查询' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const data = await queryWhois(domain);
  if (data) {
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' },
    });
  }
  return new Response(JSON.stringify({ error: '无法查询该域名 WHOIS 信息' }), {
    status: 404, headers: { 'Content-Type': 'application/json' },
  });
}
