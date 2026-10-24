import { setupUpdateUI } from "/updates.js";
import { assetUrl, volleyRally, volleyMatch, normalizeVolley, formatClock, parseClock, timerFields, timerValue } from "/sports.js";
import { connectionLinks } from "/network.js";
import { PROFILE_PRESETS } from "/presets.js";
import {
  ANIMATION_PRESETS, COLOR_PRESETS, DESIGN_PRESETS, FONT_PRESETS, IMPORT_FIELDS, LIBRARY_GROUPS, MOVABLE_TEMPLATES, QUICK_POSITIONS,
  SPORT_CATEGORIES, STYLE_RANGES, TEMPLATES, TEMPLATE_ORDER, cleanGraphic, validateGraphic, graphicTitle
} from "/templates.js";

const $ = selector => document.querySelector(selector);
const editor = $("#editor"), itemList = $("#itemList"), frame = $("#screenFrame");

let currentState = null;  // último estado del servidor
let selectedId = null;    // gráfico elegido en la lista o en la pantalla
let editing = null;       // copia local del gráfico elegido
let toastTimer = null;
let saving = false;
let pendingUploads = 0;
const drafts = new Map();
try { for (const [id, graphic] of JSON.parse(sessionStorage.getItem("pulso-drafts") || "[]")) drafts.set(id, graphic); } catch {}
const hasChanges = () => Boolean(editing && drafts.has(editing.id));
function storeDrafts() { try { sessionStorage.setItem("pulso-drafts", JSON.stringify([...drafts])); } catch {} }
let customLogoExists = false;
let renderedNetworkLinks = "";
const openSections = new Set(["match", "text", "position"]);
let libraryFolder = "all", librarySearch = "";
let bootId = null;
const prefs = loadPrefs();

/* ── Utilidades ─────────────────────────────────────────────────────── */
const icon = name => `<i data-lucide="${name}"></i>`;
const refreshIcons = () => window.lucide?.createIcons();
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const rgbTriplet = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(" ");
const clone = value => JSON.parse(JSON.stringify(value));
const itemById = id => currentState?.items.find(item => item.id === id);
const isVisible = item => Boolean(item?.onAir && item.phase !== "exiting");
const isTyping = target => target?.matches?.("input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select");

function loadPrefs() {
  try { return { backdrop: "studio", guides: false, ...JSON.parse(localStorage.getItem("pulso-screen") || "{}") }; }
  catch { return { backdrop: "studio", guides: false }; }
}
function savePrefs() {
  try { localStorage.setItem("pulso-screen", JSON.stringify({ ...prefs, image: String(prefs.image ?? "").startsWith("/assets/") ? prefs.image : undefined })); } catch {}
}
function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.hidden = false;
  $("#announcer").textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { element.hidden = true; }, 2600);
}
const send = message => frame.contentWindow?.postMessage(message, location.origin);

const FORMAT = {
  pct: value => `${Math.round(value * 100)}%`,
  px: value => `${Math.round(value)} px`,
  times: value => `${Number(value).toFixed(2)}×`,
  seconds: value => Number(value) ? `${value} s` : "Nunca",
  weight: value => ({ 300: "Fina", 400: "Normal", 500: "Media", 600: "Semi", 700: "Negrita", 800: "Extra", 900: "Black" })[value] ?? String(value),
  pxs: value => `${value} px/s`
};

/* ── Servidor ───────────────────────────────────────────────────────── */
async function action(type, extra = {}, { quiet = false } = {}) {
  try {
    const response = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, ...extra }) });
    const result = await response.json();
    if (!response.ok) {
      if (result.errors) setErrors(result.errors);
      if (!quiet) toast(result.error === "limit" ? "Llegaste al máximo de 30 gráficos." : result.errors?.presetName || "Completa los campos marcados antes de mostrarlo.");
      return null;
    }
    setErrors();
    renderState(result);
    return result;
  } catch {
    if (!quiet) toast("No hay conexión con el programa. ¿Sigue abierto start.sh?");
    return null;
  }
}

/* ── Lista de gráficos ──────────────────────────────────────────────── */
function renderList() {
  const items = currentState.items;
  $("#itemCount").textContent = items.length ? `${items.length}` : "";
  $("#screenEmpty").hidden = items.length > 0;
  itemList.innerHTML = items.map(item => {
    const template = TEMPLATES[item.graphic.templateId];
    const visible = isVisible(item);
    const title = escapeHtml(graphicTitle(item.graphic));
    return `<li class="item ${item.id === selectedId ? "selected" : ""} ${visible ? "live" : ""}">
      <button type="button" class="item-main" data-select="${item.id}"><span class="thumb">${icon(template.icon)}</span><span class="item-copy"><strong>${title}</strong><small>${template.name}</small></span></button>
      <button type="button" class="eye" data-toggle="${item.id}" aria-pressed="${visible}" title="${visible ? "Ocultar" : "Mostrar"} “${title}”">${icon(visible ? "eye" : "eye-off")}<span>${visible ? "En pantalla" : "Mostrar"}</span></button>
    </li>`;
  }).join("");
  const active = items.filter(isVisible).length;
  document.body.classList.toggle("on-air", active > 0);
  $("#activeCount").textContent = active ? `${active} en pantalla` : "Nada en pantalla";
  refreshIcons();
}

itemList.addEventListener("click", event => {
  const select = event.target.closest("[data-select]"), toggle = event.target.closest("[data-toggle]");
  if (select) selectItem(select.dataset.select);
  if (toggle) toggleVisible(toggle.dataset.toggle);
});

async function toggleVisible(id) {
  const item = itemById(id);
  if (!item) return;
  if (isVisible(item)) {
    await action("item_hide", { id });
    return;
  }
  if (id !== selectedId) selectItem(id);
  if (hasChanges()) { toast("Pulsa Guardar cambios antes de mostrar el gráfico."); return; }
  if (await action("item_show", { id, graphic: id === editing?.id ? editing.graphic : undefined })) toast("Ahora se ve en pantalla");
}

/* ── Plantillas ─────────────────────────────────────────────────────── */
function buildTemplates() {
  $("#templateGrid").innerHTML = SPORT_CATEGORIES.map(category => {
    const ids = TEMPLATE_ORDER.filter(id => TEMPLATES[id].category === category.id);
    return ids.length ? `<h3 class="template-category">${category.name}</h3>` + ids.map(id => {
      const template = TEMPLATES[id];
      return `<button class="template-button" type="button" data-template="${id}"><span class="thumb">${icon(template.icon)}</span><span><strong>${template.name}</strong><small>${template.description}</small></span></button>`;
    }).join("") : "";
  }).join("");
  $("#templateGrid").addEventListener("click", async event => {
    const button = event.target.closest("[data-template]");
    if (!button) return;
    $("#templateDialog").close();
    const result = await action("item_add", { templateId: button.dataset.template });
    if (result?.lastAdded) {
      selectItem(result.lastAdded);
      editor.querySelector(".input")?.focus();
      toast("Gráfico creado. Edita, guarda los cambios y pulsa Mostrar.");
    }
  });
}
const openTemplates = () => $("#templateDialog").showModal();

/* ── Selección y edición ────────────────────────────────────────────── */
function selectItem(id) {
  if (id === selectedId && editing) return;
  selectedId = id;
  const item = itemById(id);
  editing = item ? { id, graphic: clone(cleanGraphic(drafts.get(id) ?? item.graphic)) } : null;
  send({ type: "pulso-select", id });
  if (editing && hasChanges()) send({ type: "pulso-local", id, graphic: editing.graphic });
  renderEditor();
  if (currentState) renderList();
}

function renderEditor() {
  const scrollTop = editor.scrollTop;
  if (!editing) {
    editor.innerHTML = `<div class="editor-empty">${icon("mouse-pointer-click")}<strong>Elige un gráfico</strong><span>Selecciónalo en la lista o haz clic sobre él en la pantalla.</span></div>`;
    refreshIcons();
    return;
  }
  const template = TEMPLATES[editing.graphic.templateId];
  editor.innerHTML = `
    <div class="editor-top"><span class="thumb">${icon(template.icon)}</span><div><strong>${template.name}</strong><small>${template.description}</small></div>
      <button type="button" class="icon-button" data-cmd="save-text" title="Guardar este texto en Guardados">${icon("bookmark-plus")}</button>
      <button type="button" class="icon-button" data-cmd="duplicate" title="Duplicar">${icon("copy")}</button>
      <button type="button" class="icon-button danger" data-cmd="delete" title="Eliminar">${icon("trash-2")}</button></div>
    <div class="editor-savebar"><button type="button" class="button go" data-cmd="save-changes">${icon("save")}Guardar cambios</button><button type="button" class="button subtle" data-cmd="discard-changes">Descartar</button><small data-draft-status role="status"></small></div>
    <div id="statusBox"></div>
    ${template.scorebug ? section("match", "Partido", "trophy", matchMarkup()) : ""}
    ${section("text", template.scorebug ? "Equipos y textos" : "Texto", "type", fieldsMarkup())}
    <datalist id="rosterList">${rosterOptions()}</datalist>
    ${section("position", "Posición y tamaño", "move", positionMarkup())}
    ${section("look", "Colores y acabado", "palette", lookMarkup())}
    ${section("font", "Letra", "case-sensitive", fontMarkup())}
    ${section("motion", "Animación", "sparkles", motionMarkup())}
    ${section("logo", "Logos y escudos", "image", logoMarkup())}
    ${section("presets", "Mis estilos", "bookmark", presetsMarkup())}`;
  renderStatus();
  syncSwatches();
  syncPaletteSelection();
  updateCounters();
  refreshIcons();
  updateSaveControls();
  editor.scrollTop = scrollTop;
}

