// Diseños de las plantillas deportivas para la salida (OBS/vMix y pantalla del panel).
// Cada plantilla tiene su maqueta y una función que dibuja las partes que
// dependen de los datos (tarjetas rojas, faltas, saque, cancha, barras…).
import { contrastText } from "./templates.js";
import { assetUrl, volleyMatch, formatClock, parsePlayers, parseRows, timerFields, timerValue } from "./sports.js";

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(" ");
const esc = value => String(value ?? "").replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
const num = value => { const match = String(value ?? "").match(/-?\d+(?:[.,]\d+)?/); return match ? Number(match[0].replace(",", ".")) : 0; };
const initials = name => String(name ?? "").split(/\s+/).filter(word => word.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(word)).slice(0, 2).map(word => word[0]).join("").toUpperCase() || "?";

const arrow = dir => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${dir === "in" ? "M12 19V5M5 12l7-7 7 7" : "M12 5v14M19 12l-7 7-7-7"}"/></svg>`;
const teamDot = `<i class="team-dot"></i>`;
const logoImg = (key, cls = "sp-logo") => `<img class="${cls}" data-logo="${key}" alt="" hidden>`;
const PITCH = `<svg class="pitch-lines" viewBox="0 0 68 105" preserveAspectRatio="none" aria-hidden="true"><rect x="1" y="1" width="66" height="103"/><path d="M1 52.5h66"/><circle cx="34" cy="52.5" r="9.15"/><circle cx="34" cy="52.5" r=".6" class="dot"/><rect x="13.85" y="1" width="40.3" height="16.5"/><rect x="24.85" y="1" width="18.3" height="5.5"/><rect x="13.85" y="87.5" width="40.3" height="16.5"/><rect x="24.85" y="98.5" width="18.3" height="5.5"/><path d="M26.7 17.5a9.15 9.15 0 0 0 14.6 0M26.7 87.5a9.15 9.15 0 0 1 14.6 0"/></svg>`;

