import { volleyNotice, volleyMatch, parseClock, timerFields, timerValue } from "../public/sports.js";
import { PROFILE_PRESETS } from "../public/presets.js";
import { IMPORT_FIELDS, MOVABLE_TEMPLATES, TEMPLATES, cleanGraphic, cleanStyle, defaultsFor, textFields, validateGraphic } from "../public/templates.js";

// Un estado simple: una lista de gráficos. Cada uno se muestra u oculta por
// separado, así que pueden estar varios en pantalla al mismo tiempo.
export const MAX_ITEMS = 30;
export const MAX_LIBRARY = 1000;
export const MAX_PROFILES = 30;

// Claves de colocación: no forman parte de un "look" reutilizable.
const PLACEMENT_KEYS = ["x", "y", "scale", "align"];

function lookOf(style) {
  const look = { ...cleanStyle(style) };
  for (const key of PLACEMENT_KEYS) delete look[key];
  return look;
}

function cleanPresets(presets) {
  if (!Array.isArray(presets)) return [];
  return presets.slice(0, 40).map(preset => ({
    id: String(preset.id).slice(0, 40),
    name: String(preset.name ?? "Estilo").replace(/\s+/g, " ").trim().slice(0, 32) || "Estilo",
    style: lookOf(preset.style)
  }));
}

function newId(revision) {
  return `${Date.now().toString(36)}-${revision}`;
}

// Convierte el formato anterior (capas fijas + cola) en la lista de gráficos.
function migrate(saved) {
  const graphics = [];
  for (const layer of Object.values(saved.layers ?? {})) if (layer?.graphic) graphics.push(layer.graphic);
  for (const item of saved.queue ?? []) if (item?.graphic) graphics.push(item.graphic);
  if (!graphics.length) graphics.push({ templateId: "lower-third", fields: defaultsFor("lower-third") });
  return graphics.map((graphic, index) => ({ id: `m${index}`, graphic }));
}

// Relojes de un gráfico (marcadores): base en ms, si corre y desde cuándo.
// Al reiniciar quedan detenidos en el último valor guardado.
function cleanTimers(timers, graphic, now = Date.now()) {
  return Object.fromEntries(timerFields(TEMPLATES[graphic.templateId]).map(field => {
    const timer = timers?.[field.id];
    const baseMs = timer ? timerValue({ ...timer, baseMs: Number(timer.baseMs) || 0, startedAt: Number(timer.startedAt) || now }, now, field.direction) : parseClock(graphic.fields[field.id] ?? field.default);
    return [field.id, { running: false, baseMs: Math.max(0, Math.round(baseMs)), startedAt: 0 }];
  }));
}

function cleanItems(items) {
  // Al reiniciar o cambiar de perfil nada vuelve a la pantalla por accidente.
  return (Array.isArray(items) ? items : []).slice(0, MAX_ITEMS).map(item => {
    const raw = item.graphic;
    const fields = { ...raw?.fields };
    if (raw?.templateId === "volley-scorebug" && fields.bestOf === undefined) {
      for (const side of ["home", "away"]) {
        const name = String(fields[`${side}Name`] ?? "").toLowerCase();
        if (!fields[`${side}Logo`] && ["ecuador", "perú", "peru"].includes(name)) fields[`${side}Logo`] = name === "ecuador" ? "flag-ecuador" : "flag-peru";
      }
    }
    const graphic = cleanGraphic({ ...raw, fields });
    return { id: String(item.id), graphic, timers: cleanTimers(item.timers, graphic), onAir: false, phase: "idle", revision: Number(item.revision) || 0 };
  });
}

function cleanEntry(entry) {
  const templateId = TEMPLATES[entry?.templateId] ? entry.templateId : "lower-third";
  const fields = textFields(templateId, cleanGraphic({ templateId, fields: entry?.fields }).fields);
  return { id: String(entry?.id ?? ""), templateId, fields, savedAt: String(entry?.savedAt ?? new Date().toISOString()) };
}
const entryKey = entry => `${entry.templateId}:${JSON.stringify(entry.fields)}`;

function cleanLibrary(library) {
  const seen = new Set();
  return (Array.isArray(library) ? library : []).map(cleanEntry).filter(entry => {
    const key = entryKey(entry);
    if (seen.has(key) || !Object.values(entry.fields).some(Boolean)) return false;
    seen.add(key);
    return true;
  }).slice(-MAX_LIBRARY);
}