function section(id, title, iconName, body) {
  return `<details class="section" data-section="${id}" ${openSections.has(id) ? "open" : ""}><summary>${icon(iconName)}<span>${title}</span>${icon("chevron-down")}</summary><div class="section-body">${body}</div></details>`;
}

function renderStatus() {
  const box = $("#statusBox");
  if (!box || !editing) return;
  const visible = isVisible(itemById(editing.id));
  box.innerHTML = `<div class="status ${visible ? "live" : ""}"><i></i><span><b>${visible ? "Se ve en pantalla" : "Oculto"}</b><small>${visible ? "Pulsa Guardar cambios para actualizar lo que está en pantalla." : "Nadie lo ve todavía. Pulsa Mostrar cuando esté listo."}</small></span></div>
    <button type="button" class="button ${visible ? "hide" : "show"}" data-cmd="toggle">${icon(visible ? "eye-off" : "eye")}${visible ? "Ocultar" : "Mostrar en pantalla"}<kbd>Ctrl ↵</kbd></button>`;
  updateSaveControls();
  refreshIcons();
}

// Edición local: OBS recibe un único gráfico completo al guardar.
function updateSaveControls(message) {
  const dirty = hasChanges();
  const status = message || (pendingUploads ? "Preparando imagen…" : saving ? "Guardando…" : dirty ? "Cambios pendientes · solo en vista previa" : "Todo guardado");
  $("#saveState").textContent = status;
  const label = editor.querySelector("[data-draft-status]");
  if (label) label.textContent = status;
  for (const button of editor.querySelectorAll('[data-cmd="save-changes"], [data-cmd="discard-changes"]')) button.disabled = saving || pendingUploads > 0 || !dirty;
}
function changed() {
  if (!editing) return;
  drafts.set(editing.id, clone(editing.graphic));
  storeDrafts();
  send({ type: "pulso-local", id: editing.id, graphic: editing.graphic });
  syncColorControls();
  updateSaveControls();
}
async function save() {
  if (!editing || saving || pendingUploads) return false;
  const id = editing.id, snapshot = clone(editing.graphic), draftVersion = drafts.get(editing.id);
  for (const input of editor.querySelectorAll('[data-color-value]')) {
    if (!/^#[0-9a-f]{6}$/i.test(input.value)) { toast("Escribe un color completo, por ejemplo #FFCC00."); input.focus(); return false; }
  }
  const { errors } = validateGraphic(snapshot);
  if (Object.keys(errors).length) { setErrors(errors); toast("Revisa los campos marcados antes de guardar."); return false; }
  saving = true;
  updateSaveControls();
  const result = await action("item_update", { id, graphic: snapshot });
  saving = false;
  if (result) {
    if (drafts.get(id) === draftVersion) drafts.delete(id);
    storeDrafts();
    if (editing?.id === id && !drafts.has(id)) {
      editing.graphic = clone(cleanGraphic(result.items.find(item => item.id === id).graphic));
      send({ type: "pulso-local", id, graphic: editing.graphic });
      renderEditor();
    }
    toast("Cambios guardados y aplicados juntos");
  }
  updateSaveControls(result ? undefined : "No se pudo guardar · conserva tus cambios");
  return Boolean(result);
}
// Cambiar de gráfico o perfil conserva el borrador sin publicarlo.
function discardChanges() {
  if (!editing) return;
  drafts.delete(editing.id); storeDrafts();
  editing.graphic = clone(cleanGraphic(itemById(editing.id).graphic));
  send({ type: "pulso-local", id: editing.id, graphic: editing.graphic });
  renderEditor();
}
function colorControl(key, value, label, field = false) {
  const attr = field ? "data-field" : "data-key";
  return `<label class="color-control-label">${label}<span class="color-control"><input type="color" data-color-picker="${key}" data-color-kind="${field ? "field" : "style"}" value="${value}" aria-label="Elegir ${label}"><input class="input color-hex" data-color-value ${attr}="${key}" value="${value}" spellcheck="false" maxlength="7" aria-label="Código de ${label}"></span></label>`;
}
function syncColorControls() {
  for (const picker of editor.querySelectorAll("[data-color-picker]")) {
    const value = (picker.dataset.colorKind === "field" ? editing.graphic.fields : editing.graphic.style)[picker.dataset.colorPicker];
    if (/^#[0-9a-f]{6}$/i.test(value)) {
      picker.value = value;
      const hex = picker.parentElement.querySelector('.color-hex');
      if (document.activeElement !== hex) hex.value = value;
    }
  }
}

/* Texto */
function fieldsMarkup() {
  const template = TEMPLATES[editing.graphic.templateId];
  return `<div class="fields">${template.fields.filter(field => !field.live && field.type !== "timer").map(field => {
    if (field.type === "checkbox") return `<div class="field">${toggleMarkup(`field:${field.id}`, field.label, "Hora de este equipo", editing.graphic.fields[field.id])}</div>`;
    if (field.type === "image") {
      const url = assetUrl(editing.graphic.fields[field.id]);
      return `<div class="field compact-field logo-field"><span class="muted small">${field.label}</span><div class="logo-pick"><span class="logo-prev">${url ? `<img src="${url}" alt="">` : icon("shield")}</span><label class="button small-btn">${icon("upload")}${url ? "Cambiar" : "Subir"}<input type="file" accept="image/png,image/jpeg,image/webp" data-upload="${field.id}"></label>${url ? `<button type="button" class="icon-button" data-clear-image="${field.id}" title="Quitar">${icon("x")}</button>` : ""}</div></div>`;
    }
    if (field.type === "color") return `<div class="field compact-field">${colorControl(field.id, editing.graphic.fields[field.id], field.label, true)}</div>`;
    if (field.type === "select") return `<label class="field ${field.options.length > 2 ? "" : "compact-field"}"><span class="muted small">${field.label}</span><select class="select" data-field="${field.id}">${field.options.map(option => `<option value="${option.value}" ${editing.graphic.fields[field.id] === option.value ? "selected" : ""}>${option.label}</option>`).join("")}</select></label>`;
    const value = escapeHtml(editing.graphic.fields[field.id] ?? "");
    const attrs = `class="input" id="field-${field.id}" data-field="${field.id}" maxlength="${field.max}" aria-describedby="error-${field.id}"`;
    const list = ["player", "name", "inName", "outName"].includes(field.id) ? ` list="rosterList" autocomplete="off"` : "";
    const control = field.multiline ? `<textarea ${attrs} rows="${field.max > 250 ? 7 : 3}">${value}</textarea>` : `<input ${attrs}${list} value="${value}">`;
    return `<div class="field ${field.width === "short" ? "compact-field" : ""}"><label for="field-${field.id}"><span>${field.label}${field.required ? "" : ' <span class="opt">opcional</span>'}</span><span class="counter"></span></label>${control}<span class="field-error" id="error-${field.id}"></span></div>`;
  }).join("")}</div>`;
}
function updateCounters() {
  for (const input of editor.querySelectorAll("[data-field].input")) {
    const counter = input.closest(".field").querySelector(".counter");
    if (!counter) continue;
    counter.textContent = `${input.value.length}/${input.maxLength}`;
    counter.classList.toggle("near", input.value.length > input.maxLength * .85);
  }
}
function setErrors(errors = {}) {
  for (const input of editor.querySelectorAll("[data-field].input")) {
    const message = errors[input.dataset.field] || "";
    input.closest(".field").classList.toggle("has-error", Boolean(message));
    input.setAttribute("aria-invalid", String(Boolean(message)));
    const error = input.closest(".field").querySelector(".field-error");
    if (error) error.textContent = message;
  }
  const first = Object.keys(errors)[0];
  if (first && editor.querySelector(`#field-${first}`)) {
    openSections.add("text");
    editor.querySelector('[data-section="text"]').open = true;
    editor.querySelector(`#field-${first}`).focus();
  }
}

/* Plantel: al escribir un nombre guardado se completan dorsal y equipo. */
function rosterOptions() {
  const names = new Map();
  for (const entry of currentState?.library ?? []) {
    const name = entry.fields.name || entry.fields.player;
    if (name && ["player", "card", "score-event", "lower-third"].includes(entry.templateId)) names.set(name, entry.fields.team || entry.fields.role || "");
  }
  return [...names].map(([name, team]) => `<option value="${escapeHtml(name)}">${escapeHtml(team)}</option>`).join("");
}
function fillFromRoster(input) {
  const entry = [...(currentState?.library ?? [])].reverse().find(item => item.templateId === "player" && item.fields.name === input.value);
  if (!entry) return;
  const fields = editing.graphic.fields;
  const numberKey = { inName: "inNumber", outName: "outNumber" }[input.dataset.field] ?? "number";
  const updates = { [numberKey]: entry.fields.number, team: entry.fields.team, ...(input.dataset.field === "name" ? { position: entry.fields.position } : {}) };
  for (const [key, value] of Object.entries(updates)) {
    if (!(key in fields) || !value) continue;
    fields[key] = value;
    const other = editor.querySelector(`[data-field="${key}"]`);
    if (other) other.value = value;
  }
}

/* ── Escudos y logos ────────────────────────────────────────────────── */
editor.addEventListener("change", async event => {
  const key = event.target.dataset?.upload;
  if (!key || !editing) return;
  const file = event.target.files?.[0];
  if (!file) return;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 3_000_000) { toast("Usa PNG, JPG o WebP de máximo 3 MB (PNG con fondo transparente queda mejor)."); return; }
  pendingUploads++; updateSaveControls();
  try {
    const draftId = editing.id;
    const draftGraphic = editing.graphic;
    const response = await fetch("/api/asset", { method: "POST", headers: { "Content-Type": file.type }, body: file });
    if (!response.ok) throw new Error("upload");
    const uploaded = (await response.json()).id;
    draftGraphic.fields[key] = uploaded;
    if (editing?.id !== draftId) { drafts.set(draftId, clone(draftGraphic)); storeDrafts(); toast("Logo preparado en el borrador del gráfico."); return; }
    renderEditor();
    changed({ delay: 0 });
    toast("Logo preparado. Pulsa Guardar cambios para aplicarlo.");
  } catch { toast("No se pudo cargar la imagen."); }
  finally { pendingUploads--; updateSaveControls(); }
});
editor.addEventListener("click", event => {
  const clear = event.target.closest("[data-clear-image]");
  if (!clear || !editing) return;
  editing.graphic.fields[clear.dataset.clearImage] = "";
  renderEditor();
  changed({ delay: 0 });
});

