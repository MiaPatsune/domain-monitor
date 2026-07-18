/**
 * frontend/build.js — 将 src/ 模块构建为 script.js
 * 用法: node frontend/build.js
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const OUTPUT = path.join(__dirname, 'script.js');

const MODULES = [
  '00-config.js',
  '01-utils.js',
  '02-api.js',
  '03-ui.js',
  '04-form.js',
  '05-filters.js',
  '06-init.js',
  '07-modal.js',
  '08-renewal.js',
];

let combined = '';
for (const file of MODULES) {
  const filePath = path.join(SRC_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.error('⚠️  未找到模块:', filePath);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  combined += content.trimEnd() + '\n\n';
}

const escaped = combined
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${');

const output = `export const HTML_JS = \`\n${escaped}\`;\n`;
fs.writeFileSync(OUTPUT, output, 'utf-8');
console.log('✅ 前端构建完成:', OUTPUT, '(' + combined.split('\n').length + ' 行)');
