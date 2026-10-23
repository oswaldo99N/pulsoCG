import { assetUrl } from "/sports.js";
import { FONT_PRESETS, STYLE_RANGES, TEMPLATES, cleanGraphic, contrastText } from "/templates.js";
import { SPORT_ANCHORS, SPORT_LAYOUTS, decorateSport, paintTimers } from "/sports-render.js";
import { NEWS_LAYOUTS, decorateNews, tickWallClocks } from "/news-render.js";

const { gsap, SplitText, CustomEase } = window;
gsap.registerPlugin(SplitText, CustomEase);
// Curvas de broadcast: arranque decidido, llegada muy suave, sin rebote.
CustomEase.create("cg.in", "0.16, 1, 0.3, 1");
CustomEase.create("cg.out", "0.7, 0, 0.84, 0");

// Modos: salida limpia para OBS/vMix (por defecto), "monitor" (igual pero con
// fondo de referencia) y "editor" (pantalla del panel: arrastrar y seleccionar).
const params = new URLSearchParams(location.search);
const editor = params.get("mode") === "editor";
const canvas = document.querySelector("#canvas");
const backdrop = document.querySelector("#backdrop");
const guides = document.querySelector("#safeGuides");
backdrop.dataset.mode = params.get("bg") || "studio";
if (editor) document.documentElement.classList.add("editor-mode");

const containers = new Map();   // id → contenedor del gráfico
const live = new Map();         // id → pieza montada (elemento, timelines)
const localGraphics = new Map(); // id → cambios del panel aún no guardados
let lastState = null;
let selectedId = null;
let showGhost = true;
let canvasScale = 1;
let drag = null;                // arrastre en curso (editor)