// Copia escudos y colores de los dos equipos a todos los gráficos del perfil.
async function shareTeams() {
  if (hasChanges()) { toast("Guarda los cambios antes de compartirlos con todo el perfil."); return; }
  const f = editing.graphic.fields;
  const matchup = currentState.items.find(item => item.graphic.templateId === "matchup")?.graphic.fields ?? {};
  const names = side => new Set([f[`${side}Name`], matchup[`${side}Name`]].filter(Boolean).map(name => name.toLowerCase()));
  const sides = { home: names("home"), away: names("away") };
  let count = 0;
  for (const item of currentState.items) {
    if (item.id === editing.id) continue;
    const fields = { ...item.graphic.fields };
    let touched = false;
    for (const side of ["home", "away"]) {
      for (const suffix of ["Color", "Logo"]) {
        if (`${side}${suffix}` in fields && f[`${side}${suffix}`] !== undefined) { fields[`${side}${suffix}`] = f[`${side}${suffix}`]; touched = true; }
      }
      // Gráficos de un solo equipo (tarjeta, jugador…): por el nombre del equipo.
      if ("teamLogo" in fields && sides[side].has(String(fields.team ?? "").toLowerCase())) {
        fields.teamLogo = f[`${side}Logo`]; fields.teamColor = f[`${side}Color`]; touched = true;
      }
    }
    if ("competitionLogo" in fields && f.competitionLogo) { fields.competitionLogo = f.competitionLogo; touched = true; }
    if (!touched) continue;
    await action("item_update", { id: item.id, graphic: { ...item.graphic, fields } }, { quiet: true });
    count++;
  }
  toast(count ? `Escudos y colores aplicados a ${count} gráficos` : "No hay otros gráficos de estos equipos");
}

/* ── Partido: controles en vivo de los marcadores ─────────────────────── */
let serverOffset = 0;
const timerNow = () => Date.now() + serverOffset;
const n = value => Math.max(0, parseInt(value, 10) || 0);
function liveTimer(key) {
  const item = itemById(editing.id);
  const field = timerFields(TEMPLATES[editing.graphic.templateId]).find(entry => entry.id === key);
  const timer = item?.timers?.[key];
  return { field, timer, ms: timerValue(timer, timerNow(), field.direction), running: Boolean(timer?.running) };
}
function stepper(key, label, steps = [1]) {
  return `<div class="stepper"><span class="stepper-label">${label}</span><button type="button" class="step-btn" data-op="inc" data-key="${key}" data-delta="-1" aria-label="${label}: restar">−</button><output class="step-val">${escapeHtml(editing.graphic.fields[key])}</output>${steps.map(step => `<button type="button" class="step-btn plus" data-op="inc" data-key="${key}" data-delta="${step}">+${step}</button>`).join("")}</div>`;
}
function clockMarkup(key, label, presets = []) {
  const { field, ms, running } = liveTimer(key);
  return `<div class="clock-box"><div class="clock-top"><span class="stepper-label">${label}</span><output class="clock-read ${running ? "running" : ""}" data-live-timer="${key}">${formatClock(ms, field.format, field.direction)}</output></div>
    <div class="clock-actions"><button type="button" class="button ${running ? "" : "go"}" data-timer-op="toggle" data-key="${key}">${icon(running ? "pause" : "play")}${running ? "Pausar" : "Iniciar"}</button>
    ${presets.map(([text, value]) => `<button type="button" class="button" data-timer-op="set" data-key="${key}" data-value="${value}">${text}</button>`).join("")}
    <input class="input clock-input" data-timer-input="${key}" placeholder="${field.format === "seconds" ? "24" : "mm:ss"}" aria-label="Ajustar ${label}"><button type="button" class="button" data-timer-op="adjust" data-key="${key}">Ajustar</button></div></div>`;
}
const choice = (key, values) => `<div class="seg">${values.map(([value, text]) => `<button type="button" data-op="set" data-key="${key}" data-value="${value}" aria-pressed="${editing.graphic.fields[key] === value}">${text}</button>`).join("")}</div>`;

function matchMarkup() {
  const f = editing.graphic.fields;
  const kind = TEMPLATES[editing.graphic.templateId].scorebug;
  const title = side => `<b class="team-title" style="--c:${f[`${side}Color`]}">${f[`${side}Logo`] ? `<img src="${assetUrl(f[`${side}Logo`])}" alt="">` : ""}<span>${escapeHtml(f[`${side}Name`])}</span></b>`;
  const teams = (render) => `<div class="teams-grid"><div class="team-col">${title("home")}${render("home")}</div><div class="team-col">${title("away")}${render("away")}</div></div>`;
  const share = `<button type="button" class="button subtle" data-op="share-teams">${icon("shield-check")}Usar estos escudos y colores en todo el perfil</button>`;
  if (kind === "soccer") {
    return share + teams(side => stepper(`${side}Score`, "Goles") + stepper(`${side}Red`, "Rojas"))
      + clockMarkup("clock", "Reloj", [["0:00", 0], ["45:00", 2_700_000]])
      + `<div class="sub">Periodo</div>` + `<div class="seg">${[["1T", "1T", 0], ["2T", "2T", 2_700_000], ["TE1", "Prórroga 1", 5_400_000], ["TE2", "Prórroga 2", 6_300_000], ["PEN", "Penales", null]].map(([value, text, clock]) => `<button type="button" data-op="period" data-value="${value}" data-clock="${clock ?? ""}" aria-pressed="${f.period === value}">${text}</button>`).join("")}</div>`
      + `<div class="sub">Tiempo añadido</div><div class="seg">${["", "1", "2", "3", "4", "5", "6", "8", "10"].map(value => `<button type="button" data-op="set" data-key="addedTime" data-value="${value}" aria-pressed="${f.addedTime === value}">${value ? `+${value}` : "Ninguno"}</button>`).join("")}</div>`
      + `<button type="button" class="button subtle" data-op="reset-match">${icon("rotate-ccw")}Reiniciar partido</button>`;
  }
  if (kind === "basket") {
    return share + teams(side => stepper(`${side}Score`, "Puntos", [1, 2, 3]) + stepper(`${side}Fouls`, "Faltas") + stepper(`${side}Timeouts`, "Tiempos muertos"))
      + clockMarkup("clock", "Reloj de juego", [["10:00", 600_000], ["5:00", 300_000]])
      + clockMarkup("shot", "Posesión", [["24", 24_000], ["14", 14_000]])
      + `<div class="sub">Cuarto <small>al cambiar se reinician faltas y reloj</small></div>` + `<div class="seg">${["1º", "2º", "3º", "4º", "TE"].map(value => `<button type="button" data-op="quarter" data-value="${value}" aria-pressed="${f.period === value}">${value === "TE" ? "Prórroga" : value}</button>`).join("")}</div>`
      + `<button type="button" class="button subtle" data-op="reset-match">${icon("rotate-ccw")}Reiniciar partido</button>`;
  }
  return share + teams(side => `<button type="button" class="button point" data-op="point" data-side="${side}">${f.scoring === "sideout" ? "Gana jugada" : "+1 punto"}</button>` + stepper(`${side}Points`, "Puntos") + `<div class="sub">Sets ganados: <b>${escapeHtml(f[`${side}Sets`])}</b></div>`)
    + `<div class="sub">Saca</div>` + choice("serve", [["home", escapeHtml(f.homeName)], ["away", escapeHtml(f.awayName)]])
    + `<p class="hint">El set actual es común a ambos equipos. Los sets ganados se calculan al cerrar cada set.</p><label class="field">Corregir sets cerrados (local-visitante)<input class="input" data-field="history" value="${escapeHtml(f.history)}" placeholder="25-21 23-25"></label>`
    + `<div class="sub">${volleyMatch(f).finished ? "PARTIDO FINALIZADO · " : ""}Set actual: ${escapeHtml(f.setNumber)} ${f.history ? `<small>Anteriores: ${escapeHtml(f.history)}</small>` : ""}</div>`
    + `<button type="button" class="button go" data-op="close-set">${icon("flag")}Cerrar set (${escapeHtml(f.homePoints)}-${escapeHtml(f.awayPoints)}) y actualizar partido</button>`
    + `<button type="button" class="button subtle" data-op="reset-match">${icon("rotate-ccw")}Reiniciar partido</button>`;
}