export const SPORT_LAYOUTS = {
  "soccer-scorebug": () => `<div class="sb sb-soccer"><div class="sb-comp" data-anim="tab" data-optional="competition">${logoImg("competitionLogo", "comp-logo")}<span class="label" data-field="competition"></span></div>
    <div class="sb-row"><div class="sb-main plate" data-anim="plate">
      <div class="sb-team home"><i class="sb-color"></i>${logoImg("homeLogo", "sb-logo")}<span class="sb-abbr" data-field="homeName"></span><span class="sb-reds" data-reds="home"></span></div>
      <div class="sb-score"><span data-field="homeScore"></span><i class="sb-sep"></i><span data-field="awayScore"></span></div>
      <div class="sb-team away"><span class="sb-reds" data-reds="away"></span><span class="sb-abbr" data-field="awayName"></span>${logoImg("awayLogo", "sb-logo")}<i class="sb-color"></i></div>
      <div class="sb-clock"><span class="sb-time" data-timer="clock"></span><span class="sb-period" data-field="period"></span></div>
      <i class="fx shine"></i></div>
      <div class="sb-added tag" data-optional="addedTime">+<span data-field="addedTime"></span></div></div></div>`,
  "basket-scorebug": () => `<div class="sb sb-basket"><div class="sb-main plate" data-anim="plate">
      <div class="bk-comp">${logoImg("competitionLogo", "comp-logo")}<span class="label" data-field="competition"></span></div>
      ${["home", "away"].map(side => `<div class="bk-team ${side}"><i class="sb-color"></i>${logoImg(`${side}Logo`, "sb-logo")}<div class="bk-id"><span class="sb-abbr" data-field="${side}Name"></span><span class="bk-meta"><span class="bk-to" data-timeouts="${side}"></span><span class="bk-fouls" data-fouls="${side}"></span></span></div><span class="bk-score" data-field="${side}Score"></span></div>`).join("")}
      <div class="bk-clock"><span class="sb-period" data-field="period"></span><span class="sb-time" data-timer="clock"></span></div>
      <div class="bk-shot"><span data-timer="shot"></span></div>
      <i class="fx shine"></i></div></div>`,
  "volley-scorebug": () => `<div class="sb sb-volley"><div class="sb-main plate" data-anim="plate">
      <div class="vb-head"><span class="vb-comp">${logoImg("competitionLogo", "comp-logo")}<span class="label" data-field="competition"></span></span><span class="label vb-set">SET <span data-field="setNumber"></span></span></div>
      ${["home", "away"].map(side => `<div class="vb-row ${side}"><i class="sb-color"></i><span class="vb-serve" data-serve="${side}"></span>${logoImg(`${side}Logo`, "vb-logo")}<span class="vb-name" data-field="${side}Name"></span><span class="vb-history" data-history="${side}"></span><span class="vb-sets"><small>SETS</small><b data-field="${side}Sets"></b></span><span class="vb-points" data-field="${side}Points"></span></div>`).join("")}
      <i class="fx shine"></i></div></div>`,
  card: () => `<div class="cd"><div class="card-shape" data-anim="tab" data-card><i class="c1"></i><i class="c2"></i></div><div class="plate" data-anim="plate"><div class="sp-copy">
      <div class="kicker-row"><span class="label accent-text" data-card-label></span><span class="label sp-minute" data-field="minute"></span></div>
      <strong class="primary"><span class="sp-num" data-field="number"></span><span data-field="player"></span></strong>
      <span class="secondary sp-team">${logoImg("teamLogo")}${teamDot}<span data-field="team"></span></span></div><i class="fx shine"></i></div></div>`,
  substitution: () => `<div class="sub plate" data-anim="plate"><span class="fx bar bar-inset team-bar"></span>
      <div class="sub-head" data-anim="tab">${logoImg("teamLogo")}${teamDot}<span class="label" data-field="team"></span><span class="label sp-minute">CAMBIO · <span data-field="minute"></span></span></div>
      <div class="sub-row in"><span class="sub-arrow in">${arrow("in")}</span><span class="sp-num" data-field="inNumber"></span><strong class="primary" data-field="inName"></strong></div>
      <div class="sub-row out"><span class="sub-arrow out">${arrow("out")}</span><span class="sp-num" data-field="outNumber"></span><span class="secondary" data-field="outName"></span></div>
      <i class="fx shine"></i></div>`,
  "score-event": () => `<div class="ge"><div class="ge-burst" data-anim="tab"><span data-field="label"></span></div>
      <div class="plate" data-anim="plate"><span class="fx bar bar-inset team-bar"></span><div class="sp-copy">
        <strong class="primary"><span class="sp-num" data-field="number"></span><span data-field="player"></span></strong>
        <span class="secondary sp-team">${logoImg("teamLogo")}${teamDot}<span data-field="team"></span><span class="sp-minute" data-optional="minute"> · <span data-field="minute"></span></span></span></div>
        <div class="ge-score" data-optional="score"><span data-field="score"></span></div><i class="fx shine"></i></div></div>`,
  player: () => `<div class="pl"><div class="pl-num" data-anim="tab"><span data-field="number"></span></div><div class="plate" data-anim="plate"><div class="sp-copy">
      <div class="kicker-row" data-optional="position"><span class="label accent-text" data-field="position"></span></div>
      <strong class="primary" data-field="name" data-split></strong>
      <span class="secondary sp-team">${logoImg("teamLogo")}${teamDot}<span data-field="team"></span></span>
      <span class="pl-stats" data-optional="stats"><span data-field="stats"></span></span></div><i class="fx shine"></i></div></div>`,
  "game-event": () => `<div class="ev plate" data-anim="plate"><div class="tag" data-anim="tab"><span class="led led-light"></span><span class="label" data-field="label"></span></div>
      <div class="ev-copy"><strong class="primary" data-field="detail" data-optional="detail" data-split></strong><span class="secondary sp-team" data-optional="team">${logoImg("teamLogo")}${teamDot}<span data-field="team"></span></span></div><i class="fx shine"></i></div>`,
  matchup: () => `<div class="mu plate" data-anim="plate"><i class="fx mu-glow home"></i><i class="fx mu-glow away"></i>
      <div class="mu-head" data-anim="tab"><span class="tag" data-optional="competition">${logoImg("competitionLogo", "comp-logo")}<span class="label" data-field="competition"></span></span></div>
      <div class="mu-body">
        <div class="mu-team home"><span class="crest" data-crest="home"></span><strong data-field="homeName"></strong></div>
        <div class="mu-center"><div class="mu-score" data-score></div><span class="label mu-status" data-field="status"></span></div>
        <div class="mu-team away"><span class="crest" data-crest="away"></span><strong data-field="awayName"></strong></div>
      </div>
      <footer class="mu-foot" data-optional="venue"><span data-field="venue"></span></footer><i class="fx shine"></i></div>`,
  lineup: () => `<div class="lu plate" data-anim="plate">
      <header class="lu-head" data-anim="tab"><span class="crest small" data-crest="team"></span><div><span class="label accent-text">ALINEACIÓN</span><strong class="primary" data-field="team"></strong></div><span class="lu-form" data-optional="formation" data-field="formation"></span></header>
      <div class="lu-body"><div class="lu-pitch" data-pitch></div><div class="lu-list" data-roster></div></div>
      <footer class="lu-foot"><span data-optional="coach"><b class="label">DT</b> <span data-field="coach"></span></span><span class="lu-bench" data-bench></span></footer><i class="fx shine"></i></div>`,
  "match-stats": () => `<div class="st plate" data-anim="plate">
      <header class="st-head" data-anim="tab"><span class="st-team home">${logoImg("homeLogo")}${teamDot}<span data-field="homeName"></span></span><span class="label accent-text" data-field="title"></span><span class="st-team away"><span data-field="awayName"></span>${logoImg("awayLogo")}${teamDot}</span></header>
      <div class="st-rows" data-stats></div><i class="fx shine"></i></div>`,
  "period-scores": () => `<div class="ps plate" data-anim="plate"><header class="ps-head" data-anim="tab"><span class="label accent-text" data-field="title"></span></header><div class="ps-table" data-periods></div><i class="fx shine"></i></div>`
};

