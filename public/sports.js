// Plantillas deportivas y lógica de relojes compartida por panel, salida y servidor.
// Basado en lo que incluyen los paquetes de TV profesionales: marcador
// persistente (score bug), alineaciones con formación, tarjetas, cambios,
// identificación de jugador con estadísticas, eventos (VAR, tiempo muerto,
// challenge) y gráficos de estadísticas y parciales.

const HOME = "#e10600", AWAY = "#1d4ed8";
const team = (prefix, label, abbr, color, max = 4) => [
  { id: `${prefix}Name`, label: `${label}`, max, required: true, default: abbr, width: "short" },
  { id: `${prefix}Color`, label: `Color ${label.toLowerCase()}`, type: "color", default: color },
  { id: `${prefix}Logo`, label: `Escudo ${label.toLowerCase()}`, type: "image", default: "" }
];
const logo = (id, label) => ({ id, label, type: "image", default: "" });
const SIDE_OPTIONS = [{ value: "home", label: "Local" }, { value: "away", label: "Visitante" }];

export const SPORT_TEMPLATES = {
  "soccer-scorebug": {
    name: "Marcador de fútbol", shortName: "Marcador", category: "soccer", layer: "primary", icon: "trophy", remember: false, scorebug: "soccer",
    description: "Equipos, goles, reloj, tiempo añadido y tarjetas rojas. Siempre en pantalla.",
    fields: [
      ...team("home", "Local", "DNO", HOME), ...team("away", "Visitante", "ATS", AWAY),
      { id: "homeScore", label: "Goles local", max: 2, default: "0", live: true },
      { id: "awayScore", label: "Goles visitante", max: 2, default: "0", live: true },
      { id: "clock", label: "Reloj", type: "timer", format: "mmss", direction: "up", default: "00:00" },
      { id: "period", label: "Periodo", max: 6, default: "1T", live: true },
      { id: "addedTime", label: "Tiempo añadido", max: 3, default: "", live: true },
      { id: "homeRed", label: "Rojas local", max: 1, default: "0", live: true },
      { id: "awayRed", label: "Rojas visitante", max: 1, default: "0", live: true },
      { id: "competition", label: "Competición", max: 30, default: "LIGA PRO", width: "short" },
      logo("competitionLogo", "Logo de la competición")
    ]
  },
  "basket-scorebug": {
    name: "Marcador de básquet", shortName: "Marcador", category: "basket", layer: "primary", icon: "trophy", remember: false, scorebug: "basket",
    description: "Cuarto, reloj, posesión de 24 s, faltas de equipo, bonus y tiempos muertos.",
    fields: [
      ...team("home", "Local", "NOR", "#f97316"), ...team("away", "Visitante", "SUR", "#7c3aed"),
      { id: "homeScore", label: "Puntos local", max: 3, default: "0", live: true },
      { id: "awayScore", label: "Puntos visitante", max: 3, default: "0", live: true },
      { id: "clock", label: "Reloj de juego", type: "timer", format: "basket", direction: "down", default: "10:00" },
      { id: "shot", label: "Posesión", type: "timer", format: "seconds", direction: "down", default: "24" },
      { id: "period", label: "Cuarto", max: 4, default: "1º", live: true },
      { id: "homeFouls", label: "Faltas local", max: 2, default: "0", live: true },
      { id: "awayFouls", label: "Faltas visitante", max: 2, default: "0", live: true },
      { id: "homeTimeouts", label: "Tiempos muertos local", max: 1, default: "2", live: true },
      { id: "awayTimeouts", label: "Tiempos muertos visitante", max: 1, default: "2", live: true },
      { id: "bonusAt", label: "Bonus desde la falta", max: 2, default: "5", width: "short" },
      { id: "competition", label: "Competición", max: 30, default: "LIGA NACIONAL", width: "short" },
      logo("competitionLogo", "Logo de la competición")
    ]
  },
  "volley-scorebug": {
    name: "Marcador de vóley", shortName: "Marcador", category: "volley", layer: "primary", icon: "trophy", remember: false, scorebug: "volley",
    description: "Sets ganados, puntos del set, saque y parciales de sets anteriores.",
    fields: [
      ...team("home", "Local", "ECUADOR", "#facc15", 12), ...team("away", "Visitante", "PERÚ", "#dc2626", 12),
      { id: "homeSets", label: "Sets ganados local", max: 1, default: "0", live: true },
      { id: "awaySets", label: "Sets ganados visitante", max: 1, default: "0", live: true },
      { id: "homePoints", label: "Puntos local", max: 2, default: "0", live: true },
      { id: "awayPoints", label: "Puntos visitante", max: 2, default: "0", live: true },
      { id: "serve", label: "Saca", type: "select", options: SIDE_OPTIONS, default: "home", live: true },
      { id: "setNumber", label: "Set", max: 1, default: "1", live: true },
      { id: "history", label: "Sets cerrados (ej. 25-21 23-25)", max: 150, default: "", live: true },
      { id: "scoring", label: "Sistema de puntuación", type: "select", options: [{ value: "rally", label: "Cada jugada suma punto (vóley)" }, { value: "sideout", label: "Punto solo con saque (ecuavóley)" }], default: "rally" },
      { id: "bestOf", label: "Formato del partido", type: "select", options: [{ value: "3", label: "Al mejor de 3 sets" }, { value: "5", label: "Al mejor de 5 sets" }], default: "5" },
      { id: "pointsToWin", label: "Puntos por set", max: 2, default: "25" },
      { id: "decidingPoints", label: "Puntos del set decisivo", max: 2, default: "15" },
      { id: "winBy", label: "Ventaja para ganar", max: 1, default: "2" },
      { id: "competition", label: "Competición", max: 30, default: "LIGA DE VÓLEY", width: "short" },
      logo("competitionLogo", "Logo de la competición")
    ]
  },
  card: {
    name: "Tarjeta", shortName: "Tarjeta", category: "soccer", layer: "primary", icon: "rectangle-vertical",
    description: "Amarilla, roja o doble amarilla con jugador, dorsal y minuto.",
    fields: [
      { id: "cardType", label: "Tarjeta", type: "select", options: [{ value: "yellow", label: "Amarilla" }, { value: "red", label: "Roja" }, { value: "second", label: "Doble amarilla" }], default: "yellow" },
      { id: "player", label: "Jugador", max: 32, required: true, default: "Mateo Ruiz" },
      { id: "number", label: "Dorsal", max: 3, default: "8", width: "short" },
      { id: "minute", label: "Minuto", max: 6, default: "34'", width: "short" },
      { id: "team", label: "Equipo", max: 28, default: "Deportivo Norte" },
      { id: "teamColor", label: "Color del equipo", type: "color", default: HOME },
      logo("teamLogo", "Escudo del equipo")
    ]
  },
  substitution: {
    name: "Cambio", shortName: "Cambio", category: "sports", layer: "primary", icon: "arrow-left-right",
    description: "Quién entra y quién sale, con dorsales y minuto.",
    fields: [
      { id: "inName", label: "Entra", max: 30, required: true, default: "Daniel Ortiz" },
      { id: "inNumber", label: "Dorsal (entra)", max: 3, default: "19", width: "short" },
      { id: "outName", label: "Sale", max: 30, required: true, default: "Luis Vega" },
      { id: "outNumber", label: "Dorsal (sale)", max: 3, default: "11", width: "short" },
      { id: "team", label: "Equipo", max: 28, default: "Deportivo Norte" },
      { id: "minute", label: "Minuto", max: 6, default: "63'", width: "short" },
      { id: "teamColor", label: "Color del equipo", type: "color", default: HOME },
      logo("teamLogo", "Escudo del equipo")
    ]
  },
  "score-event": {
    name: "Gol / Anotación", shortName: "Anotación", category: "sports", layer: "primary", icon: "party-popper",
    description: "Celebración: ¡GOL!, ¡TRIPLE!, ¡ACE!… con autor y marcador.",
    fields: [
      { id: "label", label: "Texto grande", max: 12, required: true, default: "¡GOL!", width: "short" },
      { id: "minute", label: "Minuto", max: 6, default: "52'", width: "short" },
      { id: "player", label: "Jugador", max: 32, required: true, default: "Andrés Mena" },
      { id: "number", label: "Dorsal", max: 3, default: "9", width: "short" },
      { id: "team", label: "Equipo", max: 28, default: "Deportivo Norte" },
      { id: "score", label: "Marcador", max: 50, default: "DNO 1 - 0 ATS" },
      { id: "teamColor", label: "Color del equipo", type: "color", default: HOME },
      logo("teamLogo", "Escudo del equipo")
    ]
  },
  player: {
    name: "Jugador", shortName: "Jugador", category: "sports", layer: "primary", icon: "shirt",
    description: "Dorsal grande, nombre, posición, equipo y estadísticas.",
    fields: [
      { id: "number", label: "Dorsal", max: 3, default: "10", width: "short" },
      { id: "position", label: "Posición", max: 20, default: "MEDIOCAMPISTA", width: "short" },
      { id: "name", label: "Nombre", max: 32, required: true, default: "Sebastián Paredes" },
      { id: "team", label: "Equipo", max: 28, default: "Deportivo Norte" },
      { id: "stats", label: "Estadísticas", max: 60, default: "2 goles · 3 asistencias · 8 partidos" },
      { id: "teamColor", label: "Color del equipo", type: "color", default: HOME },
      logo("teamLogo", "Escudo del equipo")
    ]
  },
  "game-event": {
    name: "Aviso del partido", shortName: "Aviso", category: "sports", layer: "primary", icon: "monitor-play",
    description: "VAR, tiempo muerto, challenge, lesión o cualquier aviso breve.",
    fields: [
      { id: "context", label: "Datos del aviso", type: "select", options: [{ value: "manual", label: "Texto libre" }, { value: "set-point", label: "Punto de set desde el marcador" }, { value: "match-point", label: "Punto de partido desde el marcador" }, { value: "set-result", label: "Resultado del último set cerrado" }], default: "manual" },
      { id: "label", label: "Aviso", max: 22, required: true, default: "REVISIÓN VAR", width: "short" },
      { id: "detail", label: "Detalle", max: 60, default: "Posible penal" },
      { id: "team", label: "Equipo (opcional)", max: 28, default: "" },
      { id: "teamColor", label: "Color del equipo", type: "color", default: HOME },
      logo("teamLogo", "Escudo del equipo")
    ]
  },
  matchup: {
    name: "Previa / Resultado", shortName: "Partido", category: "sports", layer: "primary", icon: "swords",
    description: "Local contra visitante: VS antes del partido o marcador final.",
    fields: [
      { id: "competition", label: "Competición", max: 30, default: "LIGA PRO · FECHA 12" },
      { id: "homeName", label: "Local", max: 24, required: true, default: "Deportivo Norte" },
      { id: "homeScore", label: "Marcador local", max: 3, default: "", width: "short" },
      { id: "awayName", label: "Visitante", max: 24, required: true, default: "Atlético Sur" },
      { id: "awayScore", label: "Marcador visitante", max: 3, default: "", width: "short" },
      { id: "status", label: "Estado u hora", max: 24, default: "HOY · 19:00" },
      { id: "venue", label: "Estadio", max: 40, default: "Estadio Olímpico" },
      logo("competitionLogo", "Logo de la competición"),
      { id: "homeColor", label: "Color local", type: "color", default: HOME },
      { id: "awayColor", label: "Color visitante", type: "color", default: AWAY },
      logo("homeLogo", "Escudo local"), logo("awayLogo", "Escudo visitante")
    ]
  },
  lineup: {
    name: "Alineación", shortName: "Alineación", category: "sports", layer: "primary", icon: "users",
    description: "Titulares en cancha según la formación, suplentes y entrenador.",
    fields: [
      { id: "team", label: "Equipo", max: 28, required: true, default: "Deportivo Norte" },
      { id: "formation", label: "Formación (fútbol, ej. 4-3-3)", max: 9, default: "4-3-3", width: "short" },
      { id: "players", label: "Titulares (uno por línea: dorsal nombre)", max: 400, required: true, multiline: true, default: "1 Carlos Pérez\n2 Juan Mora\n4 Diego Lara\n5 Pablo Ríos\n3 Iván Cruz\n6 Kevin Soto\n8 Mateo Ruiz\n10 Sebastián Paredes\n7 Bryan León\n9 Andrés Mena\n11 Luis Vega" },
      { id: "bench", label: "Suplentes (opcional)", max: 300, multiline: true, default: "12 Roberto Gil\n19 Daniel Ortiz\n14 Jorge Paz\n16 Alex Tapia" },
      { id: "coach", label: "Entrenador", max: 32, default: "Martín Salas" },
      { id: "teamColor", label: "Color del equipo", type: "color", default: HOME },
      logo("teamLogo", "Escudo del equipo")
    ]
  },
  "match-stats": {
    name: "Estadísticas", shortName: "Estadísticas", category: "sports", layer: "primary", icon: "chart-no-axes-column",
    description: "Comparación con barras: posesión, tiros, rebotes, ataques…",
    fields: [
      { id: "title", label: "Título", max: 28, default: "ESTADÍSTICAS · PRIMER TIEMPO" },
      { id: "homeName", label: "Local", max: 16, required: true, default: "DNO", width: "short" },
      { id: "awayName", label: "Visitante", max: 16, required: true, default: "ATS", width: "short" },
      { id: "rows", label: "Datos (uno por línea: dato | local | visitante)", max: 500, required: true, multiline: true, default: "Posesión | 58% | 42%\nTiros | 9 | 5\nTiros al arco | 4 | 2\nCórners | 6 | 3\nFaltas | 7 | 11\nTarjetas amarillas | 1 | 3" },
      { id: "homeColor", label: "Color local", type: "color", default: HOME },
      { id: "awayColor", label: "Color visitante", type: "color", default: AWAY },
      logo("homeLogo", "Escudo local"), logo("awayLogo", "Escudo visitante")
    ]
  },
  "period-scores": {
    name: "Parciales", shortName: "Parciales", category: "sports", layer: "primary", icon: "table",
    description: "Puntos por cuarto o por set y total.",
    fields: [
      { id: "title", label: "Título", max: 28, default: "RESULTADO POR CUARTOS" },
      { id: "homeName", label: "Local", max: 20, required: true, default: "Norte", width: "short" },
      { id: "awayName", label: "Visitante", max: 20, required: true, default: "Sur", width: "short" },
      { id: "periods", label: "Parciales (uno por línea: periodo | local | visitante)", max: 300, required: true, multiline: true, default: "1º | 22 | 18\n2º | 19 | 24\n3º | 25 | 20\n4º | 21 | 17" },
      { id: "total", label: "Total", type: "select", options: [{ value: "sum", label: "Suma de puntos (básquet)" }, { value: "wins", label: "Periodos ganados (sets de vóley)" }], default: "sum" },
      { id: "homeColor", label: "Color local", type: "color", default: HOME },
      { id: "awayColor", label: "Color visitante", type: "color", default: AWAY },
      logo("homeLogo", "Escudo local"), logo("awayLogo", "Escudo visitante")
    ]
  }
};

