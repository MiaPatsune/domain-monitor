/**
 * 公开配置 API（不暴露敏感字段）
 */

import { getConfig } from '../utils';

export async function onRequest(context) {
  const config = getConfig(context.env);
  return new Response(JSON.stringify({
    siteName: config.siteName,
    siteIcon: config.siteIcon,
    bgimgURL: config.bgimgURL,
    githubURL: config.githubURL,
    blogURL: config.blogURL,
    blogName: config.blogName,
    days: config.days,
  }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });
}