function rerenderMatch() {
  const body = editor.querySelector('[data-section="match"] .section-body');
  if (!body) return;
  body.innerHTML = matchMarkup();
  refreshIcons();
}

async function timerAction(key, op, value, run) {
  const result = await action("item_timer", { id: editing.id, key, op, value, run });
  if (result) rerenderMatch();
}

editor.addEventListener("click", async event => {
  const button = event.target.closest("[data-op],[data-timer-op]");
  if (!button || !editing) return;
  event.stopPropagation();
  const f = editing.graphic.fields;
  const { op, key } = button.dataset;
  const timerOp = button.dataset.timerOp;
  if (timerOp) {
    if (timerOp === "toggle") return timerAction(key, "toggle");
    if (timerOp === "set") {
      // Posesión de 24/14: corre sola si el reloj de juego está corriendo.
      const run = key === "shot" ? liveTimer("clock").running : undefined;
      return timerAction(key, "set", Number(button.dataset.value), run);
    }
    const input = editor.querySelector(`[data-timer-input="${key}"]`);
    if (!input.value.trim()) return input.focus();
    await timerAction(key, "set", parseClock(input.value));
    return;
  }
  if (op === "share-teams") return shareTeams();
  if ((op === "point" || (op === "inc" && key?.endsWith("Points"))) && TEMPLATES[editing.graphic.templateId].scorebug === "volley" && volleyMatch(f).finished) { toast("El partido ya terminó."); return; }
  if (op === "inc") f[key] = String(Math.max(0, n(f[key]) + Number(button.dataset.delta)));
  if (op === "set") f[key] = button.dataset.value;
  if (op === "period") {
    f.period = button.dataset.value;
    if (button.dataset.clock !== "") await timerAction("clock", "set", Number(button.dataset.clock), false);
    else await timerAction("clock", "stop");
    f.addedTime = "";
  }
  if (op === "quarter") {
    f.period = button.dataset.value;
    f.homeFouls = "0"; f.awayFouls = "0";
    await timerAction("clock", "set", button.dataset.value === "TE" ? 300_000 : 600_000, false);
    await timerAction("shot", "set", 24_000, false);
  }

  if (op === "point") {
    // Vóley (rally point): quien gana el punto pasa a sacar.
    Object.assign(f, volleyRally(f, button.dataset.side));
  }
  if (op === "close-set") {
    const m = volleyMatch(f);
    if (!m.canClose) { toast(m.finished ? "El partido ya terminó. Corrige los parciales o reinicia el partido." : `El set necesita ${m.target} puntos y ${m.margin} de ventaja.`); return; }
    f.history = [f.history, `${m.home}-${m.away}`].filter(Boolean).join(" ");
    const closed = normalizeVolley(f);
    Object.assign(f, closed);
    if (!volleyMatch(f).finished) { f.homePoints = "0"; f.awayPoints = "0"; }
    toast(volleyMatch(f).finished ? "Partido finalizado" : "Set cerrado. Selecciona el saque inicial del siguiente set.");
  }
  if (op === "reset-match") {
    if (!confirm("¿Reiniciar marcador, periodo y reloj? Los nombres y colores se mantienen.")) return;
    const template = TEMPLATES[editing.graphic.templateId];
    for (const field of template.fields) if (field.live) f[field.id] = field.default;
    for (const field of timerFields(template)) await timerAction(field.id, "set", parseClock(field.default), false);
  }
  if (editing.graphic.templateId === "volley-scorebug") Object.assign(f, normalizeVolley(f));
  rerenderMatch();
  changed({ delay: 0 });
}, true);

// Lectura de relojes en el panel (mismo cálculo que la salida).
setInterval(() => {
  if (!editing) return;
  for (const node of editor.querySelectorAll("[data-live-timer]")) {
    const { field, ms } = liveTimer(node.dataset.liveTimer);
    node.textContent = formatClock(ms, field.format, field.direction);
  }
}, 100);

/* Controles de estilo */
function rangeMarkup(key, label, format) {
  const { min, max, step } = STYLE_RANGES[key];
  const value = editing.graphic.style[key];
  return `<label class="range"><span class="range-head">${label}<output data-out="${key}">${FORMAT[format](value)}</output></span><input type="range" data-key="${key}" data-format="${format}" min="${min}" max="${max}" step="${step}" value="${value}" style="--p:${((value - min) / (max - min)) * 100}%"></label>`;
}
function toggleMarkup(key, label, hint, checked = editing.graphic.style[key]) {
  return `<label class="toggle"><span><strong>${label}</strong>${hint ? `<small>${hint}</small>` : ""}</span><input type="checkbox" data-key="${key}" ${checked ? "checked" : ""}></label>`;
}
const subtitle = (text, note = "") => `<div class="sub">${text}${note ? `<small>${note}</small>` : ""}</div>`;

function positionMarkup() {
  const movable = MOVABLE_TEMPLATES.includes(editing.graphic.templateId);
  const quick = movable
    ? subtitle("Posiciones rápidas") + `<div class="quick-grid" role="group" aria-label="Posiciones rápidas">${QUICK_POSITIONS.map(pos => `<button type="button" data-quick="${pos.id}" title="${pos.label}" aria-label="${pos.label}" aria-pressed="false"><i></i></button>`).join("")}</div>`
    : `<p class="hint">Este tipo tiene su lugar fijo, pero igual puedes arrastrarlo en la pantalla o ajustar los valores.</p>`;
  return quick + rangeMarkup("scale", "Tamaño", "pct") + rangeMarkup("x", "Mover a los lados", "px") + rangeMarkup("y", "Mover arriba / abajo", "px")
    + `<button type="button" class="button subtle" data-cmd="reset-position">${icon("rotate-ccw")}Volver a la posición inicial</button>`;
}

function lookMarkup() {
  const style = editing.graphic.style;
  const skins = DESIGN_PRESETS.map(preset => `<label class="card"><input type="radio" name="skin" data-key="skin" value="${preset.id}" ${style.skin === preset.id ? "checked" : ""}><span class="swatch sw-${preset.id}" aria-hidden="true"><i></i></span><strong>${preset.name}</strong><small>${preset.note}</small></label>`).join("");
  const palettes = COLOR_PRESETS.map(preset => `<button type="button" class="palette" data-palette="${preset.id}" aria-pressed="false" title="${escapeHtml(preset.note || preset.name)}"><span><i style="background:${preset.background}"></i><i style="background:${preset.accent}"></i><i style="background:${preset.accent2}"></i></span><em>${preset.name}</em></button>`).join("");
  const colors = [["accent", "Color principal"], ["accent2", "Color secundario"], ["background", "Fondo"], ["text", "Texto"]]
    .map(([key, label]) => colorControl(key, style[key], label)).join("");
  return subtitle("Colores listos") + `<div class="palettes">${palettes}</div>`
    + subtitle("Colores a tu gusto") + `<div class="colors">${colors}</div>`
    + subtitle("Acabado") + `<div class="cards">${skins}</div>`
    + rangeMarkup("opacity", "Opacidad del fondo", "pct") + rangeMarkup("radius", "Esquinas redondeadas", "px") + rangeMarkup("shadow", "Sombra", "pct") + rangeMarkup("grain", "Textura", "pct")
    + toggleMarkup("shine", "Brillo al entrar", "Un reflejo de luz cruza el gráfico");
}

function fontMarkup() {
  const fonts = FONT_PRESETS.map(font => `<label class="card"><input type="radio" name="font" data-key="font" value="${font.id}" ${editing.graphic.style.font === font.id ? "checked" : ""}><span class="font-sample" style="font-family:${font.family}">Aa Ññ</span><strong>${font.name}</strong><small>${font.note}</small></label>`).join("");
  return `<div class="cards">${fonts}</div>` + rangeMarkup("primaryWeight", "Grosor del texto principal", "weight") + rangeMarkup("primaryFont", "Tamaño del texto principal", "pct") + rangeMarkup("secondaryFont", "Tamaño del texto secundario", "pct")
    + toggleMarkup("uppercaseLabels", "Etiquetas en MAYÚSCULAS", "Ej.: EN VIVO, NACIONAL");
}

