# Pulso CG

Sistema local de grafismo televisivo para OBS Studio y vMix. Incluye diez plantillas, seis capas simultáneas, preview, TAKE, actualización al aire, OUT, cola de emisión, persistencia local y salida web transparente.

## Cómo se usa (3 pasos)

1. **Mis gráficos** (izquierda): pulsa **Nuevo gráfico** y elige el tipo.
2. **Editar** (derecha): escribe el texto, pulsa **Guardar cambios** y luego **Mostrar en pantalla**.
3. **Pantalla** (centro): arrastra el gráfico para moverlo; el punto blanco de
   la esquina cambia el tamaño. También hay **Posiciones rápidas**.

Puedes tener varios gráficos en pantalla a la vez: cada uno tiene su botón de
ojo para mostrarlo u ocultarlo. Los cambios de texto, logos, posición, colores,
acabado, letra y animación se preparan en la vista previa. **Guardar cambios**
los aplica juntos; **Descartar** recupera lo guardado. Los borradores se conservan
al cambiar de gráfico y al recargar la misma pestaña. **Ocultar todo** retira todo de golpe. El botón
**Cómo se usa** del panel repite esta guía.

Tipos disponibles: Nombre y cargo, Texto simple, Titular, Última hora,
Ubicación en vivo, Cita, A continuación, Pantalla completa, Cinta de noticias y
Marca del canal.

## Guardados y perfiles

- **Guardados** (pestaña junto a *Mis gráficos*): todo lo que muestras en
  pantalla se guarda solo, sin repetirse, en carpetas: Nombres, Titulares,
  Lugares y textos, Citas y Otros. Hay buscador.
  - Clic en un guardado → se carga en el borrador del gráfico elegido.
    Pulsa **Guardar cambios** para aplicarlo.
  - El ojo → carga el texto; confirma los cambios pendientes antes de mostrarlo.
  - El botón de portapapeles → **pega una lista**, una línea por elemento:
    `Ana Ruiz | Alcaldesa de Tulcán`.
  - También puedes guardar a mano con el botón de marcador del panel Editar.
- **Perfiles** (botón *Perfil* arriba a la izquierda): uno por programa
  (Noticiero, Deportes…). Cada perfil conserva sus gráficos ya acomodados y sus
  guardados. Cambiar de perfil no borra nada. Puedes crear uno vacío o copiar el
  actual, renombrar, eliminar, **descargar una copia de seguridad (.json)** e
  importarla después o en otra computadora.

Todo se guarda en `data/state.json`.

## Noticias premium (perfil Principal)

Los rótulos generales siguen a los canales de noticias actuales: entrada con
barras de color, rótulo de nombre en dos niveles (nombre en placa de cristal +
cargo en banda de color) con el logo del canal, titular con bandera **EN VIVO**
y reloj, **última hora** con franjas en movimiento, ubicación con hora local,
cinta con logo y reloj, y mosca con bandera EN VIVO sobre el logo. El logo del
canal se activa o desactiva en Editar → Logo. También existe el perfil listo
**Noticias**.

## Deportes: fútbol, básquet y vóley

En **Perfil → Crear un perfil listo para usar** hay tres perfiles deportivos.
Cada uno trae sus gráficos ya acomodados, el estilo del deporte y planteles de
ejemplo en Guardados (equipos ficticios: cambia nombres, siglas y colores).

| Gráfico | Fútbol | Básquet | Vóley |
| --- | --- | --- | --- |
| Marcador siempre en pantalla | Goles, reloj, periodo, tiempo añadido, rojas | Puntos, cuarto, reloj (décimas en el último minuto), posesión 24/14, faltas, BONUS, tiempos muertos | Puntos, sets, saque, set actual y parciales |
| Previa / resultado (VS o marcador final) | ✓ | ✓ | ✓ |
| Alineación | En cancha según la formación (4-3-3…) | Quinteto y suplentes | Seis titulares, líbero y suplentes |
| Tarjeta (amarilla, roja, doble amarilla) | ✓ | | |
| Cambio (entra / sale) | ✓ | ✓ | ✓ |
| Gol / anotación (¡GOL!, ¡TRIPLE!, ¡ACE!…) | ✓ | ✓ | ✓ |
| Jugador con estadísticas | ✓ | ✓ | ✓ |
| Aviso (VAR, tiempo muerto, challenge, lesión) | ✓ | ✓ | ✓ |
| Estadísticas con barras | ✓ | ✓ | ✓ |
| Parciales por cuarto o set | | ✓ | ✓ |

