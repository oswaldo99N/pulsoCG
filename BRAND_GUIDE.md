# Pulso CG — identidad de marca

## Concepto

**Pulso** representa la información que está ocurriendo ahora y el ritmo continuo de una señal en vivo. **CG** identifica el producto como generador de caracteres y grafismo broadcast.

El símbolo combina una letra **P** abierta con una línea de pulso. Su construcción angular comunica precisión técnica y evita parecerse a la identidad de un canal existente.

## Logotipo

El archivo maestro está en `public/logo.svg`. Tiene fondo transparente y puede escalarse sin perder calidad.

- Versión principal: símbolo coral, palabra PULSO clara y descriptor CG gris.
- No estirar, inclinar, redibujar ni añadir resplandores.
- Mantener un área libre equivalente a la mitad de la altura del símbolo.
- Para tamaños menores de 96 px de ancho debe usarse únicamente el símbolo.

## Paleta

| Rol | Color | Uso |
| --- | --- | --- |
| Carbón profundo | `#080B10` | Fondo técnico y salida oscura |
| Carbón | `#0D1118` | Lienzo principal |
| Superficie | `#121822` | Formularios y paneles |
| Línea | `#273243` | Separadores y elementos inactivos |
| Texto principal | `#EDF1F5` | Información crítica |
| Texto secundario | `#AAB4C3` | Contexto y etiquetas |
| Coral de señal | `#FF5B45` | TAKE, selección y marca |
| Verde operativo | `#47D18C` | Conexión correcta |
| Ámbar preventivo | `#F5B84B` | Espera o reconexión |

El coral se reserva para la marca y las acciones principales. Verde y ámbar son colores semánticos, no decorativos.

## Tipografía

La primera versión utiliza Arial/Helvetica porque está disponible localmente y se renderiza de forma estable en los navegadores integrados de OBS y vMix. La jerarquía depende de peso, escala y espacio, no de mezclar familias.

## Movimiento

- Entrada al aire: 480 ms, desplazamiento horizontal y opacidad.
- Salida: 320 ms, más rápida que la entrada.
- Actualización al aire: 280 ms, solo cambia el contenido.
- Sin rebotes ni movimientos decorativos.
- El modo de movimiento reducido entrega el estado final inmediatamente.

## Voz de interfaz

Frases cortas y operativas: **TAKE**, **OUT**, **Actualizar al aire**, **Entrando**, **Al aire**, **Saliendo**. Los estados nunca dependen únicamente del color.
