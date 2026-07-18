/**
 * 定时任务：检查即将到期的域名并发送 Telegram 通知
 */

import { getConfig, sendTelegramMessage } from './utils';
import { getDomainsFromD1 } from './domains';

export async function checkDomainsScheduled(env) {
  const config = getConfig(env);
  const domains = await getDomainsFromD1(env);
  const expiring = [];

  if (domains.length === 0) {
    console.log('D1 中无域名数据');
    return expiring;
  }

  const now = Date.now();
  const today = Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  for (const d of domains) {
    const exp = Date.parse(d.expirationDate);
    if (isNaN(exp)) continue;
    const daysLeft = Math.ceil((exp - today) / 86400000);

    if (daysLeft > 0 && daysLeft <= config.days) {
      const msg = [
        '<b>域名到期提醒</b>',
        '━━━━━━━━━━━━━━',
        `域名: <code>${d.domain}</code>`,
        `剩余: <b>${daysLeft} 天</b>`,
        `到期: ${d.expirationDate}`,
        `注册商: ${d.system || 'N/A'}`,
        `账号: ${d.registerAccount || 'N/A'}`,
      ].join('\n');

      await sendTelegramMessage(msg, config.tgid, config.tgtoken);
      expiring.push({ domain: d.domain, expirationDate: d.expirationDate, daysRemaining: daysLeft });
    }
  }

  return expiring;
}
