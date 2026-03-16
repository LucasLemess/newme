#!/bin/bash

echo "[*] Parando FreteIQ..."
lsof -ti:8000 | xargs kill -9 2>/dev/null && echo "[✓] Backend parado" || echo "[-] Backend já estava parado"
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "[✓] Frontend parado" || echo "[-] Frontend já estava parado"
