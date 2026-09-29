/**
 * 工具函数：配置读取、日期格式化、Telegram 通知、密码哈希
 */

/**
 * SHA-256 哈希（Web Crypto API）
 * 用于 Cookie 鉴权，避免明文密码存入 Cookie
 */
export async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 定长比较，防时序攻击
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function getConfig(env) {
  return {
    siteName: env.SITENAME || '域名到期监控',
    siteIcon: env.ICON || '/favicon.svg',
    // 默认背景图随 Worker 一起发布（见 wrangler.toml 的 [assets] / public/bg.webp），
    // 不再依赖外部图床；想换成外链就在 Worker 里设置 BGIMG。
    bgimgURL: env.BGIMG || '/bg.webp',
    githubURL: env.GITHUB_URL || '',
    blogURL: env.BLOG_URL || '',
    blogName: env.BLOG_NAME || '',
    password: env.PASSWORD || '123123',
    days: Number(env.DAYS || 30),
    tgid: env.TGID,
    tgtoken: env.TGTOKEN,
  };
}

export function formatDateToBeijing(dateStr) {
  const date = new Date(dateStr);
  const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return beijingTime.toISOString().split('T')[0];
}

export function isPrimaryDomain(domain) {
  const parts = domain.split('.');
  return parts.length <= 2;
}

export async function sendTelegramMessage(message, tgid, tgtoken) {
  if (!tgid || !tgtoken) return;
  const url = `https://api.telegram.org/bot${tgtoken}/sendMessage`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: tgid, text: message, parse_mode: 'HTML' }),
    });
  } catch (error) {
    console.error('Telegram 通知发送失败:', error);
  }
}