function motionMarkup() {
  const animations = ANIMATION_PRESETS.map(preset => `<label class="card"><input type="radio" name="animation" data-key="animation" value="${preset.id}" ${editing.graphic.style.animation === preset.id ? "checked" : ""}><strong>${preset.name}</strong><small>${preset.note}</small></label>`).join("");
  return `<div class="cards">${animations}</div><button type="button" class="button subtle" data-cmd="replay">${icon("play")}Ver cómo entra</button>`
    + rangeMarkup("speed", "Velocidad", "times") + rangeMarkup("autoOut", "Ocultar solo después de", "seconds")
    + (editing.graphic.templateId === "ticker" ? rangeMarkup("tickerSpeed", "Velocidad de la cinta", "pxs") : "");
}

function logoMarkup() {
  const style = editing.graphic.style;
  const preview = style.logoSource === "custom" ? (assetUrl(style.logoAsset) || `/brand-logo?v=${style.logoRevision}`) : "/logo.svg";
  return subtitle("Escudos de equipos", "Se aplica a este gráfico") + rangeMarkup("teamLogoScale", "Tamaño de los escudos", "pct")
    + subtitle("Logo del canal") + `<div class="channel-logo-preview"><img src="${preview}" alt="Vista previa del logo del canal"></div>`
    + toggleMarkup("brand", "Logo del canal dentro del gráfico", "En el rótulo de nombre, la cinta y la mosca")
    + toggleMarkup("logoEnabled", "Logo adicional en una esquina", "Aparece junto con este gráfico")
    + `<select class="select" data-key="logoSource" aria-label="Qué logo"><option value="default" ${style.logoSource === "default" ? "selected" : ""}>Logo de Pulso CG</option><option value="custom" ${style.logoSource === "custom" ? "selected" : ""} ${customLogoExists || style.logoAsset ? "" : "disabled"}>Mi logo</option></select>`
    + subtitle("Esquina") + `<div class="seg">${[["top-left", "Arriba izq."], ["top-right", "Arriba der."], ["bottom-left", "Abajo izq."], ["bottom-right", "Abajo der."]].map(([value, text]) => `<button type="button" data-seg="logoPosition" data-value="${value}" aria-pressed="${style.logoPosition === value}">${text}</button>`).join("")}</div>`
    + rangeMarkup("logoScale", "Tamaño del logo", "pct")
    + `<label class="upload">${icon("upload")}<span id="logoUploadStatus">${customLogoExists || style.logoAsset ? "Cambiar mi logo" : "Subir mi logo (PNG, JPG o WebP)"}</span><input id="logoUpload" type="file" accept="image/png,image/jpeg,image/webp"></label>`;
}

function presetsMarkup() {
  const presets = (currentState?.presets ?? []).map(preset => `<div class="preset"><button type="button" class="apply" data-preset="${preset.id}"><span class="dots"><i style="background:${preset.style.background}"></i><i style="background:${preset.style.accent}"></i><i style="background:${preset.style.text}"></i></span>${escapeHtml(preset.name)}</button><button type="button" class="icon-button remove" data-preset-delete="${preset.id}" aria-label="Borrar estilo ${escapeHtml(preset.name)}">${icon("x")}</button></div>`).join("");
  return `<p class="hint">Guarda colores, acabado, letra y animación para reutilizarlos en otros gráficos.</p><div class="save-row"><input class="input" id="presetName" maxlength="32" placeholder="Nombre, p. ej. Noticiero"><button type="button" class="button" data-cmd="save-preset">${icon("save")}Guardar</button></div>${presets ? `<div class="preset-list">${presets}</div>` : ""}<button type="button" class="button subtle" data-cmd="apply-all">${icon("layers")}Usar este estilo en todos mis gráficos</button>`;
}

function syncSwatches() {
  const style = editing.graphic.style;
  editor.style.setProperty("--sw-bg", rgbTriplet(style.background));
  editor.style.setProperty("--sw-fg", rgbTriplet(style.text));
  editor.style.setProperty("--sw-acc", style.accent);
}
function syncPaletteSelection() {
  for (const button of editor.querySelectorAll("[data-palette]")) {
    const preset = COLOR_PRESETS.find(item => item.id === button.dataset.palette);
    button.setAttribute("aria-pressed", String(["accent", "accent2", "background", "text"].every(key => preset[key] === editing.graphic.style[key])));
  }
  refreshQuick();
}
function setRange(key, value) {
  const input = editor.querySelector(`input[type=range][data-key="${key}"]`);
  if (!input) return;
  const { min, max } = STYLE_RANGES[key];
  input.value = value;
  input.style.setProperty("--p", `${((value - min) / (max - min)) * 100}%`);
  editor.querySelector(`[data-out="${key}"]`).textContent = FORMAT[input.dataset.format](value);
}
function refreshQuick() {
  const { align, x, y } = editing.graphic.style;
  for (const button of editor.querySelectorAll("[data-quick]")) {
    const pos = QUICK_POSITIONS.find(item => item.id === button.dataset.quick);
    button.setAttribute("aria-pressed", String(pos.align === align && pos.y === y && x === 0));
  }
}

