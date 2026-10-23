import { ASSET_PATTERN, assetUrl, normalizeVolley, SPORT_TEMPLATES, SPORT_CATEGORIES } from "./sports.js";

export { SPORT_CATEGORIES };

const GENERAL_TEMPLATES = {
  "lower-third": {
    name: "Nombre y cargo", shortName: "Nombre", layer: "primary", icon: "user-round",
    description: "Presenta a una persona: nombre y a qué se dedica.",
    fields: [
      { id: "kicker", label: "Etiqueta", max: 18, default: "EN VIVO", width: "short" },
      { id: "name", label: "Nombre", max: 42, required: true, default: "Valentina Torres" },
      { id: "role", label: "Cargo o descripción", max: 64, required: true, default: "Periodista · Pulso Noticias" }
    ]
  },
  "single-line": {
    name: "Texto simple", shortName: "Texto", layer: "primary", icon: "tag",
    description: "Una sola línea: un lugar, un dato o un nombre.",
    fields: [
      { id: "label", label: "Identificación", max: 56, required: true, default: "Palacio de Gobierno" },
      { id: "context", label: "Contexto breve", max: 24, default: "QUITO" }
    ]
  },
  headline: {
    name: "Titular", shortName: "Titular", layer: "primary", icon: "heading",
    description: "La noticia principal en una o dos líneas.",
    fields: [
      { id: "kicker", label: "Categoría", max: 18, default: "NACIONAL", width: "short" },
      { id: "headline", label: "Titular", max: 96, required: true, multiline: true, default: "Asamblea inicia el debate del nuevo proyecto económico" }
    ]
  },
  breaking: {
    name: "Última hora", shortName: "Última hora", layer: "primary", icon: "siren",
    description: "Aviso urgente a lo ancho de la pantalla.",
    fields: [
      { id: "label", label: "Etiqueta", max: 20, default: "ÚLTIMA HORA", width: "short" },
      { id: "headline", label: "Información confirmada", max: 110, required: true, multiline: true, default: "Autoridades actualizan la información oficial" }
    ]
  },
  location: {
    name: "Ubicación en vivo", shortName: "Ubicación", layer: "primary", icon: "map-pin",
    description: "Desde dónde se transmite y quién reporta.",
    fields: [
      { id: "status", label: "Estado", max: 18, default: "EN VIVO", width: "short" },
      { id: "location", label: "Ubicación", max: 46, required: true, default: "Tulcán, Carchi" },
      { id: "reporter", label: "Reportero o referencia", max: 58, default: "Reporte de Camila Andrade" }
    ]
  },
  quote: {
    name: "Cita", shortName: "Cita", layer: "primary", icon: "quote",
    description: "Una frase textual y quién la dijo.",
    fields: [
      { id: "quote", label: "Declaración", max: 170, required: true, multiline: true, default: "Nuestra prioridad es garantizar información clara y oportuna para la ciudadanía." },
      { id: "source", label: "Autor o fuente", max: 70, required: true, default: "Andrea Salazar · Ministra de Gobierno" }
    ]
  },
  upcoming: {
    name: "A continuación", shortName: "Próximo", layer: "primary", icon: "clock-3",
    description: "Anuncia lo que viene después.",
    fields: [
      { id: "label", label: "Etiqueta", max: 20, default: "A CONTINUACIÓN", width: "short" },
      { id: "title", label: "Próximo contenido", max: 82, required: true, multiline: true, default: "Análisis de las noticias que marcan la jornada" },
      { id: "time", label: "Hora o referencia", max: 28, default: "Después de la pausa", width: "short" }
    ]
  },
  fullscreen: {
    name: "Pantalla completa", shortName: "Full screen", layer: "primary", icon: "scan",
    description: "Ocupa toda la pantalla: título, resumen y fuente.",
    fields: [
      { id: "kicker", label: "Categoría", max: 18, default: "CLAVES", width: "short" },
      { id: "title", label: "Título", max: 90, required: true, multiline: true, default: "Los puntos principales de la jornada" },
      { id: "summary", label: "Resumen", max: 210, required: true, multiline: true, default: "Información verificada, contexto y datos esenciales para comprender la noticia." },
      { id: "source", label: "Fuente", max: 60, default: "Fuente: Redacción Pulso" }
    ]
  },
  ticker: {
    name: "Cinta de noticias", shortName: "Cinta", layer: "ticker", icon: "rows-3",
    description: "Titulares que pasan en movimiento abajo.",
    fields: [
      { id: "label", label: "Sección fija", max: 18, default: "TITULARES", width: "short" },
      { id: "items", label: "Noticias (sepáralas con | )", max: 420, required: true, multiline: true, default: "Gobierno anuncia nuevas medidas | Autoridades mantienen operativo nacional | Deportes: jornada decisiva esta noche" }
    ]
  },
  bug: {
    name: "Marca del canal", shortName: "Marca", layer: "bug", icon: "radio-tower",
    description: "Nombre del canal, EN VIVO y reloj en la esquina.",
    fields: [
      { id: "station", label: "Sigla del canal", max: 12, required: true, default: "PULSO" },
      { id: "status", label: "Estado", max: 12, default: "EN VIVO", width: "short" },
      { id: "clock", label: "Mostrar reloj", type: "checkbox", default: true }
    ]
  }
};

