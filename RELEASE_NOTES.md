# Pulso CG 2.2.2

- Comprobación de actualizaciones al abrir y cada 30 minutos; aviso persistente aunque se pierda Internet.
- Descargas únicamente al solicitarlas; confirmación si Windows detecta una salida OBS/vMix conectada.
- Salidas ligeras: sin biblioteca, perfiles ni gráficos ocultos. La vista previa reutiliza el flujo del panel.
- Recursos comprimidos y caché validada para reducir transferencias repetidas y mantener el código actualizado.
- Vista previa ligera de forma predeterminada, configurable con el botón de la hoja; pausa de trabajo oculto y limpieza de animaciones.
- Carga de fuentes bajo demanda y menos reconstrucciones del panel.
- 53 pruebas y 12 comprobaciones de carga correctas. Ensayo con 16 gráficos y un marcador al aire: mensaje de salida 93 % más pequeño y JavaScript del panel 72 % más pequeño con gzip. No es una medición de subida de vídeo real.

## Instalar en Mac

Cierra con Cmd+Q, abre el DMG de tu arquitectura, arrastra Pulso CG a Aplicaciones y acepta Reemplazar. Abre desde Aplicaciones y comprueba v2.2.2. Los perfiles y logos se conservan.

Esta distribución Mac usa firma local: ofrece aviso y descarga manual; la instalación automática en Mac requiere Developer ID y notarización. Windows no tiene firma comercial. Los paquetes de Windows e Intel se verificaron como archivos; no se ejecutaron en equipos nativos de esas plataformas.
