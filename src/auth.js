/**
 * 认证模块：Cookie 鉴权 + 登录页面
 */

import { getConfig } from './utils';

export async function authenticate(request, env) {
  const config = getConfig(env);
  const cookie = request.headers.get('Cookie');
  let authToken = null;
  if (cookie) {
    const match = cookie.match(/auth=([^;]+)/);
    if (match) authToken = match[1];
  }
  if (authToken === config.password) return null;
  return Response.redirect(new URL('/login', request.url), 302);
}

export async function handleLogin(request, env, redirectPath = '/admin') {
  const config = getConfig(env);

  if (request.method === 'GET') {
    return new Response(generateLoginPage(config, false), {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }

  if (request.method === 'POST') {
    try {
      const formData = await request.formData();
      const password = formData.get('password');
      if (password === config.password) {
        const expires = new Date();
        expires.setDate(expires.getDate() + 7);
        const headers = new Headers();
        headers.set('Location', redirectPath);
        headers.set(
          'Set-Cookie',
          `auth=${password}; Expires=${expires.toUTCString()}; HttpOnly; Path=/; Secure; SameSite=Lax`
        );
        return new Response(null, { status: 302, headers });
      }
      return new Response(generateLoginPage(config, true), {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
      });
    } catch {
      return new Response('Bad Request', { status: 400 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
}

function generateLoginPage(config, showError) {
  const year = new Date().getFullYear();
  const bgStyle = config.bgimgURL
    ? `background: linear-gradient(135deg, rgba(26,115,232,0.06) 0%, rgba(66,133,244,0.12) 100%), url('${config.bgimgURL}') center/cover no-repeat;`
    : 'background: linear-gradient(135deg, #e8f0fe 0%, #f0f4f8 100%);';

  let footerHTML = '';
  if (config.githubURL || config.blogURL) {
    footerHTML = `<div style="text-align:center;padding:20px 0 0;color:#80868b;font-size:0.8rem;">
      <span>Copyright © ${year}</span>
      ${config.githubURL ? `<span> | </span><a href="${config.githubURL}" target="_blank" style="color:#1a73e8;text-decoration:none;">GitHub</a>` : ''}
      ${config.blogURL ? `<span> | </span><a href="${config.blogURL}" target="_blank" style="color:#1a73e8;text-decoration:none;">${config.blogName || 'Blog'}</a>` : ''}
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登录 - ${config.siteName}</title>
  ${config.siteIcon ? `<link rel="icon" href="${config.siteIcon}">` : ''}
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: "PingFang SC","Microsoft YaHei",sans-serif; min-height:100vh; display:flex; align-items:center; justify-content:center; ${bgStyle} }
    .login-box {
      background: #fff; border-radius: 20px; padding: 40px 36px 20px;
      width: 400px; max-width: 92vw; box-shadow: 0 8px 40px rgba(0,0,0,0.1);
      text-align: center; border: 1px solid #e0e7f1;
    }
    .login-icon { font-size: 2.5rem; color: #1a73e8; margin-bottom: 8px; }
    h1 { color: #2c3e50; font-size: 1.4rem; margin-bottom: 28px; font-weight: 600; }
    label { display: block; text-align: left; font-weight: 500; color: #5f6368; margin-bottom: 6px; font-size: 0.85rem; }
    input[type="password"] {
      width: 100%; padding: 12px 14px; border: 1px solid #e0e7f1; border-radius: 10px;
      font-size: 14px; background: #fafbfc; margin-bottom: 20px; transition: border-color 0.2s;
      color: #2c3e50;
    }
    input[type="password"]:focus { border-color: #1a73e8; outline: none; box-shadow: 0 0 0 3px rgba(26,115,232,0.1); }
    button {
      width: 100%; padding: 12px; background: linear-gradient(135deg, #1a73e8, #4285f4);
      color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 500;
      cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(26,115,232,0.25);
    }
    button:hover { box-shadow: 0 4px 16px rgba(26,115,232,0.35); transform: translateY(-1px); }
    .error { color: #ea4335; margin-top: 14px; padding: 10px; background: #fce8e6; border-radius: 8px; font-size: 0.85rem; ${showError ? '' : 'display:none;'} }
  </style>
</head>
<body>
  <div class="login-box">
    <div class="login-icon"><i class="fas fa-shield-alt"></i></div>
    <h1>${config.siteName}</h1>
    <form method="POST" action="/login">
      <label for="password">访问密码</label>
      <input type="password" id="password" name="password" required autocomplete="current-password" placeholder="请输入管理密码">
      <button type="submit"><i class="fas fa-sign-in-alt"></i> 登录管理后台</button>
      <div class="error"><i class="fas fa-exclamation-circle"></i> 密码错误，请重试</div>
    </form>
    ${footerHTML}
  </div>
</body>
</html>`;
}
