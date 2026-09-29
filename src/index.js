/**
 * domain-monitor — Cloudflare Worker 主入口
 *
 * 路由架构:
 *   /              → 公开页面（域名脱敏，只读）
 *   /admin         → 管理页面（需密码）
 *   /login         → 登录页
 *   /logout        → 退出登录
 *   /api/config    → 公开配置
 *   /api/domains   → 域名 CRUD（需鉴权）
 *   /api/whois/:d  → WHOIS 查询（公开）
 *   /cron          → 手动触发到期检查（需 token，定时触发走 scheduled()）
 */

import { getConfig, sha256, timingSafeEqual } from './utils';
import { authenticate, handleLogin } from './auth';
import { getDomainsFromD1 } from './domains';
import { checkDomainsScheduled } from './cron';
import { HTML_TEMPLATE } from '../frontend/index';
import { onRequest as configApi } from './api/config';
import { onRequest as domainsApi } from './domains';
import { onRequest as whoisApi } from './whois';
import { FAVICON_SVG } from './favicon';

function maskDomain(domain) {
  const parts = domain.split('.');
  if (parts.length < 2) return domain;
  const tld = parts.pop();
  return parts.map(() => '*****').join('.') + '.' + tld;
}

function maskAccount(account) {
  return account ? '***********' : '';
}

async function getMaskedDomains(env) {
  const domains = await getDomainsFromD1(env);
  return domains.map(d => ({ ...d, domain: maskDomain(d.domain), registerAccount: maskAccount(d.registerAccount) }));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const config = getConfig(env);

    // ---- 公开端点 ----
    if (pathname === '/favicon.svg') {
      return new Response(FAVICON_SVG, {
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' },
      });
    }

    if (pathname === '/login') return handleLogin(request, env, '/admin');

    if (pathname === '/logout') {
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/',
          'Set-Cookie': 'auth=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Path=/; Secure; SameSite=Lax',
        },
      });
    }

    if (pathname === '/api/config') return configApi({ request, env });

    if (pathname.startsWith('/api/whois/')) {
      return whoisApi({ request, env }, pathname.replace('/api/whois/', ''));
    }

    if (pathname === '/cron') {
      // 定时触发走 scheduled() 导出，不会进到这里；本入口只用于手动触发。
      // 鉴权只认 token，绝不能靠请求头判断"是不是定时任务"——请求头客户端可以随便伪造。
      // token 可用 ?token=xxx（兼容旧用法）或 Authorization: Bearer xxx 传递；
      // 默认取管理密码，设置了 CRON_TOKEN 则只认 CRON_TOKEN。
      const token = url.searchParams.get('token')
        || (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      const expected = env.CRON_TOKEN || config.password;

      if (!token) {
        return new Response(JSON.stringify({ error: '未授权：缺少 token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
      const tokenHash = await sha256(token);
      const expectedHash = await sha256(expected);
      if (!timingSafeEqual(tokenHash, expectedHash)) {
        return new Response(JSON.stringify({ error: '未授权：token 无效' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
      try {
        const expiring = await checkDomainsScheduled(env);
        return new Response(JSON.stringify({ success: true, expiringCount: expiring.length, domains: expiring }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500, headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // ---- API（需鉴权）----
    if (pathname.startsWith('/api/')) {
      if (config.password) {
        const auth = await authenticate(request, env);
        if (auth) return auth;
      }
      if (pathname === '/api/domains') return domainsApi({ request, env });
      return new Response('API Not Found', { status: 404 });
    }

    // ---- 公开首页 ----
    if (pathname === '/') {
      const masked = await getMaskedDomains(env);
      return new Response(
        HTML_TEMPLATE(config.siteName, config.siteIcon, config.bgimgURL, config.githubURL, config.blogURL, config.blogName, false, masked),
        { headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-cache' } }
      );
    }

    // ---- 管理页面 ----
    if (pathname === '/admin') {
      if (config.password) {
        const auth = await authenticate(request, env);
        if (auth) return auth;
      }
      return new Response(
        HTML_TEMPLATE(config.siteName, config.siteIcon, config.bgimgURL, config.githubURL, config.blogURL, config.blogName, true),
        { headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-cache' } }
      );
    }

    return new Response('Not Found', { status: 404 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkDomainsScheduled(env).catch(err => console.error('定时任务失败:', err)));
  },
};