// Agrega (o sube al principio) un texto a Guardados sin duplicarlo.
function remember(library, templateId, fields, revision) {
  const entry = cleanEntry({ id: newId(revision), templateId, fields });
  if (!Object.values(entry.fields).some(Boolean)) return library;
  const key = entryKey(entry);
  const existing = library.find(item => entryKey(item) === key);
  const rest = library.filter(item => entryKey(item) !== key);
  return [...rest, existing ? { ...existing, savedAt: entry.savedAt } : entry].slice(-MAX_LIBRARY);
}

const cleanName = (value, fallback) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 40) || fallback;

export function initialState(saved = {}) {
  const now = new Date().toISOString();
  let profiles, activeProfile, items, library, profileData = {};
  if (Array.isArray(saved.profiles) && saved.profiles.length) {
    profiles = saved.profiles.slice(0, MAX_PROFILES).map((profile, index) => ({ id: String(profile.id), name: cleanName(profile.name, `Perfil ${index + 1}`) }));
    activeProfile = profiles.some(profile => profile.id === saved.activeProfile) ? String(saved.activeProfile) : profiles[0].id;
    items = cleanItems(saved.items);
    library = cleanLibrary(saved.library);
    for (const profile of profiles) {
      if (profile.id === activeProfile) continue;
      const data = saved.profileData?.[profile.id] ?? {};
      profileData[profile.id] = { items: cleanItems(data.items), library: cleanLibrary(data.library) };
    }
  } else {
    // Formatos anteriores: todo pasa a un perfil "Principal" y los textos que
    // ya existían quedan en Guardados.
    profiles = [{ id: "p1", name: "Principal" }];
    activeProfile = "p1";
    items = cleanItems(Array.isArray(saved.items) ? saved.items : migrate(saved));
    library = cleanLibrary(items.filter(item => item.graphic.templateId !== "bug").map((item, index) => ({ id: `l${index}`, templateId: item.graphic.templateId, fields: item.graphic.fields })));
  }
  return { profiles, activeProfile, items: syncVolley(items), library, profileData, presets: cleanPresets(saved.presets), revision: Number(saved.revision) || 0, updatedAt: now };
}

// Lo que ven los navegadores: sin los datos internos de los demás perfiles,
// pero con un resumen de cada uno.
export function publicState(state) {
  const { profileData, ...rest } = state;
  return {
    ...rest,
    profiles: state.profiles.map(profile => {
      const data = profile.id === state.activeProfile ? state : profileData[profile.id] ?? { items: [], library: [] };
      return { ...profile, itemCount: data.items.length, libraryCount: data.library.length };
    })
  };
}

// Lo que se guarda en disco.
export function persistedState(state) {
  // Los relojes se guardan con su valor actual, para retomarlos tras un reinicio.
  const items = state.items.map(item => ({ ...item, timers: cleanTimers(item.timers, item.graphic) }));
  return { profiles: state.profiles, activeProfile: state.activeProfile, items, library: state.library, profileData: state.profileData, presets: state.presets, revision: state.revision };
}

// Cambia el perfil activo guardando el actual tal como estaba (todo oculto).
function switchProfile(state, targetId, base) {
  const profileData = { ...state.profileData, [state.activeProfile]: { items: cleanItems(state.items), library: state.library } };
  const target = profileData[targetId] ?? { items: [], library: [] };
  delete profileData[targetId];
  return { ...base, profileData, activeProfile: targetId, items: target.items, library: target.library };
}

function replaceItem(state, id, update) {
  return state.items.map(item => item.id === id ? { ...item, ...update(item) } : item);
}

