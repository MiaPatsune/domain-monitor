/**
 * 工具函数：配置读取、日期格式化、Telegram 通知
 */

export function getConfig(env) {
  return {
    siteName: env.SITENAME || '域名到期监控',
    siteIcon: env.ICON || '',
    bgimgURL: env.BGIMG || 'https://www.miapatsune.dpdns.org/tuchuang/1781586439611_1.png',
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