// Las plantillas generales llevan categoría "general"; las deportivas vienen de sports.js.
export const TEMPLATES = Object.freeze(Object.fromEntries([
  ...Object.entries(GENERAL_TEMPLATES).map(([id, template]) => [id, { category: "general", ...template }]),
  ...Object.entries(SPORT_TEMPLATES)
]));

export const TEMPLATE_ORDER = Object.freeze(Object.keys(TEMPLATES));

// Materiales: cada uno define cómo se construye la superficie (luz, textura,
// profundidad), no solo el color. El color sigue siendo independiente.
export const DESIGN_PRESETS = Object.freeze([
  { id: "glass", name: "Cristal", note: "Translúcido con brillo especular" },
  { id: "satin", name: "Satén", note: "Mate profundo, luz suave" },
  { id: "frost", name: "Hielo", note: "Superficie clara esmerilada" },
  { id: "aurora", name: "Aurora", note: "Luz de acento difusa" },
  { id: "metal", name: "Metal", note: "Cepillado con bisel" },
  { id: "minimal", name: "Tipográfico", note: "Sin placa, solo texto y luz" }
]);

export const FONT_PRESETS = Object.freeze([
  { id: "inter", name: "Inter", family: "'Inter Variable'", note: "Neutra" },
  { id: "inter-tight", name: "Inter Tight", family: "'Inter Tight Variable'", note: "Compacta" },
  { id: "manrope", name: "Manrope", family: "'Manrope Variable'", note: "Moderna" },
  { id: "montserrat", name: "Montserrat", family: "'Montserrat Variable'", note: "Geométrica" },
  { id: "oswald", name: "Oswald", family: "'Oswald Variable'", note: "Condensada" },
  { id: "playfair", name: "Playfair", family: "'Playfair Display Variable'", note: "Editorial serif" }
]);

export const ANIMATION_PRESETS = Object.freeze([
  { id: "reveal", name: "Máscara", note: "Barra de acento abre la placa" },
  { id: "slide", name: "Deslizar", note: "Entrada lateral con desenfoque de movimiento" },
  { id: "rise", name: "Elevar", note: "Sube con líneas escalonadas" },
  { id: "fade", name: "Fundido", note: "Enfoque suave sin desplazamiento" }
]);

export const ALIGN_OPTIONS = Object.freeze(["left", "center", "right"]);