Al elegir un marcador, el panel Editar muestra la sección **Partido** con
botones grandes: +1/+2/+3, faltas, rojas, iniciar/pausar el reloj, 24/14,
periodo o cuarto (reinicia reloj y faltas), tiempo añadido, punto de vóley
(cambia el saque solo) y **Cerrar set**. Los relojes los lleva el programa, así
que OBS, vMix y el panel marcan exactamente lo mismo.

**Escudos y logos**: cada equipo y competición acepta su imagen (PNG con fondo
transparente queda mejor) en Editar → Equipos y textos. En el marcador, el botón
**Usar estos escudos y colores en todo el perfil** los copia a la previa,
estadísticas, tarjetas, cambios, jugador… Las imágenes se guardan en
`data/assets/` y viajan dentro de la copia de seguridad del perfil.

**Ensayo en tiempo real**: en Perfil → Ensayo en tiempo real, elige Noticias,
Fútbol, Básquet o Vóley y se reproduce una transmisión completa (previa,
alineaciones, reloj, goles o puntos, tarjetas, VAR, cambios, sets, final) en un
perfil aparte "Ensayo · …". Se ve en la pantalla del panel y en OBS; arriba
aparece el paso actual y el botón Detener. Tus perfiles no se tocan.

Las plantillas deportivas también están en **Nuevo gráfico** para cualquier
perfil. En Cambio, Tarjeta o Jugador, al escribir un nombre del plantel
guardado se completan solos el dorsal y el equipo.

## Instalar (aplicación de escritorio)

Instaladores actualizados en `dist/2.1.1/`:

| Sistema | Archivo |
| --- | --- |
| Mac con chip Apple (M1, M2, M3…) | `Pulso-CG-2.1.1-mac-arm64.dmg` |
| Mac con Intel | `Pulso-CG-2.1.1-mac-x64.dmg` |
| Windows 10/11 | `Pulso-CG-2.1.1-Windows-Setup.exe` |

- **Mac**: abre el `.dmg` y arrastra **Pulso CG** a Aplicaciones. La primera vez:
  clic derecho sobre la app → **Abrir** → **Abrir** (la app no está firmada
  por Apple todavía).
- **Windows**: ejecuta el instalador. Si aparece "Windows protegió su PC":
  **Más información → Ejecutar de todas formas**. Crea un acceso directo en el
  escritorio. Si el firewall pregunta, permite el acceso.

La app abre el panel en su propia ventana y arranca el servidor para OBS/vMix
(`http://localhost:4173/output`). Al cerrar la ventana, OBS deja de recibir
gráficos (pide confirmación). Menú **Archivo**: copiar enlace para OBS, abrir
la salida, descargar copia de seguridad completa y abrir la carpeta de datos.

## Dónde se guarda todo

Los cambios confirmados se guardan en la carpeta estándar del sistema (no junto
al programa, así sobrevive a actualizaciones o reinstalaciones):

- macOS: `~/Library/Application Support/Pulso CG/data`
- Windows: `%APPDATA%\Pulso CG\data`

Dentro: `state.json` (perfiles, gráficos, guardados, estilos), copia
`state.backup.json`, `assets/` (escudos, logos y fondos: **se guarda una copia
de la imagen, no la ruta**, así que puedes borrar o mover el archivo original) y
`custom-logo` (logo del canal). **Perfil → Descargar copia completa** genera un
solo `.json` con todos los perfiles y sus imágenes; **Importar** lo agrega en
otra computadora sin borrar lo que ya existe.