/* Eventos del editor */
editor.addEventListener("input", event => {
  if (!editing) return;
  const input = event.target;
  if (input.dataset.colorPicker) {
    const target = input.dataset.colorKind === "field" ? editing.graphic.fields : editing.graphic.style;
    target[input.dataset.colorPicker] = input.value;
    input.parentElement.querySelector('.color-hex').value = input.value;
    syncSwatches();
    changed();
    return;
  }
  if (input.dataset.colorValue !== undefined && !/^#[0-9a-f]{6}$/i.test(input.value)) {
    drafts.set(editing.id, clone(editing.graphic)); storeDrafts(); updateSaveControls("Color incompleto · usa # y seis caracteres"); return;
  }
  if (input.dataset.field === "history") return;
  if (input.dataset.field) {
    if (input.dataset.colorValue !== undefined && !/^#[0-9a-f]{6}$/i.test(input.value)) return;
    editing.graphic.fields[input.dataset.field] = input.dataset.colorValue !== undefined ? input.value.toLowerCase() : input.value;
    if (input.list?.id === "rosterList") fillFromRoster(input);
    updateCounters();
    return changed({ delay: input.tagName === "SELECT" || input.dataset.colorValue !== undefined ? 0 : 700 });
  }
  const key = input.dataset.key;
  if (!key) return;
  if (key.startsWith("field:")) { editing.graphic.fields[key.slice(6)] = input.checked; return changed(); }
  const style = editing.graphic.style;
  if (input.type === "range") { style[key] = Number(input.value); setRange(key, style[key]); refreshQuick(); }
  else if (input.type === "checkbox") style[key] = input.checked;
  else if (input.type === "radio") style[key] = input.value;
  else if (input.dataset.colorValue !== undefined) { if (!/^#[0-9a-f]{6}$/i.test(input.value)) return; style[key] = input.value.toLowerCase(); syncSwatches(); syncPaletteSelection(); }
  else return;
  changed();
});
editor.addEventListener("change", event => {
  if (event.target.id === "logoUpload") uploadLogo(event);
  else if (event.target.dataset.key === "logoSource") { editing.graphic.style.logoSource = event.target.value; changed(); }
});
editor.addEventListener("toggle", event => {
  const id = event.target.dataset?.section;
  if (!id) return;
  if (event.target.open) openSections.add(id); else openSections.delete(id);
}, true);
editor.addEventListener("change", event => {
  if (!editing || event.target.dataset.field !== "history") return;
  const candidate = { ...editing.graphic.fields, history: event.target.value };
  const normalized = normalizeVolley(candidate);
  const entered = event.target.value.trim().split(/[\s,;]+/).filter(Boolean).join(" ");
  if (entered !== normalized.history) {
    toast("Parciales inválidos: revisa puntos, ventaja y cantidad de sets del partido.");
    event.target.value = editing.graphic.fields.history;
    return;
  }
  Object.assign(editing.graphic.fields, normalized);
  rerenderMatch();
  changed({ delay: 0 });
});
editor.addEventListener("keydown", event => { if (event.target.id === "presetName" && event.key === "Enter") { event.preventDefault(); editor.querySelector('[data-cmd="save-preset"]').click(); } });

editor.addEventListener("click", async event => {
  const target = event.target.closest("button");
  if (!target || !editing) return;
  const style = editing.graphic.style;
  const cmd = target.dataset.cmd;
  if (cmd === "save-changes") return save();
  if (cmd === "discard-changes") return discardChanges();
  if (target.dataset.quick) {
    const pos = QUICK_POSITIONS.find(item => item.id === target.dataset.quick);
    Object.assign(style, { align: pos.align, y: pos.y, x: 0 });
    setRange("x", 0); setRange("y", pos.y); refreshQuick();
    changed({ delay: 0 });
  } else if (target.dataset.palette) {
    const preset = COLOR_PRESETS.find(item => item.id === target.dataset.palette);
    for (const key of ["accent", "accent2", "background", "text"]) style[key] = preset[key];
    renderEditor();
    changed();
  } else if (target.dataset.seg) {
    style[target.dataset.seg] = target.dataset.value;
    for (const button of editor.querySelectorAll(`[data-seg="${target.dataset.seg}"]`)) button.setAttribute("aria-pressed", String(button === target));
    changed();
  } else if (target.dataset.preset) {
    const preset = currentState.presets.find(item => item.id === target.dataset.preset);
    if (!preset) return;
    Object.assign(style, preset.style);
    renderEditor();
    changed();
    toast(`Estilo “${preset.name}” aplicado`);
  } else if (target.dataset.presetDelete) {
    await action("preset_delete", { id: target.dataset.presetDelete });
  } else if (cmd === "toggle") toggleVisible(editing.id);
  else if (cmd === "duplicate") {
    if (hasChanges()) { toast("Guarda los cambios antes de duplicar."); return; }
    const result = await action("item_duplicate", { id: editing.id });
    if (result?.lastAdded) { selectItem(result.lastAdded); toast("Copia creada justo encima. Cambia el texto y muéstrala."); }
  } else if (cmd === "delete") {
    const visible = isVisible(itemById(editing.id));
    if (!confirm(`¿Eliminar “${graphicTitle(editing.graphic)}”?${visible ? " Se quitará de la pantalla." : ""}`)) return;
    drafts.delete(editing.id); storeDrafts();
    const id = editing.id;
    editing = null; selectedId = null;
    await action("item_delete", { id });
    if (!currentState.items.length) renderEditor();
  } else if (cmd === "reset-position") {
    Object.assign(style, { x: 0, y: 0, scale: 1, align: "left" });
    renderEditor();
    changed({ delay: 0 });
  } else if (cmd === "save-text") {
    if (await action("library_save", { templateId: editing.graphic.templateId, fields: editing.graphic.fields })) toast("Texto guardado en Guardados");
  } else if (cmd === "replay") {
    send({ type: "pulso-replay", id: editing.id });
  } else if (cmd === "save-preset") {
    const name = $("#presetName").value.trim();
    if (!name) { $("#presetName").focus(); return; }
    if (await action("preset_save", { name, style })) toast(`Estilo “${name}” guardado`);
  } else if (cmd === "apply-all") {
    if (hasChanges()) { toast("Guarda los cambios antes de aplicar el estilo a todos los gráficos."); return; }
      if (await action("apply_look_all", { style })) toast("Estilo aplicado a todos tus gráficos");
  }
});

async function uploadLogo(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const status = $("#logoUploadStatus");
  const draftId = editing.id;
  const draftGraphic = editing.graphic;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2_000_000) {
    status.textContent = "Usa PNG, JPG o WebP de máximo 2 MB.";
    return;
  }
  status.textContent = "Subiendo…";
  pendingUploads++; updateSaveControls();
  try {
    const response = await fetch("/api/asset", { method: "POST", headers: { "Content-Type": file.type }, body: file });
    if (!response.ok) throw new Error("upload_failed");
    const result = await response.json();
    Object.assign(draftGraphic.style, { logoEnabled: true, logoSource: "custom", logoAsset: result.id });
    if (editing?.id !== draftId) { drafts.set(draftId, clone(draftGraphic)); storeDrafts(); toast("Logo preparado en el borrador del gráfico."); return; }
    renderEditor();
    changed({ delay: 0 });
    toast("Logo preparado. Pulsa Guardar cambios para aplicarlo.");
  } catch {
    status.textContent = "No se pudo cargar el logo.";
  } finally { pendingUploads--; updateSaveControls(); }
}

/* ── Estado del servidor ────────────────────────────────────────────── */
// Indicador de OBS/vMix: cuántas salidas están conectadas en este momento.
function renderObsStatus(server) {
  if (!server) return;
  const connected = server.outputs > 0;
  const pill = $("#obsStatus");
  pill.classList.toggle("ok", connected);
  pill.querySelector("span").textContent = connected ? (server.outputs === 1 ? "1 salida conectada" : `${server.outputs} salidas conectadas`) : "OBS sin conectar";
  const links = connectionLinks(server, location.origin);
  const local = links.output;
  for (const node of document.querySelectorAll('[data-copy-url="local"]')) node.textContent = local;
  for (const node of document.querySelectorAll('[data-copy-url="test"]')) node.textContent = local.replace("/output", "/test-obs");
  $("#obsState").innerHTML = connected
    ? `<div class="status live ok"><i></i><span><b>Conectado</b><small>Una fuente de navegador está recibiendo los gráficos.</small></span></div>`
    : `<div class="status warn"><i></i><span><b>Ninguna salida conectada</b><small>Sigue los pasos de abajo. Si ya tienes la fuente creada, pulsa <b>Actualizar</b> en OBS.</small></span></div>`;
  const activity = server.activity ?? [];
  const when = iso => new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(iso));
  $("#obsActivity").innerHTML = activity.length
    ? activity.map(entry => `<li class="${entry.kind}"><b>${when(entry.time)}</b> ${escapeHtml(entry.who)} — ${escapeHtml(entry.detail)}</li>`).join("")
    : `<li>Ninguna salida ha abierto la página desde que se inició el programa. Si OBS ya tiene la fuente, pulsa <b>Actualizar</b>.</li>`;
  const lanMarkup = links.endpoints.length
    ? `<h3>OBS en otra computadora de la misma red</h3><p class="muted small">Copia una dirección del equipo donde está abierto Pulso CG. Ambos equipos deben estar conectados a la misma red.</p>${links.endpoints.map((entry, i) => `<div class="network-link"><b>${escapeHtml(entry.name)}${i === 0 ? " · primera opción" : ""}${entry.virtual ? " · adaptador virtual/VPN" : ""}</b><code class="copy" data-copy="${escapeHtml(entry.output)}">${escapeHtml(entry.output)}</code><div class="network-actions"><button type="button" class="button small-btn copy" data-copy="${escapeHtml(entry.output)}">Copiar para OBS</button><a class="button small-btn" href="${escapeHtml(entry.test)}" target="_blank" rel="noreferrer">Abrir prueba</a></div><a href="${escapeHtml(entry.panel)}" target="_blank" rel="noreferrer" class="small">Panel para manejar gráficos desde otra PC</a>${entry.linkLocal ? `<small>Dirección automática: comprueba que los equipos tengan conexión al router.</small>` : ""}</div>`).join("")}<p class="muted small">En la otra PC, abre primero el enlace terminado en <b>/test-obs</b>. Cuando indique conexión, usa <b>/output</b> en OBS o vMix.</p>`
    : `<h3>Otra computadora</h3><p class="muted small">No se detectó una dirección IPv4 de red. Conecta el equipo emisor al Wi-Fi o Ethernet del router.</p>`;
  if (renderedNetworkLinks !== lanMarkup) { $("#lanBox").innerHTML = lanMarkup; renderedNetworkLinks = lanMarkup; }
}

function renderState(state) {
  // El programa se actualizó y reinició: recargar el panel con la versión nueva.
  if (state.server?.boot) {
    if (bootId && bootId !== state.server.boot) { location.reload(); return; }
    bootId = state.server.boot;
  }
  renderObsStatus(state.server);
  if (state.server?.dataDir) $("#dataPath").textContent = `Todo se guarda automáticamente en: ${state.server.dataDir}`;
  renderSimulation(state.server?.simulation);
  if (state.server?.now) serverOffset = state.server.now - Date.now();
  const presetsBefore = JSON.stringify(currentState?.presets ?? null);
  currentState = state;
  if (selectedId && !itemById(selectedId)) { selectedId = null; editing = null; }
  if (!selectedId && state.items.length) {
    selectItem(state.items.at(-1).id);
    renderLibrary();
    renderProfiles();
    return;
  }
  // Si otro equipo cambió este gráfico y aquí no hay cambios pendientes, se recarga.
  const item = itemById(selectedId);
  if (item && editing && !hasChanges() && !saving && !editor.contains(document.activeElement) && JSON.stringify(cleanGraphic(item.graphic)) !== JSON.stringify(editing.graphic)) {
    editing.graphic = clone(cleanGraphic(item.graphic));
    renderEditor();
  } else if (editing && presetsBefore !== JSON.stringify(state.presets)) {
    const box = editor.querySelector('[data-section="presets"] .section-body');
    if (box) { box.innerHTML = presetsMarkup(); refreshIcons(); }
  }
  renderList();
  renderLibrary();
  renderProfiles();
  renderStatus();
  if (!editing) renderEditor();
}

/* ── Guardados (biblioteca de textos del perfil) ─────────────────────── */
const normalize = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const groupOf = templateId => LIBRARY_GROUPS.find(group => group.templates.includes(templateId));
const SUBTITLE_FIELD = { "lower-third": "role", headline: "kicker", breaking: "label", location: "reporter", "single-line": "context", quote: "source", upcoming: "time", fullscreen: "summary", ticker: "label", bug: "status" };

function entryTitle(entry) { return graphicTitle({ templateId: entry.templateId, fields: entry.fields }); }

function renderLibrary() {
  const library = currentState.library ?? [];
  $("#libraryCount").textContent = library.length ? String(library.length) : "";
  const counts = Object.fromEntries(LIBRARY_GROUPS.map(group => [group.id, library.filter(entry => group.templates.includes(entry.templateId)).length]));
  $("#libraryFolders").innerHTML = [{ id: "all", name: "Todo" }, ...LIBRARY_GROUPS].filter(group => group.id === "all" || counts[group.id]).map(group =>
    `<button type="button" data-folder="${group.id}" aria-pressed="${libraryFolder === group.id}">${icon(group.id === "all" ? "folders" : "folder")}${group.name}<b>${group.id === "all" ? library.length : counts[group.id]}</b></button>`).join("");
  const query = normalize(librarySearch.trim());
  const visible = [...library].reverse().filter(entry => {
    if (libraryFolder !== "all" && groupOf(entry.templateId)?.id !== libraryFolder) return false;
    return !query || normalize(Object.values(entry.fields).join(" ")).includes(query);
  });
  const row = entry => {
    const title = escapeHtml(entryTitle(entry));
    const sub = escapeHtml(entry.fields[SUBTITLE_FIELD[entry.templateId]] || TEMPLATES[entry.templateId].name);
    return `<li class="saved"><button type="button" class="saved-main" data-use="${entry.id}" title="Cargar en el gráfico elegido"><strong>${title}</strong><small>${sub}</small></button><button type="button" class="eye" data-use-show="${entry.id}" title="Mostrar “${title}” ahora">${icon("eye")}</button><button type="button" class="icon-button forget" data-forget="${entry.id}" aria-label="Quitar “${title}” de Guardados">${icon("x")}</button></li>`;
  };
  let html = "";
  if (libraryFolder === "all" && !query) {
    for (const group of LIBRARY_GROUPS) {
      const entries = visible.filter(entry => group.templates.includes(entry.templateId));
      if (entries.length) html += `<li class="saved-group">${group.name}</li>${entries.map(row).join("")}`;
    }
  } else html = visible.map(row).join("");
  $("#libraryList").innerHTML = html || `<li class="saved-empty">${library.length ? "No hay resultados." : "Aún no hay nada guardado. Todo lo que muestres en pantalla aparecerá aquí, o pega una lista con el botón de arriba."}</li>`;
  refreshIcons();
}

// Carga textos en el borrador; Guardar cambios confirma la edición.
async function useEntry(id, { show = false } = {}) {
  const entry = currentState.library.find(item => item.id === id);
  if (!entry) return;
  const template = TEMPLATES[entry.templateId];
  if (editing && editing.graphic.templateId === entry.templateId) {
    for (const field of template.fields) {
      if (field.type === "checkbox") continue;
      const value = entry.fields[field.id] ?? "";
      // Las etiquetas cortas vacías (EN VIVO, categoría…) conservan la actual.
      if (value || field.width !== "short") editing.graphic.fields[field.id] = value;
    }
    renderEditor();
    changed();
    toast(show ? "Cargado" : `Cargado en “${template.name}”`);
  } else {
      const fields = Object.fromEntries(Object.entries(entry.fields).filter(([key, value]) => value || !template.fields.find(field => field.id === key)?.width));
    const result = await action("item_add", { templateId: entry.templateId, fields });
    if (!result?.lastAdded) return;
    selectItem(result.lastAdded);
    toast(`Nuevo gráfico “${template.name}” creado con ese texto`);
  }
  if (show && !isVisible(itemById(editing.id))) toggleVisible(editing.id);
}

document.querySelector(".list-tabs").addEventListener("click", event => {
  const tab = event.target.closest("[data-list-tab]");
  if (!tab) return;
  for (const button of document.querySelectorAll("[data-list-tab]")) button.setAttribute("aria-selected", String(button === tab));
  for (const view of document.querySelectorAll("[data-list-view]")) view.hidden = view.dataset.listView !== tab.dataset.listTab;
  if (tab.dataset.listTab === "library") $("#librarySearch").focus();
});
$("#librarySearch").addEventListener("input", event => { librarySearch = event.target.value; renderLibrary(); });
$("#libraryFolders").addEventListener("click", event => {
  const button = event.target.closest("[data-folder]");
  if (!button) return;
  libraryFolder = button.dataset.folder;
  renderLibrary();
});
$("#libraryList").addEventListener("click", async event => {
  const use = event.target.closest("[data-use]"), show = event.target.closest("[data-use-show]"), forget = event.target.closest("[data-forget]");
  if (use) useEntry(use.dataset.use);
  if (show) useEntry(show.dataset.useShow, { show: true });
  if (forget) await action("library_delete", { id: forget.dataset.forget });
});

// Pegar una lista: una línea por nombre o titular.
const IMPORT_EXAMPLES = {
  "lower-third": "Ana Ruiz | Alcaldesa de Tulcán\nCarlos Mena | Economista\nLucía Paz | Corresponsal",
  headline: "Asamblea aprueba la reforma | NACIONAL\nInicia la feria agrícola | LOCAL",
  breaking: "Se registra un sismo en la zona norte",
  location: "Tulcán, Carchi | Reporte de Camila Andrade",
  "single-line": "Palacio de Gobierno | QUITO",
  quote: "La educación es la prioridad | Ministra de Educación"
};
$("#importType").innerHTML = TEMPLATE_ORDER.map(id => `<option value="${id}">${TEMPLATES[id].name}</option>`).join("");
function updateImportHelp() {
  const templateId = $("#importType").value;
  const labels = IMPORT_FIELDS[templateId].map(key => TEMPLATES[templateId].fields.find(field => field.id === key).label);
  $("#importHelp").textContent = `Una línea por cada uno. Separa las partes con | así: ${labels.join(" | ")}`;
  $("#importText").placeholder = IMPORT_EXAMPLES[templateId] ?? labels.join(" | ");
}
$("#importType").addEventListener("change", updateImportHelp);
$("#importButton").addEventListener("click", () => {
  const folder = LIBRARY_GROUPS.find(group => group.id === libraryFolder);
  $("#importType").value = editing?.graphic.templateId && !folder ? editing.graphic.templateId : folder?.templates[0] ?? "lower-third";
  updateImportHelp();
  $("#importError").textContent = "";
  $("#importDialog").showModal();
  $("#importText").focus();
});
$("#importForm").addEventListener("submit", async event => {
  event.preventDefault();
  const response = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "library_import", templateId: $("#importType").value, text: $("#importText").value }) });
  const result = await response.json();
  if (!response.ok) { $("#importError").textContent = result.errors?.import ?? "No se pudo guardar la lista."; return; }
  $("#importDialog").close();
  $("#importText").value = "";
  libraryFolder = LIBRARY_GROUPS.find(group => group.templates.includes($("#importType").value))?.id ?? "all";
  renderState(result);
  toast(`${result.imported} ${result.imported === 1 ? "elemento guardado" : "elementos guardados"}`);
});

