/**
 * WHOIS 查询模块：ip.sb（主源）+ RDAP（备用）
 */

import { isPrimaryDomain } from './utils';

// ---------- 主源：ip.sb WHOIS ----------

async function fetchWhoisFromIpSb(domain) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://ip.sb/whois/${encodeURIComponent(domain)}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) throw new Error(`WHOIS 返回 ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
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

async function fetchRDAP(domain) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/rdap+json' },
    });
    if (!res.ok) throw new Error(`RDAP 返回 ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
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
    const data = parseRDAP(json, domain);
    if (data?.expiryDate) return data;
    console.warn(`RDAP 数据不完整 (${domain})`);
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
