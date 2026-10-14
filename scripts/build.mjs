// Đóng gói: src/main.js → một bó IIFE, rồi ghép head.html (CSS nhúng) + body.html + <script> thành dist/index.html.
// Kết quả là một tệp tự chứa, mở thẳng bằng file:// như bản build.py trước đây.
import { build } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const out = await build({
  root, configFile: false, logLevel: 'warn',
  build: {
    write: false, minify: false, target: 'esnext', emptyOutDir: false,
    lib: { entry: path.join(root, 'src/main.js'), formats: ['iife'], name: 'AutoContentApp' },
    rollupOptions: { onwarn(w, warn) { if (w.code !== 'CIRCULAR_DEPENDENCY') warn(w); } },
  },
});
const chunk = [out].flat().flatMap(o => o.output).find(o => o.type === 'chunk');
const page = read('src/ui/head.html').replace('/*CSS*/', read('src/ui/style.css')) + read('src/ui/body.html')
  + '\n<script>\n' + chunk.code + '\n</script>\n';
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), page);
console.log(`dist/index.html ${(page.length / 1024).toFixed(0)} KB`);