export const COLOR_PRESETS = Object.freeze([
  { id: "pulso", name: "Pulso", accent: "#ff4d3d", accent2: "#ff9a3d", background: "#0e1015", text: "#f5f6f8" },
  { id: "upec", name: "UPEC Carchi", note: "Inspirada en la identidad institucional", accent: "#f2a900", accent2: "#ffd25e", background: "#004a30", text: "#ffffff" },
  { id: "noir", name: "Noir", accent: "#ffffff", accent2: "#9aa0aa", background: "#0a0a0b", text: "#ffffff" },
  { id: "ocean", name: "Océano", accent: "#3d8bff", accent2: "#38d6ff", background: "#08111f", text: "#eef5ff" },
  { id: "emerald", name: "Esmeralda", accent: "#22c47a", accent2: "#a3f06b", background: "#07160f", text: "#effff6" },
  { id: "violet", name: "Violeta", accent: "#8b5cf6", accent2: "#e879f9", background: "#120d1f", text: "#f7f3ff" },
  { id: "crimson", name: "Carmesí", accent: "#e5243b", accent2: "#ff6a3d", background: "#16080a", text: "#fff3f2" },
  { id: "gold", name: "Oro", accent: "#d4a64a", accent2: "#f6deaa", background: "#14110b", text: "#fffaf0" },
  { id: "teal", name: "Turquesa", accent: "#14b8a6", accent2: "#5eead4", background: "#061918", text: "#effffc" },
  { id: "paper", name: "Papel", accent: "#e5243b", accent2: "#111111", background: "#f4f2ee", text: "#111214" }
]);

export const DEFAULT_STYLE = Object.freeze({
  skin: "glass",
  font: "inter",
  animation: "reveal",
  align: "left",
  scale: 1,
  x: 0,
  y: 0,
  primaryFont: 1,
  secondaryFont: 1,
  primaryWeight: 700,
  uppercaseLabels: true,
  accent: "#ff4d3d",
  accent2: "#ff9a3d",
  background: "#0e1015",
  text: "#f5f6f8",
  opacity: 0.82,
  radius: 10,
  shadow: 0.7,
  grain: 0.35,
  shine: true,
  speed: 1,
  autoOut: 0,
  tickerSpeed: 90,
  brand: true,
  logoEnabled: false,
  logoSource: "default",
  logoPosition: "top-right",
  logoScale: 1,
  teamLogoScale: 1,
  logoAsset: "",
  logoRevision: 0
});

// Límites compartidos por el panel (sliders) y la validación del servidor.
export const STYLE_RANGES = Object.freeze({
  scale: { min: 0.5, max: 1.6, step: 0.01 },
  x: { min: -1000, max: 1000, step: 1 },
  y: { min: -900, max: 200, step: 1 },
  primaryFont: { min: 0.6, max: 1.6, step: 0.01 },
  secondaryFont: { min: 0.6, max: 1.6, step: 0.01 },
  primaryWeight: { min: 300, max: 900, step: 50 },
  opacity: { min: 0.3, max: 1, step: 0.01 },
  radius: { min: 0, max: 32, step: 1 },
  shadow: { min: 0, max: 1, step: 0.01 },
  grain: { min: 0, max: 1, step: 0.01 },
  speed: { min: 0.5, max: 2, step: 0.05 },
  autoOut: { min: 0, max: 60, step: 1 },
  tickerSpeed: { min: 30, max: 240, step: 5 },
  teamLogoScale: { min: 0.6, max: 2, step: 0.05 },
  logoScale: { min: 0.4, max: 2.5, step: 0.05 }
});

// Plantillas que se anclan abajo y aceptan alineación y posiciones rápidas.
export const MOVABLE_TEMPLATES = Object.freeze(["lower-third", "single-line", "headline", "location", "quote", "upcoming", "card", "substitution", "score-event", "player", "game-event"]);

// Posiciones rápidas (cuadrícula 3×3) para las plantillas ancladas abajo.
export const QUICK_POSITIONS = Object.freeze([
  { id: "tl", label: "Arriba izquierda", align: "left", y: -720 },
  { id: "tc", label: "Arriba centro", align: "center", y: -720 },
  { id: "tr", label: "Arriba derecha", align: "right", y: -720 },
  { id: "ml", label: "Centro izquierda", align: "left", y: -360 },
  { id: "mc", label: "Centro", align: "center", y: -360 },
  { id: "mr", label: "Centro derecha", align: "right", y: -360 },
  { id: "bl", label: "Abajo izquierda", align: "left", y: 0 },
  { id: "bc", label: "Abajo centro", align: "center", y: 0 },
  { id: "br", label: "Abajo derecha", align: "right", y: 0 }
]);

