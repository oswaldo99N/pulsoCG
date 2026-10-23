#!/bin/sh
# macOS: doble clic para abrir Pulso CG. Deja esta ventana abierta mientras transmites.
cd "$(dirname "$0")"
chmod +x ./start.sh 2>/dev/null
./start.sh --open
echo ""
echo "Pulso CG se detuvo. Puedes cerrar esta ventana."
read -r _
