#!/usr/bin/env bash
# Đồng bộ /mnt/project-files/AutoContent -> repo khanhtoaninv/ContentMatrix (nhánh main) rồi đẩy lên.
# Trước khi chạy: gọi add_repo (owner khanhtoaninv, repo ContentMatrix) để phiên có quyền git. Dùng: bash tools/sync-git.sh "lời nhắn commit"
set -euo pipefail
SRC=/mnt/project-files/AutoContent; DST=/home/claude/contentmatrix
MSG=${1:-"Đồng bộ mã Content Matrix"}
[ -d "$DST/.git" ] || git clone --depth 1 https://github.com/khanhtoaninv/contentmatrix "$DST"
git -C "$DST" pull --rebase origin main 2>/dev/null || true
for d in src dist spec tests notes; do rm -rf "$DST/$d"; mkdir -p "$DST/$d"; cp -r "$SRC/$d/." "$DST/$d/"; done
rm -rf "$DST/tests/shots" "$DST/dist/autocontent-content-matrix.html"
cp "$SRC/build.py" "$SRC/HANDOFF.md" "$DST/"; mkdir -p "$DST/tools"; cp "$SRC/tools/sync-git.sh" "$DST/tools/"
cd "$DST"; git add -A
if git diff --cached --quiet; then echo "Không có thay đổi để đẩy."; exit 0; fi
git commit -qm "$MSG

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015SW55xAwe9QXSnvXVXurXq"
git push -u origin main && git log --oneline | head -1
