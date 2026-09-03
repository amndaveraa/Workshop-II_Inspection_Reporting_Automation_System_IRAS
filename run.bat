@echo off
echo 🚀 Starting IRAS (Frontend, Node, & Python)...


set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8

npx concurrently --kill-others ^
  --names "NODE_BE,PY_BE,FE" ^
  --prefix-colors "blue,green,magenta" ^
  "cd backend && npm run dev" ^
  "cd backend/customepthonapi && python app.py" ^
  "cd frontend && npm run dev"