// Carpetas de "Guardados": agrupan los textos por tipo de gráfico.
export const LIBRARY_GROUPS = Object.freeze([
  { id: "names", name: "Nombres", templates: ["lower-third"] },
  { id: "headlines", name: "Titulares", templates: ["headline", "breaking"] },
  { id: "places", name: "Lugares y textos", templates: ["location", "single-line"] },
  { id: "quotes", name: "Citas", templates: ["quote"] },
  { id: "players", name: "Jugadores", templates: ["player", "card", "substitution", "score-event"] },
  { id: "matches", name: "Partidos", templates: ["game-event", "matchup", "lineup", "match-stats", "period-scores", "soccer-scorebug", "basket-scorebug", "volley-scorebug"] },
  { id: "other", name: "Otros", templates: ["upcoming", "fullscreen", "ticker", "bug"] }
]);

// Orden de columnas al pegar una lista ("Nombre | Cargo" por línea).
export const IMPORT_FIELDS = Object.freeze({
  "lower-third": ["name", "role", "kicker"],
  "single-line": ["label", "context"],
  headline: ["headline", "kicker"],
  breaking: ["headline", "label"],
  location: ["location", "reporter", "status"],
  quote: ["quote", "source"],
  upcoming: ["title", "time", "label"],
  fullscreen: ["title", "summary", "source", "kicker"],
  ticker: ["items", "label"],
  bug: ["station", "status"],
  "soccer-scorebug": ["homeName", "awayName", "competition"],
  "basket-scorebug": ["homeName", "awayName", "competition"],
  "volley-scorebug": ["homeName", "awayName", "competition"],
  card: ["player", "number", "team", "minute"],
  substitution: ["inName", "inNumber", "outName", "outNumber", "team", "minute"],
  "score-event": ["player", "number", "team", "minute", "score"],
  player: ["name", "number", "position", "team", "stats"],
  "game-event": ["label", "detail", "team"],
  matchup: ["homeName", "awayName", "competition", "status", "venue"],
  lineup: ["team", "formation", "coach"],
  "match-stats": ["title", "homeName", "awayName"],
  "period-scores": ["title", "homeName", "awayName"]
});

// Solo el texto: dos guardados con el mismo texto son el mismo guardado.
export function textFields(templateId, fields = {}) {
  const template = TEMPLATES[templateId] ?? TEMPLATES["lower-third"];
  return Object.fromEntries(template.fields.filter(field => (field.id === "context" || !["checkbox", "color", "select", "timer", "image"].includes(field.type)) && !field.live).map(field => [field.id, String(fields[field.id] ?? "")]));
}

// Duraciones de animación en ms. El servidor las usa para marcar el estado
// "al aire"/"fuera" cuando la animación del renderer termina.
export function motionTiming(style = DEFAULT_STYLE) {
  const speed = Number(style.speed) || 1;
  return { enter: Math.round(1150 / speed), exit: Math.round(650 / speed), update: Math.round(600 / speed) };
}

export function defaultsFor(templateId) {
  return Object.fromEntries(TEMPLATES[templateId].fields.map(field => [field.id, field.default ?? ""]));
}