/* ── Perfiles ───────────────────────────────────────────────────────── */
function renderProfiles() {
  const active = currentState.profiles.find(profile => profile.id === currentState.activeProfile);
  $("#profileName").textContent = active?.name ?? "";
  $("#profileList").innerHTML = currentState.profiles.map(profile => {
    const isActive = profile.id === currentState.activeProfile;
    return `<li class="profile ${isActive ? "active" : ""}"><span class="thumb">${icon(isActive ? "folder-open" : "folder")}</span><div><strong>${escapeHtml(profile.name)}</strong><small>${profile.itemCount} ${profile.itemCount === 1 ? "gráfico" : "gráficos"} · ${profile.libraryCount} guardados</small></div>
      ${isActive ? `<span class="badge">En uso</span>` : `<button type="button" class="button" data-profile-use="${profile.id}">Usar</button>`}
      <button type="button" class="icon-button" data-profile-rename="${profile.id}" title="Cambiar nombre">${icon("pencil")}</button>
      <a class="icon-button" href="/api/export?profile=${profile.id}" download title="Descargar copia de seguridad">${icon("download")}</a>
      <button type="button" class="icon-button danger" data-profile-delete="${profile.id}" title="Eliminar perfil" ${currentState.profiles.length === 1 ? "disabled" : ""}>${icon("trash-2")}</button></li>`;
  }).join("");
  refreshIcons();
}

function confirmLeaveScreen() {
  const visible = currentState.items.filter(isVisible).length;
  return !visible || confirm(`Hay ${visible} ${visible === 1 ? "gráfico" : "gráficos"} en pantalla. Al cambiar de perfil se ocultarán (no se borra nada). ¿Continuar?`);
}
async function afterProfileChange(message) {
  selectedId = null; editing = null;
  libraryFolder = "all";
  if (currentState.items.length) selectItem(currentState.items.at(-1).id); else renderEditor();
  toast(message);
}

$("#profileButton").addEventListener("click", () => $("#profileDialog").showModal());

