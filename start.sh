#!/bin/sh
# Ejecuta Pulso CG con un Node propio dentro del proyecto (.node/<sistema>/),
# como un entorno virtual: no instala nada en el sistema. Cada sistema tiene
# su carpeta, así la misma copia del proyecto sirve en Mac, Windows y Linux.
# Uso: ./start.sh           → inicia el servidor
#      ./start.sh --open    → inicia y abre el panel en el navegador
#      ./start.sh test      → ejecuta las pruebas
set -e
cd "$(dirname "$0")"

NODE_VERSION="22.23.3"

case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) PLATFORM="darwin-arm64" ;;
  Darwin-x86_64) PLATFORM="darwin-x64" ;;
  Linux-x86_64) PLATFORM="linux-x64" ;;
  Linux-aarch64) PLATFORM="linux-arm64" ;;
  *) echo "Sistema no soportado: $(uname -s) $(uname -m)"; exit 1 ;;
esac

ENV_DIR=".node/$PLATFORM"
# Compatibilidad: versiones anteriores dejaban Node directamente en .node/.
if [ -x ".node/bin/node" ] && [ ! -d "$ENV_DIR" ]; then
  mkdir -p "$ENV_DIR.tmp"
  for entry in .node/*; do case "$entry" in .node/*-*) ;; *) mv "$entry" "$ENV_DIR.tmp/" ;; esac; done
  mv "$ENV_DIR.tmp" "$ENV_DIR"
fi

NODE="$ENV_DIR/bin/node"
if [ ! -x "$NODE" ] || [ "$("$NODE" -v 2>/dev/null)" != "v$NODE_VERSION" ]; then
  echo "Preparando Pulso CG por primera vez (descargando Node $NODE_VERSION)…"
  rm -rf "$ENV_DIR"
  mkdir -p "$ENV_DIR"
  if ! curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-$PLATFORM.tar.gz" | tar xz -C "$ENV_DIR" --strip-components=1; then
    rm -rf "$ENV_DIR"
    # Sin internet: si el equipo ya tiene Node 20 o superior, se usa ese.
    if command -v node >/dev/null 2>&1 && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ]; then
      NODE="$(command -v node)"
    else
      echo "No se pudo descargar Node. Conéctate a internet una vez y vuelve a intentarlo."
      exit 1
    fi
  fi
fi

if [ "$1" = "test" ]; then
  exec "$NODE" --test test/*.mjs
fi
if [ "$1" = "stress" ]; then
  exec "$NODE" tools/stress.mjs
fi
exec "$NODE" server.mjs "$@"