// El marcador es la fuente del partido para todos los gráficos del perfil.
function syncVolley(items, previous = [], preferredId) {
  const source = items.find(i => i.id === preferredId && i.graphic.templateId === "volley-scorebug") ?? items.find(i => i.graphic.templateId === "volley-scorebug");
  if (!source) return items;
  const f = source.graphic.fields, m = volleyMatch(f);
  const old = previous.find(i => i.id === source.id)?.graphic.fields ?? f;
  const aliases = side => [old[`${side}Name`], f[`${side}Name`]].map(n => String(n).toLowerCase());
  return items.map(item => {
    if (item.id === source.id) return item;
    const fields = { ...item.graphic.fields }, type = item.graphic.templateId;
    let unavailable = false;
    if (type === "volley-scorebug") Object.assign(fields, f);
    else {
      for (const side of ["home", "away"]) {
        if (`${side}Name` in fields) for (const key of ["Name", "Color", "Logo"]) fields[`${side}${key}`] = f[`${side}${key}`];
        if ("team" in fields && aliases(side).includes(String(fields.team).toLowerCase())) {
          fields.team = f[`${side}Name`]; fields.teamColor = f[`${side}Color`]; fields.teamLogo = f[`${side}Logo`];
        }
      }
      if ("competitionLogo" in fields) fields.competitionLogo = f.competitionLogo;
      if (type === "matchup") {
        fields.competition = f.competition;
        fields.homeScore = m.history.length ? f.homeSets : "";
        fields.awayScore = m.history.length ? f.awaySets : "";
        if (m.finished) fields.status = "FINAL";
        else if (m.history.length || m.home || m.away || source.onAir) fields.status = `SET ${m.setNumber}`;
        else if (/^(SET \d|FINAL)/.test(fields.status)) fields.status = "POR COMENZAR";
      }
      if (type === "period-scores") {
        fields.total = "wins";
        fields.periods = m.history.map((scores, i) => `Set ${i + 1} | ${scores[0]} | ${scores[1]}`).join("\n");
      }
      if (["score-event", "substitution"].includes(type)) fields.minute = `SET ${m.setNumber}`;
      if (type === "score-event") fields.score = `${f.homeName} ${f.homePoints} - ${f.awayPoints} ${f.awayName}`;
    }
    if (type === "game-event" && fields.context !== "manual") {
      const notice = volleyNotice(f, fields.context);
      unavailable = !notice;
      fields.detail = notice?.detail ?? (fields.context === "set-result" ? "Aún no hay sets cerrados" : "Este aviso no corresponde al marcador actual");
      fields.team = notice?.side ? f[`${notice.side}Name`] : "";
      fields.teamLogo = notice?.side ? f[`${notice.side}Logo`] : "";
      if (notice?.side) fields.teamColor = f[`${notice.side}Color`];
    }
    const graphic = cleanGraphic({ ...item.graphic, fields });
    const withdraw = unavailable && item.onAir && item.phase !== "exiting";
    if (!withdraw && JSON.stringify(graphic) === JSON.stringify(item.graphic)) return item;
    return { ...item, graphic, revision: item.revision + 1, phase: unavailable && item.onAir ? "exiting" : item.onAir ? "updating" : item.phase };
  });
}

export function applyAction(state, action) {
  const result = reduceAction(state, action);
  if (result.error) return result;
  if (action.type === "item_show") {
    const graphic = result.items.find(item => item.id === String(action.id))?.graphic;
    if (graphic?.templateId === "game-event" && graphic.fields.context !== "manual") {
      const source = result.items.find(item => item.graphic.templateId === "volley-scorebug");
      if (!source || !volleyNotice(source.graphic.fields, graphic.fields.context)) return { error: "validation", errors: { detail: "Este aviso todavía no corresponde al marcador del partido." } };
    }
  }
  return { ...result, items: syncVolley(result.items, state.items, action.id) };
}