export const SPORT_CATEGORIES = [
  { id: "general", name: "Noticias y general" },
  { id: "sports", name: "Deportes · cualquier disciplina" },
  { id: "soccer", name: "Fútbol" },
  { id: "basket", name: "Básquet" },
  { id: "volley", name: "Vóley" }
];

/* ── Relojes ─────────────────────────────────────────────────────────── */
// "45:00" → 2 700 000 ms; "24" → 24 000 ms.
export function parseClock(text) {
  const parts = String(text ?? "").trim().split(":").map(part => Number(part.replace(",", ".")));
  if (!parts.length || parts.some(part => !Number.isFinite(part) || part < 0)) return 0;
  const seconds = parts.length >= 2 ? parts.at(-2) * 60 + parts.at(-1) : parts[0];
  return Math.round(Math.min(seconds, 99 * 60 + 59) * 1000);
}

export function timerValue(timer, now = Date.now(), direction = "up") {
  if (!timer) return 0;
  const elapsed = timer.running ? Math.max(0, now - timer.startedAt) : 0;
  return direction === "down" ? Math.max(0, timer.baseMs - elapsed) : timer.baseMs + elapsed;
}

// mmss: 67:32 · basket: 07:45 y, en el último minuto, 45.3 · seconds: 24
export function formatClock(ms, format = "mmss", direction = "up") {
  if (format === "seconds") return String(Math.ceil(ms / 1000));
  if (format === "basket" && ms < 60_000) return (Math.floor(ms / 100) / 10).toFixed(1);
  const total = direction === "down" ? Math.ceil(ms / 1000) : Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function timerFields(template) {
  return (template?.fields ?? []).filter(field => field.type === "timer");
}

// Reparte una lista "dorsal nombre" en {number, name}.
export function parsePlayers(text) {
  return String(text ?? "").split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const match = line.match(/^#?(\d{1,3})[\s.\-–)]+(.+)$/);
    return match ? { number: match[1], name: match[2].trim() } : { number: "", name: line };
  });
}

