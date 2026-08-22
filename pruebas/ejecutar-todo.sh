#!/usr/bin/env bash
# Toda la red de pruebas del núcleo. Sin dependencias: solo node.
#
#   bash pruebas/ejecutar-todo.sh
#
# Pasarlo antes de cada commit que toque `src/nucleo/`, y es además la puerta
# del despliegue: si esto está rojo, a GitHub Pages no sube nada.
set -u
cd "$(dirname "$0")/.."

ROJO=$'\033[31m'; VERDE=$'\033[32m'; FIN=$'\033[0m'
fallos=0

for f in pruebas/*.mjs; do
  case "$(basename "$f")" in
    ayuda.mjs|fixtures.mjs) continue ;;
  esac
  echo ""
  echo "=============================================================="
  echo "  $f"
  echo "=============================================================="
  node "$f" || fallos=$((fallos + 1))
done

echo ""
if [ "$fallos" -gt 0 ]; then
  echo "${ROJO}FALLAN $fallos bloque(s).${FIN}"
  exit 1
fi
echo "${VERDE}Todo en verde.${FIN}"
