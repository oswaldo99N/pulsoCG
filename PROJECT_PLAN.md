# Sistema profesional de grafismo para televisión

> Estado: identidad **Pulso CG**, paquete MVP de diez plantillas, tres capas simultáneas, rundown y salida transparente implementados.

## 1. Objetivo

Construir un sistema local de grafismo broadcast que permita preparar, previsualizar y emitir rótulos desde un único panel de operación. La misma salida gráfica transparente deberá funcionar en OBS Studio y vMix a 1920 × 1080, con una arquitectura preparada para UHD en una fase posterior.

El producto tendrá dos superficies separadas:

- **Control:** interfaz privada donde el operador redacta, ordena, previsualiza y pone al aire los gráficos.
- **Salida:** página transparente, sin controles, que OBS o vMix captura como fuente web.

## 2. Paquete gráfico

### MVP: plantillas esenciales

1. **Identificación de una línea:** nombre, lugar o dato breve.
2. **Identificación de dos líneas:** nombre + cargo/institución.
3. **Titular:** antetítulo/categoría + titular principal de hasta dos líneas.
4. **Última hora:** variante prioritaria y claramente diferenciada.
5. **Localización / EN VIVO:** lugar, corresponsal y estado de la conexión.
6. **Cita:** declaración + autor o fuente.
7. **Ticker inferior:** etiqueta fija + secuencia de titulares en movimiento.
8. **Mosca de canal:** logotipo, señal EN VIVO y, opcionalmente, reloj.
9. **Pantalla completa:** titular, resumen, imagen y fuente.
10. **Próximamente / separador:** contenido siguiente o cambio de bloque.

### Segunda etapa

- Sobre-hombro (OTS) para presentador.
- Placa lateral o media pantalla.
- Redes sociales y código QR.
- Marcadores, resultados, elecciones, clima y datos tabulares.
- Créditos y placas de cierre.
- Plantillas patrocinadas.

No conviene lanzar todas las variantes a la vez. Primero se valida en emisión el MVP y luego se amplía sin romper el lenguaje visual.

## 3. Reglas broadcast

- Lienzo maestro: **1920 × 1080, 16:9**.
- Todos los textos y elementos esenciales deben permanecer dentro del área segura para gráficos.
- Margen seguro inicial: **5% por cada lado** (96 px horizontales y 54 px verticales en 1080p), configurable por canal.
- Texto grande, de alto contraste y legible sobre video claro u oscuro.
- El sistema debe limitar líneas y caracteres, avisar desbordamientos y aplicar reducción tipográfica solo dentro de límites definidos.
- Entrada y salida animadas de duración consistente; nunca cortar una animación a mitad salvo en una orden de emergencia.
- Respetar zonas ocupadas: mosca, ticker, subtítulos, intérprete de lengua de señas y marcas comerciales no deben colisionar.
- La previsualización debe ser idéntica a la señal emitida.

## 4. Flujo del operador

1. Elegir una plantilla.
2. Completar sus campos o seleccionar un elemento guardado.
3. Validar ortografía, longitud y campos obligatorios.
4. Ver el resultado en **PREVIEW**.
5. Enviar el gráfico a una cola o pulsar **TAKE**.
6. Ver estado inequívoco: PREPARADO, ENTRANDO, AL AIRE o SALIENDO.
7. Pulsar **OUT** o usar una duración automática cuando corresponda.
8. Conservar historial y permitir recuperar contenido sin volver a escribirlo.

Acciones críticas: TAKE, OUT, UPDATE, NEXT, CLEAR ALL y EMERGENCIA.

## 5. Arquitectura propuesta

```text
Panel del operador ── WebSocket ── Servidor local ── WebSocket ── Renderer transparente
                                  │
                                  ├── SQLite: plantillas, contenidos, cola e historial
                                  ├── Adaptador OBS WebSocket (opcional)
                                  └── Adaptador API HTTP de vMix (opcional)

OBS:  Browser Source ── http://equipo:puerto/output/program
vMix: Web Browser   ── http://equipo:puerto/output/program
```

La integración principal será la URL transparente. Los adaptadores de OBS y vMix añadirán automatización —mostrar/ocultar fuentes, comprobar conexión y sincronizar estados—, pero el grafismo deberá seguir funcionando aunque no estén configurados.