// "dato | local | visitante" por línea.
export function parseRows(text) {
  return String(text ?? "").split(/\r?\n/).map(line => line.split("|").map(part => part.trim())).filter(parts => parts[0]);
}

// Imágenes subidas (escudos, logos): nombre de archivo seguro en data/assets.
export const ASSET_PATTERN = /^[a-f0-9]{20}\.(png|jpg|webp)$/;
export const BUILTIN_LOGOS = ["flag-ecuador", "flag-peru"];
export const assetUrl = id => BUILTIN_LOGOS.includes(id) ? `/teams/${id}.svg` : (ASSET_PATTERN.test(String(id ?? "")) ? `/assets/${id}` : "");

export function volleyMatch(fields) {
  const integer = (v, fallback = 0) => Math.max(0, Math.floor(Number(v) || fallback));
  const bestOf = fields.bestOf === "3" ? 3 : 5;
  const needed = Math.ceil(bestOf / 2);
  const points = Math.min(99, Math.max(1, integer(fields.pointsToWin, 25)));
  const deciding = Math.min(99, Math.max(1, integer(fields.decidingPoints, 15)));
  const margin = Math.min(9, Math.max(1, integer(fields.winBy, 2)));
  const wins = [0, 0], history = [];
  for (const token of String(fields.history ?? "").trim().split(/[\s,;]+/)) {
    if (!/^\d{1,2}-\d{1,2}$/.test(token) || wins.some(n => n >= needed)) continue;
    const scores = token.split("-").map(Number);
    const target = history.length === bestOf - 1 ? deciding : points;
    if (Math.max(...scores) < target || Math.abs(scores[0] - scores[1]) < margin) continue;
    wins[scores[0] > scores[1] ? 0 : 1]++;
    history.push(scores);
  }
  const finished = wins.some(n => n >= needed);
  const setNumber = Math.min(bestOf, history.length + (finished ? 0 : 1));
  const target = setNumber === bestOf ? deciding : points;
  const home = Math.min(99, integer(fields.homePoints)), away = Math.min(99, integer(fields.awayPoints));
  return { wins, history, finished, setNumber, target, margin, home, away,
    canClose: !finished && Math.max(home, away) >= target && Math.abs(home - away) >= margin };
}