export const SPORT_ANCHORS = {
  "soccer-scorebug": { cls: "anchor-sb-top", origin: "96px 54px" },
  "volley-scorebug": { cls: "anchor-vb-bottom", origin: "960px 1016px" },
  "basket-scorebug": { cls: "anchor-sb-bottom", origin: "960px 1036px" },
  matchup: { cls: "anchor-center", origin: "50% 50%" },
  lineup: { cls: "anchor-center", origin: "50% 50%" },
  "match-stats": { cls: "anchor-center", origin: "50% 50%" },
  "period-scores": { cls: "anchor-center", origin: "50% 50%" }
};

function setTeamVars(el, fields) {
  for (const [name, key] of [["home", "homeColor"], ["away", "awayColor"], ["team", "teamColor"]]) {
    const color = fields[key];
    if (!color) continue;
    el.style.setProperty(`--${name}`, color);
    el.style.setProperty(`--${name}-rgb`, rgb(color));
    el.style.setProperty(`--on-${name}`, contrastText(color));
  }
}

// Partes dinámicas: se llama al construir y cada vez que cambian los datos.
export function decorateSport(el, graphic) {
  const f = graphic.fields;
  setTeamVars(el, f);
  const setLabel = el.querySelector(".vb-set");
  if (setLabel) setLabel.innerHTML = volleyMatch(f).finished ? "FINAL" : `SET <span>${esc(f.setNumber)}</span>`;
  const all = selector => el.querySelectorAll(selector);

  for (const node of all("[data-reds]")) {
    const count = Math.min(3, Math.max(0, Math.round(num(f[`${node.dataset.reds}Red`]))));
    node.innerHTML = "<i></i>".repeat(count);
  }
  for (const node of all("[data-fouls]")) {
    const fouls = Math.round(num(f[`${node.dataset.fouls}Fouls`]));
    const bonus = fouls >= Math.max(1, num(f.bonusAt) || 5);
    node.innerHTML = `<span>FALTAS ${fouls}</span>${bonus ? `<b class="bonus">BONUS</b>` : ""}`;
  }
  for (const node of all("[data-timeouts]")) {
    const left = Math.min(7, Math.max(0, Math.round(num(f[`${node.dataset.timeouts}Timeouts`]))));
    node.innerHTML = "<i></i>".repeat(left);
  }
  for (const node of all("[data-serve]")) node.classList.toggle("on", f.serve === node.dataset.serve);
  for (const node of all("[data-history]")) {
    const sets = String(f.history ?? "").split(/[\s,;]+/).map(item => item.split("-").map(part => part.trim())).filter(item => item.length === 2 && item[0] && item[1]);
    const side = node.dataset.history === "home" ? 0 : 1;
    node.innerHTML = sets.map(set => `<i class="${num(set[side]) > num(set[1 - side]) ? "won" : ""}">${esc(set[side])}</i>`).join("");
  }
  const card = el.querySelector("[data-card]");
  if (card) {
    card.dataset.card = f.cardType;
    el.querySelector("[data-card-label]").textContent = { yellow: "TARJETA AMARILLA", red: "TARJETA ROJA", second: "DOBLE AMARILLA · EXPULSIÓN" }[f.cardType] ?? "TARJETA";
  }
  for (const node of all("[data-logo]")) {
    const url = assetUrl(f[node.dataset.logo]);
    node.hidden = !url;
    if (url && node.getAttribute("src") !== url) node.src = url;
  }
  // Escudo: imagen subida o, si no hay, iniciales sobre el color del equipo.
  for (const node of all("[data-crest]")) {
    const side = node.dataset.crest;
    const url = assetUrl(f[`${side}Logo`]);
    node.classList.toggle("has-logo", Boolean(url));
    node.innerHTML = url ? `<img src="${url}" alt="">` : esc(initials(side === "team" ? f.team : f[`${side}Name`]));
  }
  const score = el.querySelector("[data-score]");
  if (score) {
    const played = String(f.homeScore ?? "").trim() !== "" || String(f.awayScore ?? "").trim() !== "";
    score.classList.toggle("vs", !played);
    score.innerHTML = played ? `<span>${esc(f.homeScore || "0")}</span><i></i><span>${esc(f.awayScore || "0")}</span>` : "VS";
  }
  const pitch = el.querySelector("[data-pitch]");
  if (pitch) drawLineup(el, pitch, f);
  const stats = el.querySelector("[data-stats]");
  if (stats) {
    stats.innerHTML = parseRows(f.rows).map(([label, home = "", away = ""]) => {
      const h = Math.max(0, num(home)), a = Math.max(0, num(away)), total = h + a;
      const share = total ? (h / total) * 100 : 50;
      return `<div class="st-row"><span class="st-val home ${h > a ? "lead" : ""}">${esc(home)}</span><div class="st-mid"><span class="st-label">${esc(label)}</span><div class="st-bar"><i class="home" style="width:${share}%"></i><i class="away" style="width:${100 - share}%"></i></div></div><span class="st-val away ${a > h ? "lead" : ""}">${esc(away)}</span></div>`;
    }).join("");
  }
  const periods = el.querySelector("[data-periods]");
  if (periods) {
    const rows = parseRows(f.periods);
    const total = side => f.total === "wins"
      ? rows.filter(row => num(row[side]) > num(row[3 - side])).length
      : rows.reduce((sum, row) => sum + num(row[side]), 0);
    const cell = (row, side) => `<span class="${num(row[side]) > num(row[3 - side]) ? "won" : ""}">${esc(row[side] ?? "")}</span>`;
    const columns = rows.length + 2;
    periods.style.setProperty("--cols", columns);
    periods.innerHTML = `<div class="ps-row ps-labels"><span></span>${rows.map(row => `<span>${esc(row[0])}</span>`).join("")}<span>${f.total === "wins" ? "SETS" : "TOTAL"}</span></div>`
      + ["home", "away"].map((side, index) => `<div class="ps-row ${side}"><span class="ps-team">${f[`${side}Logo`] ? `<img class="sp-logo" src="${assetUrl(f[`${side}Logo`])}" alt="">` : teamDot}${esc(f[`${side}Name`])}</span>${rows.map(row => cell(row, index + 1)).join("")}<span class="ps-total ${total(index + 1) > total(2 - index) ? "won" : ""}">${total(index + 1)}</span></div>`).join("");
  }
}