## Para desarrollar

Sin instalar nada (descarga su propio Node la primera vez):

```sh
./start.sh --open      # servidor + panel en el navegador (Windows: Iniciar Pulso CG.bat)
./start.sh test        # pruebas
./start.sh stress      # prueba de estrés
```

Aplicación de escritorio desde el código y nuevos instaladores:

```sh
export PATH="$PWD/.node/darwin-arm64/bin:$PATH"
npm install
npm run app            # abre la app (desde VS Code: env -u ELECTRON_RUN_AS_NODE npm run app)
npm run dist:mac       # crea los .dmg en dist/
npm run dist:win       # crea el instalador de Windows en dist/
```

## OBS Studio

1. Añade una **Fuente de navegador**.
2. URL: `http://localhost:4173/output` si OBS está en el mismo equipo. En **Conectar OBS** elige el enlace de red para otra PC.
3. Ancho: `1920`; alto: `1080`.
4. Desactiva “Apagar la fuente cuando no sea visible”.

## vMix

1. Añade una entrada **Web Browser** con la misma URL, 1920 × 1080.
2. Úsala en uno de los canales Overlay.

## Si OBS no muestra nada

Mira el indicador de arriba en el panel:

- **OBS conectado** (verde): OBS recibe los gráficos. Si aun así no ves nada,
  revisa que pulsaste **Mostrar** en algún gráfico y que la fuente Navegador
  esté visible (ojo encendido) y por encima de tu cámara en la lista de fuentes.
- **OBS sin conectar** (ámbar): selecciona la fuente Navegador en OBS y pulsa
  **Actualizar**. Pasa cuando OBS se abrió antes que Pulso CG. A partir de esta
  versión la salida reintenta sola cada 2 segundos y se recarga sola cuando
  actualizas el programa.
- OBS en otra computadora: usa la dirección "Desde otro equipo" que aparece en
  la ventana de Pulso CG (y en el panel), no `localhost`.

Tus datos se guardan de forma segura: cada guardado es atómico y se mantiene una
copia en `data/state.backup.json`, que se usa sola si el archivo principal se daña.

## Atajos

- `Ctrl + Enter`: mostrar u ocultar el gráfico elegido.
- Flechas: mover el gráfico elegido (con `Shift`, de 10 en 10 px).

## Personalización (panel Editar)

- **Posición y tamaño**: 9 posiciones rápidas, tamaño y desplazamiento.
- **Colores y acabado**: 10 paletas, 4 colores propios, acabado (Cristal, Satén,
  Hielo, Aurora, Metal, Tipográfico), opacidad, esquinas, sombra, textura, brillo.
- **Letra**: 6 tipografías, grosor, tamaños y etiquetas en mayúsculas.
- **Animación**: 4 entradas, velocidad y "ocultar solo después de N segundos".
- **Logo**: el de Pulso CG o el tuyo, esquina y tamaño.
- **Mis estilos**: guarda un estilo con nombre o úsalo en todos tus gráficos.

## Librerías incluidas

Todo se sirve localmente desde `public/vendor/` (sin internet durante la emisión,
sin `npm install`):

- **GSAP 3.15** + SplitText + CustomEase: animaciones de entrada, salida,
  actualización y ticker.
- **Fontsource**: Inter, Inter Tight, Manrope, Montserrat, Oswald, Playfair
  Display y JetBrains Mono (variables, licencia OFL).
- **Lucide**: iconografía del panel.
- **Coloris**: selector de color.

Nota sobre el material Cristal/Hielo: OBS y vMix componen la fuente web encima
del video, así que el desenfoque del fondo real no es posible desde HTML. La
transparencia, el brillo especular y la sombra sí se ven al aire; en PVW con un
fotograma propio verás una aproximación fiel.

## Pruebas de estrés

```sh
./start.sh stress      # Windows: powershell -File start.ps1 stress
```

