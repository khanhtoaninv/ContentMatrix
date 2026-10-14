// Máy chủ phát triển (npm run dev): ghép head.html + body.html vào index.html, nạp mã dạng module để sửa là thấy ngay.
// Bản phát hành do scripts/build.mjs tạo (npm run build), không dùng cấu hình này.
import fs from 'node:fs';

const part = f => fs.readFileSync(new URL(`./src/ui/${f}`, import.meta.url), 'utf8');

export default {
  plugins: [{
    name: 'autocontent-page',
    transformIndexHtml: html => html.replace('<!--app-->', part('head.html')
      .replace(/<style>\s*\/\*CSS\*\/\s*<\/style>/, '<link rel="stylesheet" href="/src/ui/style.css">')
      + part('body.html') + '\n<script type="module" src="/src/main.js"></script>'),
  }],
};