function reduceAction(state, action) {
  const now = new Date().toISOString();
  const revision = state.revision + 1;
  const base = { ...state, revision, updatedAt: now };
  const id = String(action.id ?? "");
  const current = state.items.find(item => item.id === id);

  if (action.type === "item_add") {
    if (state.items.length >= MAX_ITEMS) return { error: "limit" };
    const templateId = TEMPLATES[action.templateId] ? action.templateId : "lower-third";
    // Hereda el look del último gráfico para que el paquete sea coherente,
    // y escalona los gráficos inferiores para que no queden encimados.
    const lastStyle = state.items.at(-1)?.graphic.style ?? {};
    const stacked = state.items.filter(item => MOVABLE_TEMPLATES.includes(item.graphic.templateId)).length;
    const style = { ...lookOf(lastStyle), ...(MOVABLE_TEMPLATES.includes(templateId) ? { y: -170 * (stacked % 4) || 0 } : {}) };
    const fields = action.fields ? { ...defaultsFor(templateId), ...action.fields } : defaultsFor(templateId);
    const graphic = cleanGraphic({ templateId, fields, style: action.style ? { ...style, ...action.style } : style });
    const item = { id: newId(revision), graphic, timers: cleanTimers(null, graphic), onAir: false, phase: "idle", revision: 0 };
    return { ...base, items: [...state.items, item], lastAdded: item.id };
  }
  if (!current && action.type.startsWith("item_")) return { error: "not_found" };

  if (action.type === "item_update") {
    const graphic = cleanGraphic({ ...action.graphic, templateId: current.graphic.templateId });
    if (current.onAir) {
      const { errors } = validateGraphic(graphic);
      if (Object.keys(errors).length) return { error: "validation", errors };
      return { ...base, items: replaceItem(state, id, item => ({ graphic, phase: "updating", revision: item.revision + 1 })) };
    }
    return { ...base, items: replaceItem(state, id, () => ({ graphic })) };
  }
  if (action.type === "item_show") {
    const { clean, errors } = validateGraphic(action.graphic ? { ...action.graphic, templateId: current.graphic.templateId } : current.graphic);
    if (Object.keys(errors).length) return { error: "validation", errors };
    // Todo lo que sale en pantalla queda en Guardados automáticamente.
    const library = clean.templateId === "bug" ? state.library : remember(state.library, clean.templateId, clean.fields, revision);
    return { ...base, library, items: replaceItem(state, id, item => ({ graphic: clean, onAir: true, phase: item.onAir ? "updating" : "entering", revision: item.revision + 1 })) };
  }
  if (action.type === "item_hide") {
    if (!current.onAir) return state;
    return { ...base, items: replaceItem(state, id, item => ({ phase: "exiting", revision: item.revision + 1 })) };
  }
  if (action.type === "item_delete") return { ...base, items: state.items.filter(item => item.id !== id) };
  if (action.type === "item_duplicate") {
    if (state.items.length >= MAX_ITEMS) return { error: "limit" };
    const style = { ...current.graphic.style, y: Math.max(-900, current.graphic.style.y - 170) };
    const graphic = cleanGraphic({ ...current.graphic, style });
    const copy = { id: newId(revision), graphic, timers: cleanTimers(current.timers, graphic), onAir: false, phase: "idle", revision: 0 };
    const index = state.items.indexOf(current);
    return { ...base, items: [...state.items.slice(0, index + 1), copy, ...state.items.slice(index + 1)], lastAdded: copy.id };
  }
  // Relojes: start | stop | set (value en ms) | toggle. No cambian la revisión
  // del gráfico, así que nunca reinician su animación.
  if (action.type === "item_timer") {
    const field = timerFields(TEMPLATES[current.graphic.templateId]).find(item => item.id === action.key);
    if (!field) return { error: "not_found" };
    const nowMs = Date.now();
    const timer = current.timers?.[field.id] ?? { running: false, baseMs: parseClock(field.default), startedAt: 0 };
    const value = timerValue(timer, nowMs, field.direction);
    let next = timer;
    const op = action.op === "toggle" ? (timer.running ? "stop" : "start") : action.op;
    if (op === "start" && !timer.running) next = { running: true, baseMs: value, startedAt: nowMs };
    if (op === "stop" && timer.running) next = { running: false, baseMs: value, startedAt: 0 };
    if (op === "set") {
      const baseMs = Math.max(0, Math.min(99 * 60_000 + 59_000, Number(action.value) || 0));
      const running = action.run === undefined ? timer.running : Boolean(action.run);
      next = { running, baseMs, startedAt: running ? nowMs : 0 };
    }
    return { ...base, items: replaceItem(state, id, item => ({ timers: { ...item.timers, [field.id]: next } })) };
  }
  if (action.type === "hide_all") {
    return { ...base, items: state.items.map(item => item.onAir ? { ...item, phase: "exiting", revision: item.revision + 1 } : item) };
  }
  if (action.type === "settle") {
    if (!current || current.revision !== action.itemRevision) return state;
    return { ...state, updatedAt: now, items: replaceItem(state, id, () => ({ phase: action.phase, onAir: action.onAir })) };
  }
  if (action.type === "preset_save") {
    const name = String(action.name ?? "").replace(/\s+/g, " ").trim().slice(0, 32);
    if (!name) return { error: "validation", errors: { presetName: "Escribe un nombre para el estilo." } };
    const preset = { id: newId(revision), name, style: lookOf(action.style) };
    return { ...base, presets: [...state.presets.filter(item => item.name !== name), preset].slice(-40) };
  }
  if (action.type === "preset_delete") return { ...base, presets: state.presets.filter(item => item.id !== id) };
  if (action.type === "apply_look_all") {
    const look = lookOf(action.style);
    return {
      ...base,
      items: state.items.map(item => {
        const graphic = cleanGraphic({ ...item.graphic, style: { ...item.graphic.style, ...look } });
        return item.onAir ? { ...item, graphic, phase: "updating", revision: item.revision + 1 } : { ...item, graphic };
      })
    };
  }
  if (action.type === "library_save") {
    const templateId = TEMPLATES[action.templateId] ? action.templateId : "lower-third";
    const library = remember(state.library, templateId, action.fields, revision);
    if (library === state.library) return { error: "validation", errors: { library: "No hay texto para guardar." } };
    return { ...base, library };
  }
  if (action.type === "library_delete") return { ...base, library: state.library.filter(entry => entry.id !== id) };
  if (action.type === "library_import") {
    const templateId = TEMPLATES[action.templateId] ? action.templateId : "lower-third";
    const columns = IMPORT_FIELDS[templateId];
    let library = state.library, added = 0;
    for (const line of String(action.text ?? "").split(/\r?\n/).slice(0, 500)) {
      // Columnas separadas por |, tabulador o guion con espacios ("Ana Ruiz - Alcaldesa").
      const parts = line.split(/\s*\|\s*|\t|\s+[-–—]\s+/).map(part => part.trim());
      if (!parts[0]) continue;
      const fields = Object.fromEntries(columns.map((key, index) => [key, parts[index] ?? ""]));
      library = remember(library, templateId, fields, revision + added);
      added++;
    }
    if (!added) return { error: "validation", errors: { import: "Pega al menos una línea con texto." } };
    return { ...base, library, imported: added };
  }
  if (action.type === "profile_create") {
    if (state.profiles.length >= MAX_PROFILES) return { error: "limit" };
    const profile = { id: `p${newId(revision)}`, name: cleanName(action.name, `Perfil ${state.profiles.length + 1}`) };
    const next = { ...base, profiles: [...state.profiles, profile] };
    const data = action.copy
      ? { items: cleanItems(state.items).map((item, index) => ({ ...item, id: `${newId(revision)}-${index}` })), library: state.library }
      : { items: [], library: [] };
    return switchProfile({ ...next, profileData: { ...state.profileData, [profile.id]: data } }, profile.id, next);
  }
  // Perfil listo para usar (Fútbol, Básquet, Vóley): gráficos acomodados,
  // estilo del deporte y Guardados de ejemplo. No toca los demás perfiles.
  if (action.type === "profile_create_preset") {
    if (state.profiles.length >= MAX_PROFILES) return { error: "limit" };
    const preset = PROFILE_PRESETS.find(item => item.id === action.preset);
    if (!preset) return { error: "not_found" };
    const profile = { id: `p${newId(revision)}`, name: cleanName(action.name, preset.name) };
    const items = preset.items.map((entry, index) => {
      const graphic = cleanGraphic({ templateId: entry.templateId, fields: { ...defaultsFor(entry.templateId), ...entry.fields }, style: { ...preset.style, ...entry.style } });
      return { id: `${newId(revision)}-${index}`, graphic, timers: cleanTimers(null, graphic), onAir: false, phase: "idle", revision: 0 };
    });
    let library = [];
    preset.library.forEach((entry, index) => { library = remember(library, entry.templateId, { ...defaultsFor(entry.templateId), ...entry.fields }, revision * 1000 + index); });
    const next = { ...base, profiles: [...state.profiles, profile] };
    return switchProfile({ ...next, profileData: { ...state.profileData, [profile.id]: { items, library } } }, profile.id, next);
  }
  if (action.type === "profile_switch") {
    if (!state.profiles.some(profile => profile.id === id) || id === state.activeProfile) return state;
    return switchProfile(state, id, base);
  }
  if (action.type === "profile_rename") {
    if (!state.profiles.some(profile => profile.id === id)) return { error: "not_found" };
    return { ...base, profiles: state.profiles.map(profile => profile.id === id ? { ...profile, name: cleanName(action.name, profile.name) } : profile) };
  }
  if (action.type === "profile_delete") {
    if (state.profiles.length <= 1 || !state.profiles.some(profile => profile.id === id)) return { error: "validation", errors: { profile: "Debe quedar al menos un perfil." } };
    let next = { ...base, profiles: state.profiles.filter(profile => profile.id !== id) };
    if (id === state.activeProfile) next = switchProfile(next, next.profiles[0].id, next);
    const profileData = { ...next.profileData };
    delete profileData[id];
    return { ...next, profileData };
  }
  if (action.type === "profile_import") {
    if (state.profiles.length >= MAX_PROFILES) return { error: "limit" };
    const data = action.data ?? {};
    const profile = { id: `p${newId(revision)}`, name: cleanName(action.name ?? data.name, "Perfil importado") };
    const next = { ...base, profiles: [...state.profiles, profile], presets: cleanPresets([...state.presets, ...(Array.isArray(data.presets) ? data.presets : [])]) };
    return switchProfile({ ...next, profileData: { ...state.profileData, [profile.id]: { items: cleanItems(data.items), library: cleanLibrary(data.library) } } }, profile.id, next);
  }
  return { error: "unknown_action" };
}