export function cleanStyle(incomingStyle = {}) {
  const pick = (list, value, fallback) => list.some(item => (item.id ?? item) === value) ? value : fallback;
  const style = {
    skin: pick(DESIGN_PRESETS, incomingStyle.skin, DEFAULT_STYLE.skin),
    font: pick(FONT_PRESETS, incomingStyle.font, DEFAULT_STYLE.font),
    animation: pick(ANIMATION_PRESETS, incomingStyle.animation, DEFAULT_STYLE.animation),
    align: pick(ALIGN_OPTIONS, incomingStyle.align, DEFAULT_STYLE.align),
    uppercaseLabels: incomingStyle.uppercaseLabels === undefined ? DEFAULT_STYLE.uppercaseLabels : Boolean(incomingStyle.uppercaseLabels),
    shine: incomingStyle.shine === undefined ? DEFAULT_STYLE.shine : Boolean(incomingStyle.shine),
    brand: incomingStyle.brand === undefined ? DEFAULT_STYLE.brand : Boolean(incomingStyle.brand),
    accent: cleanColor(incomingStyle.accent, DEFAULT_STYLE.accent),
    accent2: cleanColor(incomingStyle.accent2, DEFAULT_STYLE.accent2),
    background: cleanColor(incomingStyle.background, DEFAULT_STYLE.background),
    text: cleanColor(incomingStyle.text, DEFAULT_STYLE.text),
    logoEnabled: Boolean(incomingStyle.logoEnabled),
    logoSource: incomingStyle.logoSource === "custom" ? "custom" : DEFAULT_STYLE.logoSource,
    logoPosition: ["top-left", "top-right", "bottom-left", "bottom-right"].includes(incomingStyle.logoPosition) ? incomingStyle.logoPosition : DEFAULT_STYLE.logoPosition,
    logoAsset: ASSET_PATTERN.test(String(incomingStyle.logoAsset ?? "")) ? incomingStyle.logoAsset : "",
    logoRevision: clampNumber(incomingStyle.logoRevision, 0, Number.MAX_SAFE_INTEGER, DEFAULT_STYLE.logoRevision)
  };
  for (const [key, range] of Object.entries(STYLE_RANGES)) style[key] = clampNumber(incomingStyle[key], range.min, range.max, DEFAULT_STYLE[key]);
  return style;
}

export function cleanGraphic(graphic = {}) {
  const templateId = TEMPLATES[graphic.templateId] ? graphic.templateId : "lower-third";
  const template = TEMPLATES[templateId];
  const fields = {};
  for (const field of template.fields) {
    if (field.type === "checkbox") {
      fields[field.id] = Boolean(graphic.fields?.[field.id] ?? field.default);
      continue;
    }
    if (field.type === "color") { fields[field.id] = cleanColor(graphic.fields?.[field.id], field.default); continue; }
    if (field.type === "image") { const value = String(graphic.fields?.[field.id] ?? ""); fields[field.id] = assetUrl(value) ? value : ""; continue; }
    if (field.type === "select") {
      const value = graphic.fields?.[field.id];
      fields[field.id] = field.options.some(option => option.value === value) ? value : field.default;
      continue;
    }
    fields[field.id] = String(graphic.fields?.[field.id] ?? field.default ?? "")
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
      .replace(field.multiline ? /[ \t]+/g : /\s+/g, " ")
      .trim()
      .slice(0, field.max);
  }
  const style = cleanStyle(graphic.style ?? {});
  return { templateId, fields: templateId === "volley-scorebug" ? normalizeVolley(fields) : fields, style };
}

function clampNumber(value, min, max, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function cleanColor(value, fallback) {
  const color = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
}

// Elige texto oscuro o claro sobre un color según su luminancia relativa.
export function contrastText(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.42 ? "#0b0c0e" : "#ffffff";
}

export function validateGraphic(graphic) {
  const clean = cleanGraphic(graphic);
  const errors = {};
  for (const field of TEMPLATES[clean.templateId].fields) {
    if (field.required && !clean.fields[field.id]) errors[field.id] = `${field.label} es obligatorio.`;
  }
  return { clean, errors };
}

export function graphicTitle(graphic) {
  if (TEMPLATES[graphic.templateId]?.scorebug && graphic.fields.homeName) return `${graphic.fields.homeName} vs ${graphic.fields.awayName}`;
  if (graphic.templateId === "game-event") return `${graphic.fields.label}${graphic.fields.team ? ` · ${graphic.fields.team}` : ""}`;
  if (graphic.templateId === "matchup") return `${graphic.fields.homeName} vs ${graphic.fields.awayName}`;
  if (graphic.templateId === "substitution") return `${graphic.fields.inName} ⇄ ${graphic.fields.outName}`;
  if (graphic.templateId === "score-event" || graphic.templateId === "card") return `${graphic.fields.player}${graphic.fields.minute ? ` · ${graphic.fields.minute}` : ""}`;
  const priority = ["headline", "title", "name", "location", "quote", "detail", "label", "station", "items", "team", "kicker"];
  return priority.map(key => graphic.fields[key]).find(value => typeof value === "string" && value) || TEMPLATES[graphic.templateId].name;
}
