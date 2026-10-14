#!/usr/bin/env python3
"""Ghép src/ thành dist/logic.js (cho test Node) và dist/index.html (trang artifact tự chứa)."""
import pathlib
root = pathlib.Path(__file__).parent
logic_parts = sorted((root / 'src/logic').glob('*.js'))
logic = "(function (root) {\n'use strict';\n" + "\n".join(p.read_text() for p in logic_parts) + "\n})(typeof window !== 'undefined' ? window : globalThis);\n"
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist/logic.js').write_text(logic)

ui_dir = root / 'src/ui'
if ui_dir.exists():
    css = (ui_dir / 'style.css').read_text()
    head = (ui_dir / 'head.html').read_text()
    body = (ui_dir / 'body.html').read_text()
    app = "\n".join(p.read_text() for p in sorted(ui_dir.glob('*.js')))
    page = head.replace('/*CSS*/', css) + body + "\n<script>\n" + logic + "\n</script>\n<script>\n(function(){\n'use strict';\n" + app + "\n})();\n</script>\n"
    (root / 'dist/index.html').write_text(page)
    print('dist/index.html', len(page), 'bytes')
print('dist/logic.js', len(logic), 'bytes')