const icons = {
  pin: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`
};

const layouts = {
  "lower-third": () => `<div class="lt"><span class="bar" data-anim="bar"></span><div class="plate" data-anim="plate"><div class="lt-copy"><div class="kicker-row" data-anim="tab" data-optional="kicker"><span class="led"></span><span class="label accent-text" data-field="kicker"></span></div><strong class="primary" data-field="name" data-split></strong><span class="secondary" data-field="role" data-split></span></div><i class="fx shine"></i></div></div>`,
  "single-line": () => `<div class="sl plate" data-anim="plate"><div class="tag" data-anim="tab" data-optional="context"><span class="label" data-field="context"></span></div><strong class="primary" data-field="label" data-split></strong><i class="fx shine"></i></div>`,
  headline: () => `<div class="hl"><div class="tag" data-anim="tab" data-optional="kicker"><span class="label" data-field="kicker"></span></div><div class="plate" data-anim="plate"><span class="fx bar bar-inset" data-anim="bar"></span><strong class="primary" data-field="headline" data-split></strong><i class="fx shine"></i></div></div>`,
  breaking: () => `<div class="bk plate" data-anim="plate"><span class="fx bar bar-top" data-anim="bar"></span><div class="tag" data-anim="tab"><span class="led led-light"></span><span class="label" data-field="label"></span></div><strong class="primary" data-field="headline" data-split></strong><i class="fx shine"></i></div>`,
  location: () => `<div class="loc"><div class="orb" data-anim="tab">${icons.pin}</div><div class="plate" data-anim="plate"><div class="loc-copy"><div class="kicker-row" data-optional="status"><span class="led"></span><span class="label accent-text" data-field="status"></span></div><strong class="primary" data-field="location" data-split></strong><span class="secondary" data-field="reporter" data-optional="reporter" data-split></span></div><i class="fx shine"></i></div></div>`,
  quote: () => `<div class="qt plate" data-anim="plate"><span class="qt-mark" data-anim="tab" aria-hidden="true">“</span><div class="qt-copy"><strong class="primary" data-field="quote" data-split></strong><span class="qt-source" data-anim="tab"><span class="bar"></span><span class="secondary" data-field="source"></span></span></div><i class="fx shine"></i></div>`,
  upcoming: () => `<div class="up plate" data-anim="plate"><span class="fx bar bar-inset" data-anim="bar"></span><div class="up-copy"><span class="label accent-text" data-field="label" data-optional="label"></span><strong class="primary" data-field="title" data-split></strong></div><div class="up-time" data-anim="tab" data-optional="time">${icons.clock}<span data-field="time"></span></div><i class="fx shine"></i></div>`,
  fullscreen: ({ logoSrc }) => `<div class="fs plate" data-anim="plate"><i class="fx fs-glow"></i><header class="fs-head" data-anim="tab"><span class="tag" data-optional="kicker"><span class="label" data-field="kicker"></span></span><img class="fs-logo" src="${logoSrc}" alt=""></header><div class="fs-body"><strong class="primary" data-field="title" data-split></strong><p class="secondary" data-field="summary" data-split></p></div><footer class="fs-foot" data-anim="tab" data-optional="source"><span class="bar"></span><span class="secondary" data-field="source"></span></footer><i class="fx shine"></i></div>`,
  ticker: () => `<div class="tk plate" data-anim="plate"><div class="tag" data-anim="tab"><span class="led led-light"></span><span class="label" data-field="label"></span></div><div class="tk-window"><div class="tk-track"></div></div><i class="fx shine"></i></div>`,
  bug: () => `<div class="bg plate" data-anim="plate"><div class="bg-station"><strong class="primary" data-field="station"></strong></div><div class="bg-meta"><span class="kicker-row" data-optional="status"><span class="led"></span><span class="label" data-field="status"></span></span><time class="bg-clock"></time></div><i class="fx shine"></i></div>`
};

Object.assign(layouts, NEWS_LAYOUTS, SPORT_LAYOUTS);
const isSport = templateId => TEMPLATES[templateId]?.category !== "general";
const WIDE = ["breaking", "ticker", "fullscreen", "bug", ...Object.keys(SPORT_ANCHORS)];

const anchorFor = (templateId, align) => SPORT_ANCHORS[templateId] ?? ({
  breaking: { cls: "anchor-wide", origin: "50% 100%" },
  fullscreen: { cls: "anchor-full", origin: "50% 50%" },
  ticker: { cls: "anchor-ticker", origin: "50% 100%" },
  bug: { cls: "anchor-bug", origin: "100% 0%" }
})[templateId] ?? { cls: `anchor-lower align-${align}`, origin: { left: "96px 942px", center: "960px 942px", right: "1824px 942px" }[align] };

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(" ");
const logoSource = style => style.logoSource === "custom" ? (assetUrl(style.logoAsset) || `/brand-logo?v=${style.logoRevision}`) : "/logo.svg";

/* ── Construcción ───────────────────────────────────────────────────── */
function buildGraphic(graphic) {
  const { style, templateId } = graphic;
  const anchor = anchorFor(templateId, style.align);
  const transform = document.createElement("div");
  transform.className = "graphic-transform";
  transform.style.transformOrigin = anchor.origin;
  transform.style.transform = `translate3d(${style.x}px, ${style.y}px, 0) scale(${style.scale})`;

  const wrap = document.createElement("div");
  wrap.className = `anchor ${anchor.cls}`;
  const el = document.createElement("article");
  el.className = `gfx gfx-${templateId} skin-${style.skin} font-${style.font} align-${style.align}${style.uppercaseLabels ? " caps" : ""}`;
  const font = FONT_PRESETS.find(item => item.id === style.font) ?? FONT_PRESETS[0];
  // "Hielo" invierte la paleta: superficie clara con texto oscuro.
  const surface = style.skin === "frost" ? style.text : style.background;
  const ink = style.skin === "frost" ? style.background : style.text;
  const vars = {
    "--acc": style.accent, "--acc2": style.accent2, "--acc-rgb": rgb(style.accent), "--acc2-rgb": rgb(style.accent2),
    "--surface-rgb": rgb(surface), "--ink-rgb": rgb(ink), "--on-acc": contrastText(style.accent),
    "--alpha": style.opacity, "--r": `${style.radius}px`, "--shadow": style.shadow, "--grain": style.grain,
    "--team-logo-scale": style.teamLogoScale,
    "--font": font.family, "--w": style.primaryWeight, "--p-scale": style.primaryFont, "--s-scale": style.secondaryFont
  };
  for (const [key, value] of Object.entries(vars)) el.style.setProperty(key, value);
  el.innerHTML = layouts[templateId]({ logoSrc: logoSource(style) });
  fillFields(el, graphic);
  wrap.append(el);
  transform.append(wrap);

  const root = document.createElement("div");
  root.className = "graphic-root";
  root.append(transform);
  let logo = null;
  if (style.logoEnabled && templateId !== "fullscreen") {
    logo = document.createElement("img");
    logo.className = `brand-overlay logo-${style.logoPosition}`;
    logo.src = logoSource(style);
    logo.alt = "";
    logo.style.setProperty("--logo-scale", style.logoScale);
    logo.addEventListener("error", () => { if (!logo.src.endsWith("/logo.svg")) logo.src = "/logo.svg"; }, { once: true });
    root.append(logo);
  }
  return { root, el, logo };
}

function fillFields(el, graphic) {
  for (const node of el.querySelectorAll("[data-field]")) node.textContent = graphic.fields[node.dataset.field] ?? "";
  for (const node of el.querySelectorAll("[data-optional]")) node.hidden = !String(graphic.fields[node.dataset.optional] ?? "").trim();
  if (graphic.templateId === "ticker") buildTicker(el, graphic);
  if (isSport(graphic.templateId)) decorateSport(el, graphic);
  else decorateNews(el, graphic);
  tickWallClocks(el);
}

function buildTicker(el, graphic) {
  const items = String(graphic.fields.items || "").split("|").map(item => item.trim()).filter(Boolean);
  const track = el.querySelector(".tk-track");
  track.replaceChildren();
  // Dos copias idénticas: al desplazar exactamente una copia el bucle es continuo.
  for (let copy = 0; copy < 2; copy++) for (const item of items) {
    const span = document.createElement("span");
    span.className = "tk-item";
    span.innerHTML = `<i class="tk-sep" aria-hidden="true"></i>`;
    span.append(document.createTextNode(item));
    track.append(span);
  }
}

function startTicker(entry) {
  entry.marquee?.kill();
  const track = entry.el.querySelector(".tk-track");
  if (!track) return;
  const half = track.scrollWidth / 2;
  if (!half) return;
  gsap.set(track, { x: 0 });
  entry.marquee = gsap.to(track, { x: -half, duration: half / entry.graphic.style.tickerSpeed, ease: "none", repeat: -1 });
}

function splitTexts(entry) {
  entry.splits?.forEach(split => split.revert());
  entry.splits = [...entry.el.querySelectorAll("[data-split]")]
    .filter(node => !node.hidden && node.textContent.trim())
    .map(node => SplitText.create(node, { type: "lines", mask: "lines", linesClass: "split-line" }));
  return entry.splits.flatMap(split => split.lines);
}

/* ── Animación ──────────────────────────────────────────────────────── */
const q = (entry, selector) => [...entry.el.querySelectorAll(selector)].filter(node => !node.closest("[hidden]"));

function clipFrom(align) {
  return { left: "inset(0% 100% 0% 0%)", right: "inset(0% 0% 0% 100%)", center: "inset(0% 50% 0% 50%)" }[align] ?? "inset(0% 100% 0% 0%)";
}

function enterTimeline(entry) {
  const { el, graphic, logo } = entry;
  const { animation, align, speed, shine } = graphic.style;
  const wide = WIDE.includes(graphic.templateId);
  const dir = align === "right" || graphic.templateId === "bug" ? 1 : -1;
  const bars = q(entry, "[data-anim=bar]"), plates = q(entry, "[data-anim=plate]"), tabs = q(entry, "[data-anim=tab]");
  const lines = splitTexts(entry);
  const tl = gsap.timeline({ paused: true, defaults: { ease: "cg.in" } });
  tl.set(el, { autoAlpha: 1 });
  if (logo) tl.fromTo(logo, { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: .6 }, .2);

  if (animation === "reveal") {
    if (bars.length) tl.fromTo(bars, { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: .45 }, 0);
    tl.fromTo(plates, { clipPath: wide ? "inset(0% 100% 0% 0%)" : clipFrom(align) }, { clipPath: "inset(0% 0% 0% 0%)", duration: .8, clearProps: "clipPath" }, bars.length ? .14 : 0);
    if (tabs.length) tl.fromTo(tabs, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .55, stagger: .06 }, .3);
  } else if (animation === "slide") {
    tl.fromTo(el, { x: 160 * dir, filter: "blur(16px)" }, { x: 0, filter: "blur(0px)", duration: .9, clearProps: "filter" }, 0);
    tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: .35, ease: "none" }, 0);
    if (tabs.length) tl.fromTo(tabs, { autoAlpha: 0, x: 24 * dir }, { autoAlpha: 1, x: 0, duration: .6, stagger: .05 }, .2);
  } else if (animation === "rise") {
    tl.fromTo(el, { y: 70, opacity: 0, filter: "blur(10px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: .85, clearProps: "filter" }, 0);
    if (tabs.length) tl.fromTo(tabs, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: .55, stagger: .07 }, .18);
  } else {
    tl.fromTo(el, { opacity: 0, scale: .975, filter: "blur(12px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: .8, ease: "power2.out", clearProps: "filter" }, 0);
  }
  // Noticias: barras de color que cruzan y banda de cargo que se despliega.
  const wipes = q(entry, "[data-anim=wipe] i");
  if (wipes.length) {
    tl.fromTo(wipes, { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: .3, stagger: .05, ease: "power3.in" }, 0);
    tl.to(wipes, { scaleX: 0, transformOrigin: "100% 50%", duration: .4, stagger: .05, ease: "power3.out" }, .34);
  }
  const bands = q(entry, "[data-anim=band]");
  if (bands.length) tl.fromTo(bands, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: .6, clearProps: "clipPath" }, .42);
  if (lines.length) tl.fromTo(lines, { yPercent: 105 }, { yPercent: 0, duration: .75, stagger: .07 }, animation === "fade" ? .1 : .26);
  const sheen = q(entry, ".shine");
  if (shine && sheen.length) tl.fromTo(sheen, { xPercent: -130, autoAlpha: 1 }, { xPercent: 130, duration: 1.1, ease: "power2.inOut" }, .45);
  tl.timeScale(speed);
  return tl;
}

function exitTimeline(entry) {
  const { el, graphic, logo } = entry;
  const { animation, align, speed } = graphic.style;
  const wide = WIDE.includes(graphic.templateId);
  const plates = q(entry, "[data-anim=plate]"), tabs = q(entry, "[data-anim=tab]"), bars = q(entry, "[data-anim=bar]");
  const lines = (entry.splits ?? []).flatMap(split => split.lines);
  const tl = gsap.timeline({ paused: true, defaults: { ease: "cg.out" } });
  if (lines.length) tl.to(lines, { yPercent: -105, duration: .32, stagger: .03 }, 0);
  if (logo) tl.to(logo, { autoAlpha: 0, duration: .3 }, 0);
  if (animation === "reveal") {
    if (tabs.length) tl.to(tabs, { autoAlpha: 0, duration: .22 }, .05);
    tl.fromTo(plates, { clipPath: "inset(0% 0% 0% 0%)" }, { clipPath: wide ? "inset(0% 100% 0% 0%)" : clipFrom(align), duration: .42 }, .1);
    if (bars.length) tl.to(bars, { scaleY: 0, transformOrigin: "50% 0%", duration: .25 }, .4);
    tl.to(el, { autoAlpha: 0, duration: .08 }, .6);
  } else if (animation === "slide") {
    const dir = align === "right" || graphic.templateId === "bug" ? 1 : -1;
    tl.to(el, { x: 120 * dir, opacity: 0, filter: "blur(12px)", duration: .5 }, .1);
  } else if (animation === "rise") {
    tl.to(el, { y: 40, opacity: 0, filter: "blur(8px)", duration: .5 }, .08);
  } else {
    tl.to(el, { opacity: 0, scale: .985, filter: "blur(10px)", duration: .5, ease: "power2.in" }, .05);
  }
  tl.timeScale(speed);
  return tl;
}

/* ── Ciclo de vida por gráfico ──────────────────────────────────────── */
function containerFor(id) {
  let container = containers.get(id);
  if (!container) {
    container = document.createElement("div");
    container.className = "output-layer";
    container.dataset.id = id;
    canvas.insertBefore(container, guides);
    containers.set(id, container);
  }
  return container;
}

function unmount(id) {
  const entry = live.get(id);
  if (!entry) return;
  entry.tl?.kill(); entry.marquee?.kill(); entry.loop?.kill();
  clearInterval(entry.el._clock);
  entry.root.remove();
  live.delete(id);
}

function mount(id, graphic, key, { instant, ghost = false }) {
  unmount(id);
  const built = buildGraphic(graphic);
  built.root.dataset.id = id;
  built.root.classList.toggle("is-ghost", ghost);
  containerFor(id).append(built.root);
  const entry = { ...built, id, graphic, key, ghost, exiting: false };
  live.set(id, entry);
  entry.tl = enterTimeline(entry);
  if (instant) entry.tl.progress(1);
  else entry.tl.play(0);
  if (graphic.templateId === "ticker") startTicker(entry);
  if (graphic.templateId === "breaking" && graphic.style.shine && !ghost) {
    const sheen = q(entry, ".shine");
    entry.loop = gsap.fromTo(sheen, { xPercent: -130, autoAlpha: 1 }, { xPercent: 130, duration: 1.4, ease: "power2.inOut", repeat: -1, repeatDelay: 4.5, delay: 2 });
  }
}

function playOut(id, after) {
  const entry = live.get(id);
  if (!entry) return after?.();
  if (entry.exiting) { entry.after = after; return; }
  entry.exiting = true;
  entry.after = after;
  entry.tl?.kill();
  entry.tl = exitTimeline(entry);
  entry.tl.eventCallback("onComplete", () => {
    if (live.get(id) !== entry) return;
    unmount(id);
    entry.after?.();
  });
  entry.tl.play(0);
}

const withoutPlacement = style => JSON.stringify({ ...style, x: 0, y: 0, scale: 1 });
const transformOf = style => `translate3d(${style.x}px, ${style.y}px, 0) scale(${style.scale})`;

// Cambio en pantalla: si solo se mueve, se desliza a su nuevo lugar; si solo
// cambia el texto, se reemplaza con un barrido corto; si cambia el diseño, la
// pieza nueva se funde sobre la anterior.
function updateLive(id, graphic, key) {
  const entry = live.get(id);
  const previous = entry.graphic;
  const lookChanged = previous.templateId !== graphic.templateId || withoutPlacement(previous.style) !== withoutPlacement(graphic.style) || graphic.style.align !== previous.style.align;
  if (lookChanged || graphic.templateId === "ticker" && previous.fields.items !== graphic.fields.items) {
    const old = entry;
    live.delete(id);
    gsap.to(old.root, { autoAlpha: 0, duration: .35 / graphic.style.speed, onComplete: () => { old.tl?.kill(); old.marquee?.kill(); clearInterval(old.el._clock); old.root.remove(); } });
    mount(id, graphic, key, { instant: false });
    return;
  }
  entry.graphic = graphic;
  entry.key = key;
  const transform = entry.root.querySelector(".graphic-transform");
  if (transform.style.transform !== transformOf(graphic.style)) {
    gsap.to(transform, { x: graphic.style.x, y: graphic.style.y, scale: graphic.style.scale, duration: .6 / graphic.style.speed, ease: "cg.in", onComplete: () => { transform.style.transform = transformOf(graphic.style); } });
  }
  const changed = [...entry.el.querySelectorAll("[data-field]")].filter(node => (graphic.fields[node.dataset.field] ?? "") !== (previous.fields[node.dataset.field] ?? ""));
  const redecorate = () => (isSport(graphic.templateId) ? decorateSport : decorateNews)(entry.el, graphic);
  if (!changed.length) { redecorate(); return; }
  const tl = gsap.timeline({ defaults: { ease: "cg.in" } }).timeScale(graphic.style.speed);
  tl.to(changed, { autoAlpha: 0, y: -10, filter: "blur(6px)", duration: .22, ease: "cg.out" });
  tl.add(() => {
    for (const node of changed) {
      const split = entry.splits?.find(item => item.elements.includes(node));
      if (split) { split.revert(); entry.splits = entry.splits.filter(item => item !== split); }
      node.textContent = graphic.fields[node.dataset.field] ?? "";
    }
    for (const node of entry.el.querySelectorAll("[data-optional]")) node.hidden = !String(graphic.fields[node.dataset.optional] ?? "").trim();
    redecorate();
  });
  tl.fromTo(changed, { autoAlpha: 0, y: 12, filter: "blur(6px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: .45, clearProps: "filter" });
  const sheen = q(entry, ".shine");
  if (graphic.style.shine && sheen.length) tl.fromTo(sheen, { xPercent: -130, autoAlpha: 1 }, { xPercent: 130, duration: .9, ease: "power2.inOut" }, .2);
}

function syncItem(id, graphic, { show, ghost, instant }) {
  const entry = live.get(id);
  if (!show) {
    if (entry?.ghost || (instant && entry)) unmount(id);
    else if (entry && !entry.exiting) playOut(id);
    return;
  }
  const key = JSON.stringify(graphic);
  if (!entry) return mount(id, graphic, key, { instant: instant || ghost, ghost });
  if (entry.exiting) {
    // Termina de salir y, si está seleccionado, queda como silueta editable.
    if (ghost) entry.after = () => mount(id, graphic, key, { instant: true, ghost: true });
    else mount(id, graphic, key, { instant, ghost });
    return;
  }
  if (entry.ghost && !ghost) return mount(id, graphic, key, { instant, ghost: false });
  if (!entry.ghost && ghost) return playOut(id, () => mount(id, graphic, key, { instant: true, ghost: true }));
  if (entry.key === key) return;
  if (instant || ghost) return mount(id, graphic, key, { instant: true, ghost });
  updateLive(id, graphic, key);
}

// Reloj de pared (titular, cinta, mosca, ubicación).
setInterval(() => tickWallClocks(canvas), 1000);

// Relojes de marcadores: valores del servidor, corregidos por la diferencia de hora.
const timersById = new Map();
let serverOffset = 0;
setInterval(() => {
  const now = Date.now() + serverOffset;
  for (const [id, entry] of live) {
    const template = TEMPLATES[entry.graphic.templateId];
    if (template?.scorebug) paintTimers(entry.el, template, timersById.get(id), now);
  }
}, 100);

function render(state, { instant = false } = {}) {
  lastState = state;
  if (state.server?.now) serverOffset = state.server.now - Date.now();
  timersById.clear();
  for (const item of state.items) if (item.timers) timersById.set(item.id, item.timers);
  const ids = new Set();
  const centered = new Set(["matchup", "lineup", "match-stats", "period-scores", "fullscreen"]);
  const selected = state.items.find(item => item.id === selectedId);
  const isolatedPreview = editor && showGhost && selected && (!selected.onAir || selected.phase === "exiting") && centered.has(selected.graphic.templateId);
  state.items.forEach((item, index) => {
    ids.add(item.id);
    let graphic = cleanGraphic(item.graphic);
    let local = false;
    if (editor && localGraphics.has(item.id)) {
      const override = localGraphics.get(item.id);
      if (JSON.stringify(override) === JSON.stringify(graphic)) localGraphics.delete(item.id);
      else { graphic = override; local = true; }
    }
    const onScreen = item.onAir && item.phase !== "exiting";
    const obscuresPreview = isolatedPreview && item.id !== selectedId && centered.has(item.graphic.templateId);
    const ghost = editor && showGhost && !onScreen && item.id === selectedId;
    containerFor(item.id).style.zIndex = String(index + 1);
    // Mientras se arrastra, la pieza la controla el puntero, no el estado.
    if (drag?.entry.id === item.id && live.get(item.id) === drag.entry) return;
    syncItem(item.id, graphic, { show: (onScreen && !obscuresPreview) || ghost, ghost, instant: instant || local || Boolean(obscuresPreview) });
  });
  for (const [id, container] of containers) {
    if (ids.has(id)) continue;
    playOut(id, () => { container.remove(); containers.delete(id); });
    if (!live.has(id)) { container.remove(); containers.delete(id); }
  }
}

function resizeCanvas() {
  canvasScale = Math.min(innerWidth / 1920, innerHeight / 1080);
  const left = (innerWidth - 1920 * canvasScale) / 2;
  const top = (innerHeight - 1080 * canvasScale) / 2;
  canvas.style.transform = `translate3d(${left}px, ${top}px, 0) scale(${canvasScale})`;
  canvas.style.setProperty("--cs", canvasScale);
}
addEventListener("resize", resizeCanvas);
resizeCanvas();

/* ── Editor: seleccionar, arrastrar y redimensionar ─────────────────── */
function setupEditor() {
  const selection = document.createElement("div");
  selection.className = "selection-box";
  selection.hidden = true;
  selection.innerHTML = `<span class="selection-tag"></span><i class="selection-handle" title="Arrastra para cambiar el tamaño"></i>`;
  canvas.append(selection);
  const tag = selection.querySelector(".selection-tag");
  const send = message => parent.postMessage(message, location.origin);
  const clamp = (key, value) => Math.min(STYLE_RANGES[key].max, Math.max(STYLE_RANGES[key].min, value));

  // La caja sigue al gráfico en cada cuadro, también durante las animaciones.
  const follow = () => {
    const entry = selectedId && live.get(selectedId);
    if (entry && !entry.exiting) {
      const box = entry.el.getBoundingClientRect(), origin = canvas.getBoundingClientRect();
      Object.assign(selection.style, {
        left: `${(box.left - origin.left) / canvasScale}px`, top: `${(box.top - origin.top) / canvasScale}px`,
        width: `${box.width / canvasScale}px`, height: `${box.height / canvasScale}px`
      });
      selection.hidden = false;
      selection.classList.toggle("ghost", entry.ghost);
      tag.textContent = entry.ghost ? "Vista previa individual · solo lo ves tú" : "En pantalla";
    } else selection.hidden = true;
    requestAnimationFrame(follow);
  };
  requestAnimationFrame(follow);

  canvas.addEventListener("pointerdown", event => {
    const handle = event.target.closest(".selection-handle");
    const root = handle ? live.get(selectedId)?.root : event.target.closest(".graphic-root");
    if (!root) { send({ type: "pulso-select", id: null }); return; }
    const entry = live.get(root.dataset.id);
    if (!entry) return;
    event.preventDefault();
    if (selectedId !== entry.id) { selectedId = entry.id; send({ type: "pulso-select", id: entry.id }); }
    const style = { ...entry.graphic.style };
    drag = { entry, resize: Boolean(handle), startX: event.clientX, startY: event.clientY, style, width: entry.el.getBoundingClientRect().width / canvasScale, moved: false };
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", event => {
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / canvasScale, dy = (event.clientY - drag.startY) / canvasScale;
    if (!drag.moved && Math.hypot(dx, dy) < 3) return;
    drag.moved = true;
    const style = { ...drag.entry.graphic.style };
    if (drag.resize) {
      style.scale = Math.round(clamp("scale", drag.style.scale * (1 + dx / Math.max(drag.width, 1))) * 100) / 100;
    } else {
      // Imán suave hacia la posición original del anclaje (x=0 / y=0).
      const x = Math.round(drag.style.x + dx), y = Math.round(drag.style.y + dy);
      style.x = clamp("x", Math.abs(x) < 12 && !event.shiftKey ? 0 : x);
      style.y = clamp("y", Math.abs(y) < 12 && !event.shiftKey ? 0 : y);
    }
    const graphic = { ...drag.entry.graphic, style };
    drag.entry.graphic = graphic;
    drag.entry.key = JSON.stringify(graphic);
    drag.entry.root.querySelector(".graphic-transform").style.transform = transformOf(style);
    send({ type: "pulso-move", id: drag.entry.id, x: style.x, y: style.y, scale: style.scale });
  });

  const end = () => {
    if (!drag) return;
    if (drag.moved) {
      localGraphics.set(drag.entry.id, drag.entry.graphic);
      send({ type: "pulso-move-end", id: drag.entry.id, x: drag.entry.graphic.style.x, y: drag.entry.graphic.style.y, scale: drag.entry.graphic.style.scale });
    }
    drag = null;
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
}

/* ── Arranque ───────────────────────────────────────────────────────── */
// Las métricas (líneas de SplitText, ancho del ticker) dependen de la fuente
// real: se cargan todas antes del primer render para no medir con fallback.
// Máximo 3 s: si un navegador (OBS/vMix) tarda con las fuentes, igual se dibuja.
await Promise.race([
  Promise.all([
    ...FONT_PRESETS.map(font => document.fonts.load(`700 40px ${font.family}`)),
    document.fonts.load(`500 20px "JetBrains Mono Variable"`)
  ]).catch(() => {}),
  new Promise(resolve => setTimeout(resolve, 3000))
]);

if (editor) setupEditor();

// Si el programa aún no está abierto (o se reinicia), se reintenta solo:
// OBS/vMix nunca se quedan en negro esperando a que alguien pulse Actualizar.
async function loadInitialState() {
  for (;;) {
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (response.ok) return await response.json();
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
const initial = await loadInitialState();
const bootId = initial.server?.boot;
render(initial, { instant: true });

if (!params.has("snapshot")) {
  const events = new EventSource(`/events?client=${editor ? "panel" : "output"}`);
  events.addEventListener("state", event => {
    const state = JSON.parse(event.data);
    // El programa se reinició con otra versión: recargar para usar la nueva.
    if (bootId && state.server?.boot && state.server.boot !== bootId) { location.reload(); return; }
    render(state);
  });
}

addEventListener("message", event => {
  if (event.origin !== location.origin) return;
  const data = event.data ?? {};
  if (editor && data.type === "pulso-select") { selectedId = data.id; if (lastState) render(lastState); }
  if (editor && data.type === "pulso-local" && data.id) {
    localGraphics.set(data.id, cleanGraphic(data.graphic));
    if (lastState) render(lastState);
  }
  if (editor && data.type === "pulso-ghost") { showGhost = data.visible; if (lastState) render(lastState); }
  if (editor && data.type === "pulso-replay" && data.id) {
    // Ensayo de la animación real: salida, pausa breve y nueva entrada.
    const entry = live.get(data.id);
    if (!entry) return;
    const { graphic, key, ghost } = entry;
    playOut(data.id, () => setTimeout(() => mount(data.id, graphic, key, { instant: false, ghost }), 250));
  }
  if (data.type === "pulso-backdrop") {
    backdrop.dataset.mode = data.mode;
    backdrop.style.setProperty("--image", data.image ? `url("${data.image}")` : "none");
  }
  if (data.type === "pulso-guides") guides.hidden = !data.visible;
});
if (parent !== window) parent.postMessage({ type: "pulso-frame-ready" }, location.origin);