Tecnología recomendada para la primera versión:

- TypeScript de extremo a extremo.
- Aplicación web con panel y renderer separados.
- WebSocket para cambios instantáneos.
- SQLite para operación local y copias de seguridad simples.
- CSS/HTML para gráficos y animaciones, evitando dependencias de un motor propietario.
- Diseño por tokens: color, tipografía, espaciado, velocidad y curvas de animación centralizados.

## 6. Modelo funcional mínimo

- **Template:** definición de campos, límites, posiciones, animaciones y tema visual.
- **Graphic item:** contenido concreto preparado por el operador.
- **Layer:** canal gráfico independiente; por ejemplo mosca, lower third, ticker y alerta.
- **Rundown:** lista ordenada de elementos preparados.
- **Playout state:** preview, program, transición y elemento siguiente.
- **Theme:** identidad del canal sin duplicar la lógica de cada plantilla.
- **Integration:** configuración de OBS o vMix, con diagnóstico de conexión.

Desde el principio se deben admitir caracteres Unicode, tildes y ñ; también escape seguro del texto para impedir que un contenido rompa el renderer.

## 7. Orden de desarrollo

### Fase 0 — definición

- Nombre del canal/producto, logotipo, paleta, tipografías y tono visual.
- Resolución y frecuencia de trabajo.
- Inventario definitivo del MVP y ejemplos reales de texto.
- Mapa de capas y zonas reservadas.
- Criterios de aceptación y equipos de prueba.

### Fase 1 — núcleo técnico

- Proyecto TypeScript y servidor local.
- Panel básico, renderer transparente y canal WebSocket.
- Estado PREVIEW/PROGRAM y reconexión automática.
- Guías de área segura y modo de diagnóstico.

### Fase 2 — primer flujo completo

- Lower third de dos líneas.
- Edición, preview, TAKE, UPDATE y OUT.
- Animaciones de entrada/salida.
- Prueba real simultánea en OBS y vMix.

### Fase 3 — paquete MVP

- Titular, última hora, ubicación, cita, ticker, mosca y pantalla completa.
- Capas simultáneas con reglas anti-colisión.
- Cola, presets, duplicado e historial.

### Fase 4 — operación profesional

- Roles de operador y administrador.
- Atajos de teclado y, después, Stream Deck/MIDI si se requiere.
- Guardado automático, recuperación tras reinicio y exportación/importación.
- Registros de acciones y estado de conexiones.

### Fase 5 — integraciones y datos

- Control opcional de OBS mediante obs-websocket 5.x.
- Control opcional de overlays de vMix mediante su API HTTP.
- Fuentes RSS/JSON/CSV/Google Sheets solo con validación, aprobación y posibilidad de edición previa.

### Fase 6 — pruebas de emisión

- 1080p a 30 y 60 fps según el flujo elegido.
- Textos mínimos, máximos, caracteres especiales y nombres largos.
- Reconexión, reinicio, doble clic, actualización al aire y caída del servidor.
- Carga prolongada, consumo de CPU/GPU y sincronía de animaciones.
- Ensayo completo con un operador distinto del desarrollador.

## 8. Criterios de aceptación del primer hito

- Un operador puede crear un nombre y cargo, previsualizarlo y ponerlo al aire sin abrir OBS o vMix.
- OBS y vMix muestran la misma composición con transparencia real.
- TAKE y OUT responden inmediatamente y no dejan estados visuales incompletos.
- Un reinicio recupera los elementos guardados, pero nunca devuelve un gráfico al aire por accidente.
- Los textos fuera de límite producen una advertencia antes de emitirse.
- La salida permanece limpia: sin barras de desplazamiento, fondo, cursor ni interfaz.

## 9. Decisiones pendientes antes de diseñar

1. Identidad del canal: nombre y logotipo.
2. Estilo: informativo sobrio, institucional, deportivo, entretenimiento u otro.
3. Colores y tipografías disponibles con licencia.
4. Resolución/frecuencia principal: 1080p30, 1080p50 o 1080p60.
5. Equipo de salida principal para la primera prueba: OBS o vMix.
6. Operación en una sola computadora o desde otro equipo en la red local.
7. Necesidad inmediata de reloj, clima, redes, deportes o datos externos.