Levanta un servidor aparte (no toca tus datos), conecta 40 salidas como OBS y
5 paneles, ejecuta los cuatro ensayos a velocidad ×25, lanza 3 000 acciones de
20 operadores simultáneos, comprueba que todas las salidas reciben el último
cambio, prueba escudos y copias de seguridad, y reinicia para verificar que los
datos sobreviven y nada vuelve solo al aire.

## Pruebas

```powershell
npm test
```

La aplicación no necesita instalar dependencias externas.


## Ecuavóley y partido compartido

El perfil listo **Ecuavóley · Ecuador** incluye ambos equipos con sus banderas,
alineaciones de tres jugadores, marcador, previa/resultado, jugador, anotación,
cambio, aviso, estadísticas, parciales y narración. Los nombres de ejemplo son
ficticios. Las banderas se pueden reemplazar por escudos subidos.

En **Equipos y textos** del marcador se configura el formato (3 o 5 sets), los
puntos del set normal y decisivo, la ventaja y el sistema de puntuación. En
ecuavóley, **Gana jugada** cambia el saque sin sumar si el equipo no sacaba;
los botones de Puntos sirven para corregir el tanteo. En vóley cada jugada suma.

Hay un único set actual para ambos equipos. **Sets ganados** se calcula a
partir de los parciales cerrados, no se modifica por equipo. **Cerrar set**
comprueba puntos y ventaja. Al terminar el partido se bloquea sumar jugadas;
para corregir, edita los parciales o reinicia. Confirma el saque del siguiente
set con los botones de saque.

El marcador es la fuente de nombres, colores, imágenes, set, resultado y
parciales del perfil. Cambia esos datos en el marcador para actualizar los
demás gráficos. Los jugadores, estadísticas, avisos, sede y diseño se editan
en cada gráfico. No mezcles partidos distintos dentro de un mismo perfil.

### Tamaño de logos y vista previa

En **Logos y escudos → Tamaño de los escudos** puedes ajustar los logos de
los equipos por gráfico. El marcador usa logos grandes, cuadrados de color
y una cabecera con competición y set. El logo del canal tiene su propia vista
previa y control de tamaño. Confirma las modificaciones con **Guardar cambios**.
Al editar una placa central oculta, la vista previa retira otras placas centrales
para evitar superposiciones; la salida para OBS conserva los gráficos al aire.

El marcador de ecuavóley se muestra como una barra horizontal centrada abajo: ambos equipos, logos, puntos, sets y saque en una sola fila. Puedes moverlo y cambiar su tamaño desde **Posición y tamaño**.

### Paquete completo de ecuavóley 2.1

Incluye 16 gráficos listos: marcador horizontal, previa/resultado, dos
alineaciones, jugador, anotación, cambio, tiempo muerto de cada equipo,
punto de set, punto de partido, resultado del último set, cambio de cancha,
estadísticas, parciales y narración. Los avisos de punto de set y partido
comprueban tanteo, ventaja y saque; no se pueden mostrar cuando no corresponden
y salen si dejan de cumplirse. El resultado del set usa el último parcial
cerrado. Textos, logos y diseño se confirman con **Guardar cambios**.

## Usar otra PC en la misma red

En el equipo emisor, abre Pulso CG y pulsa **Conectar OBS**. En la sección
**OBS en otra computadora de la misma red**, copia el enlace con la IP del
emisor. En la otra PC abre primero ese enlace cambiando `/output` por
`/test-obs`. La prueba confirma si recibe la página, los datos y cuántos gráficos
hay al aire. Después pega la URL completa `/output` en una fuente Navegador de
OBS o Web Browser de vMix, a 1920 × 1080.

Para operar textos y puntos desde la otra PC, abre la misma IP sin `/output`.
Ambas computadoras comparten el partido del emisor. La dirección `localhost`
solo corresponde al equipo que la abre. Si la prueba no carga desde el receptor,
comprueba la red de invitados/aislamiento y permite Pulso CG en el firewall
del emisor (TCP 4173). No hace falta redirigir puertos del router en la red local.