// Alineación: si la formación encaja con los titulares (fútbol), se dibujan
// en la cancha; si no (básquet, vóley), se muestra como lista.
function drawLineup(el, pitch, f) {
  const players = parsePlayers(f.players);
  const lines = String(f.formation ?? "").split(/[-–\s]+/).map(Number).filter(n => n > 0);
  const fits = lines.length >= 2 && lines.reduce((a, b) => a + b, 0) + 1 === players.length;
  el.querySelector(".lu").classList.toggle("no-pitch", !fits);
  const marker = (player, x, y) => `<div class="lu-player" style="left:${x}%;top:${y}%"><span class="lu-shirt">${esc(player.number)}</span><span class="lu-name">${esc(player.name.split(" ").slice(-1)[0])}</span></div>`;
  if (fits) {
    const rows = [1, ...lines];
    let index = 0;
    pitch.innerHTML = PITCH + rows.map((count, row) => {
      const y = 90 - row * (78 / (rows.length - 1));
      return Array.from({ length: count }, (_, i) => marker(players[index++], ((i + 1) / (count + 1)) * 100, y)).join("");
    }).join("");
  } else pitch.innerHTML = "";
  el.querySelector("[data-roster]").innerHTML = players.map(player => `<div class="lu-row"><span class="lu-num">${esc(player.number)}</span><span>${esc(player.name)}</span></div>`).join("");
  const bench = parsePlayers(f.bench);
  el.querySelector("[data-bench]").innerHTML = bench.length ? `<b class="label">SUPLENTES</b> ${bench.map(player => `<span>${esc(player.number)} ${esc(player.name)}</span>`).join("")}` : "";
}

// Relojes: se pintan varias veces por segundo a partir del estado del servidor.
export function paintTimers(el, template, timers, now) {
  for (const field of timerFields(template)) {
    const node = el.querySelector(`[data-timer="${field.id}"]`);
    if (!node) continue;
    const ms = timerValue(timers?.[field.id], now, field.direction);
    const text = formatClock(ms, field.format, field.direction);
    if (node.textContent !== text) node.textContent = text;
    node.classList.toggle("low", field.format === "seconds" && ms <= 5000);
    node.classList.toggle("running", Boolean(timers?.[field.id]?.running));
  }
}