/* ── Ensayos en tiempo real ─────────────────────────────────────────── */
$("#simButtons").innerHTML = PROFILE_PRESETS.map(preset => `<button type="button" class="button" data-simulate="${preset.id}">${icon("play")}${preset.name}</button>`).join("");
$("#simButtons").addEventListener("click", async event => {
  const button = event.target.closest("[data-simulate]");
  if (!button || !confirmLeaveScreen()) return;
  const response = await fetch("/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preset: button.dataset.simulate, speed: 1 }) });
  if (!response.ok) { toast("No se pudo iniciar el ensayo."); return; }
  $("#profileDialog").close();
  renderState(await response.json());
  afterProfileChange("Ensayo iniciado: mira la pantalla y OBS");
});
$("#simStop").addEventListener("click", async () => {
  await fetch("/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stop: true }) });
  toast("Ensayo detenido");
});
function renderSimulation(sim) {
  $("#simBanner").hidden = !sim;
  if (sim) $("#simText").textContent = `Ensayo ${sim.name.replace("Ensayo · ", "")}: ${sim.label} (${Math.min(sim.index + 1, sim.total)}/${sim.total})`;
}
$("#profilePresets").innerHTML = PROFILE_PRESETS.map(preset => `<button type="button" class="preset-card" data-profile-preset="${preset.id}"><span class="thumb">${icon(preset.icon)}</span><span><strong>${preset.name}</strong><small>${preset.note}</small></span></button>`).join("");
$("#profilePresets").addEventListener("click", async event => {
  const button = event.target.closest("[data-profile-preset]");
  if (!button || !confirmLeaveScreen()) return;
  const preset = PROFILE_PRESETS.find(item => item.id === button.dataset.profilePreset);
  if (await action("profile_create_preset", { preset: preset.id })) {
    $("#profileDialog").close();
    afterProfileChange(`Perfil “${preset.name}” creado con ${preset.items.length} gráficos listos`);
  }
});
$("#profileList").addEventListener("click", async event => {
  const use = event.target.closest("[data-profile-use]"), rename = event.target.closest("[data-profile-rename]"), remove = event.target.closest("[data-profile-delete]");
  if (use) {
    if (!confirmLeaveScreen()) return;
      if (await action("profile_switch", { id: use.dataset.profileUse })) { $("#profileDialog").close(); afterProfileChange(`Perfil “${$("#profileName").textContent}” cargado`); }
  }
  if (rename) {
    const profile = currentState.profiles.find(item => item.id === rename.dataset.profileRename);
    const name = prompt("Nuevo nombre del perfil:", profile.name);
    if (name?.trim()) await action("profile_rename", { id: profile.id, name });
  }
  if (remove) {
    const profile = currentState.profiles.find(item => item.id === remove.dataset.profileDelete);
    if (!confirm(`¿Eliminar el perfil “${profile.name}” con sus ${profile.itemCount} gráficos y ${profile.libraryCount} guardados? Esto no se puede deshacer. Si quieres conservarlo, descarga antes su copia de seguridad.`)) return;
    const wasActive = profile.id === currentState.activeProfile;
    if (await action("profile_delete", { id: profile.id }) && wasActive) afterProfileChange("Perfil eliminado");
  }
});
$("#profileForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!confirmLeaveScreen()) return;
  const name = $("#profileNewName").value.trim();
  if (await action("profile_create", { name, copy: $("#profileNewMode").value === "copy" })) {
    $("#profileNewName").value = "";
    $("#profileDialog").close();
    afterProfileChange(`Perfil “${name}” creado`);
  }
});
$("#profileImport").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const profiles = data.format === "pulso-cg-backup" ? data.profiles : data.format === "pulso-cg-profile" ? [data] : null;
    if (!profiles?.length) throw new Error("format");
    if (!confirmLeaveScreen()) return;
    // Se agregan como perfiles nuevos: nunca reemplazan los que ya existen.
    let imported = 0;
    for (const profile of profiles) if (await action("profile_import", { name: profile.name, data: profile }, { quiet: true })) imported++;
    if (data.channelLogo?.data) {
      const bytes = Uint8Array.from(atob(data.channelLogo.data), char => char.charCodeAt(0));
      await fetch("/api/logo", { method: "POST", headers: { "Content-Type": data.channelLogo.mime }, body: bytes }).catch(() => {});
    }
    $("#profileDialog").close();
    afterProfileChange(`${imported} ${imported === 1 ? "perfil importado" : "perfiles importados"}`);
  } catch {
    toast("Ese archivo no es una copia de seguridad de Pulso CG.");
  }
});

/* ── Pantalla (iframe editable) ─────────────────────────────────────── */
function postScreenPrefs() {
  send({ type: "pulso-backdrop", mode: prefs.backdrop, image: prefs.backdrop === "image" ? prefs.image : null });
  send({ type: "pulso-guides", visible: prefs.guides });
  send({ type: "pulso-select", id: selectedId });
  for (const button of document.querySelectorAll("[data-backdrop]")) button.setAttribute("aria-pressed", String(button.dataset.backdrop === prefs.backdrop));
  $("#guidesButton").setAttribute("aria-pressed", String(prefs.guides));
}

addEventListener("message", event => {
  if (event.origin !== location.origin) return;
  const data = event.data ?? {};
  if (data.type === "pulso-frame-ready") {
    postScreenPrefs();
    for (const item of currentState?.items ?? []) if (drafts.has(item.id)) send({ type: "pulso-local", id: item.id, graphic: drafts.get(item.id) });
  }
  if (data.type === "pulso-select" && data.id) selectItem(data.id);
  if ((data.type === "pulso-move" || data.type === "pulso-move-end") && editing?.id === data.id) {
    Object.assign(editing.graphic.style, { x: data.x, y: data.y, scale: data.scale });
    setRange("x", data.x); setRange("y", data.y); setRange("scale", data.scale);
    refreshQuick();
    changed();
  }
});

$("#backdropPicker").addEventListener("click", event => {
  const button = event.target.closest("[data-backdrop]");
  if (!button) return;
  prefs.backdrop = button.dataset.backdrop;
  savePrefs();
  postScreenPrefs();
});
$("#backdropUpload").addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 3_000_000) { toast("Usa PNG, JPG o WebP de máximo 3 MB."); return; }
  fetch("/api/asset", { method: "POST", headers: { "Content-Type": file.type }, body: file })
    .then(response => response.json())
    .then(({ id }) => { prefs.image = `/assets/${id}`; prefs.backdrop = "image"; savePrefs(); postScreenPrefs(); toast("Fondo de prueba guardado"); })
    .catch(() => toast("No se pudo guardar la imagen de fondo."));
});
$("#guidesButton").addEventListener("click", () => { prefs.guides = !prefs.guides; savePrefs(); postScreenPrefs(); });

/* ── Barra superior y atajos ────────────────────────────────────────── */
$("#addButton").addEventListener("click", openTemplates);
document.addEventListener("click", event => { if (event.target.closest("[data-add]")) openTemplates(); });
$("#helpButton").addEventListener("click", () => $("#helpDialog").showModal());
$("#hideAllButton").addEventListener("click", async () => { if (await action("hide_all")) toast("Se ocultaron todos los gráficos"); });
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast(`Copiado: ${text}`); }
  catch { prompt("Copia este enlace:", text); }
}
$("#obsButton").addEventListener("click", () => $("#obsDialog").showModal());
$("#obsStatus").addEventListener("click", () => $("#obsDialog").showModal());
$("#obsDialog").addEventListener("click", event => {
  const code = event.target.closest(".copy");
  if (code) copyText(code.dataset.copy ?? code.textContent);
});

document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && editing) { event.preventDefault(); toggleVisible(editing.id); return; }
  if (!editing || isTyping(event.target) || document.querySelector("dialog[open]")) return;
  const step = event.shiftKey ? 10 : 1;
  const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
  if (!delta) return;
  event.preventDefault();
  const style = editing.graphic.style;
  style.x = Math.min(STYLE_RANGES.x.max, Math.max(STYLE_RANGES.x.min, style.x + delta[0]));
  style.y = Math.min(STYLE_RANGES.y.max, Math.max(STYLE_RANGES.y.min, style.y + delta[1]));
  setRange("x", style.x); setRange("y", style.y); refreshQuick();
  changed({ delay: 300 });
});

/* ── Arranque ───────────────────────────────────────────────────────── */
buildTemplates();
refreshIcons();
renderEditor();
fetch("/api/logo").then(response => response.json()).then(meta => { customLogoExists = Boolean(meta.exists); }).catch(() => {});
fetch("/api/state").then(response => response.json()).then(renderState);
const events = new EventSource("/events");
events.addEventListener("open", () => { document.body.classList.add("connected"); $("#connectionText").textContent = "Conectado"; });
events.addEventListener("state", event => renderState(JSON.parse(event.data)));
events.onerror = () => { document.body.classList.remove("connected"); $("#connectionText").textContent = "Reconectando…"; };

setupUpdateUI();
fetch('/api/health', { cache: 'no-store' }).then(response => response.json()).then(info => {
  if (info.application !== 'pulso-cg' || !info.version) return;
  document.querySelector('#appVersion').textContent = `v${info.version}`;
  document.title = `Pulso CG ${info.version}`;
}).catch(() => {});