export function normalizeVolley(fields) {
  const m = volleyMatch(fields);
  return { ...fields, homeSets: String(m.wins[0]), awaySets: String(m.wins[1]),
    setNumber: String(m.setNumber), history: m.history.map(s => s.join("-")).join(" "),
    homePoints: String(m.home), awayPoints: String(m.away), serve: fields.serve === "away" ? "away" : "home" };
}

// Ganar una jugada y corregir un punto son operaciones distintas.
export function volleyRally(fields, side) {
  const m = volleyMatch(fields);
  if (m.finished || !["home", "away"].includes(side)) return normalizeVolley(fields);
  const result = { ...fields, serve: side };
  if (fields.scoring !== "sideout" || fields.serve === side) result[`${side}Points`] = String(Math.min(99, Number(fields[`${side}Points`]) + 1));
  return normalizeVolley(result);
}

export function volleyNotice(fields, context) {
  const m = volleyMatch(fields);
  if (context === "set-result") {
    const last = m.history.at(-1);
    if (!last) return null;
    const side = last[0] > last[1] ? "home" : "away";
    return { side, detail: `${fields[`${side}Name`]} · set ${m.history.length}: ${last[0]}-${last[1]}` };
  }
  if (m.finished || m.canClose) return null;
  const needed = Math.ceil((fields.bestOf === "3" ? 3 : 5) / 2);
  const sides = ["home", "away"].filter((side, i) => {
    if (context === "match-point" && m.wins[i] !== needed - 1) return false;
    return volleyMatch(volleyRally(fields, side)).canClose;
  });
  if (!sides.length) return null;
  return { side: sides.length === 1 ? sides[0] : null,
    detail: `${sides.map(side => fields[`${side}Name`]).join(" / ")} · set ${m.setNumber} · ${m.home}-${m.away}` };
}
