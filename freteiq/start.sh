#!/bin/bash

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== FreteIQ ==="
echo ""

# Verificar .env do backend
if [ ! -f "$ROOT/backend/.env" ]; then
  echo "ERRO: backend/.env não encontrado."
  echo "Copie backend/.env.example e preencha as credenciais."
  exit 1
fi

# Verificar .env do frontend
if [ ! -f "$ROOT/frontend/.env.local" ]; then
  echo "ERRO: frontend/.env.local não encontrado."
  echo "Copie frontend/.env.local.example e preencha as credenciais."
  exit 1
fi

# Matar processos anteriores nas portas 8000 e 3000
echo "[*] Limpando portas 8000 e 3000..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

# Backend
echo "[*] Iniciando backend (porta 8000)..."
cd "$ROOT/backend"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload > /tmp/freteiq-backend.log 2>&1 &
BACKEND_PID=$!

# Aguardar backend subir
echo "[*] Aguardando backend..."
for i in $(seq 1 15); do
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "[✓] Backend OK — http://localhost:8000"
    echo "    Docs: http://localhost:8000/docs"
    break
  fi
  sleep 1
  if [ $i -eq 15 ]; then
    echo "[✗] Backend não respondeu. Veja logs em /tmp/freteiq-backend.log"
    exit 1
  fi
done

# Frontend
echo "[*] Iniciando frontend (porta 3000)..."
cd "$ROOT/frontend"
npm run dev > /tmp/freteiq-frontend.log 2>&1 &
FRONTEND_PID=$!

# Aguardar frontend subir
echo "[*] Aguardando frontend..."
for i in $(seq 1 30); do
  if curl -s http://localhost:3000/login > /dev/null 2>&1; then
    echo "[✓] Frontend OK — http://localhost:3000"
    break
  fi
  sleep 1
  if [ $i -eq 30 ]; then
    echo "[✗] Frontend não respondeu. Veja logs em /tmp/freteiq-frontend.log"
    exit 1
  fi
done

echo ""
echo "=== Projeto rodando ==="
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8000"
echo "  API Docs:  http://localhost:8000/docs"
echo ""
echo "Logs:"
echo "  Backend:   tail -f /tmp/freteiq-backend.log"
echo "  Frontend:  tail -f /tmp/freteiq-frontend.log"
echo ""
echo "Para parar tudo: kill $BACKEND_PID $FRONTEND_PID"
echo "(ou rode: ./stop.sh)"
