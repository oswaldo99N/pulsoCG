// Paquete de noticias premium (perfil Principal y cualquier perfil).
// Referencias de canales actuales: barrido de barras de color en las
// entradas, bandera roja "EN VIVO" sobre el logo, rótulo en dos niveles
// (nombre en placa + cargo en banda de color), última hora con franjas en
// movimiento y reloj en la mosca, el titular y la cinta.

const pin = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`;
const wipe = `<div class="nw-wipe" data-anim="wipe" aria-hidden="true"><i></i><i></i><i></i></div>`;
const brand = logoSrc => `<div class="nw-brand" data-anim="tab" data-brand-block><img src="${logoSrc}" alt="" data-brand></div>`;
const live = `<div class="nw-live" data-anim="tab"><div class="nw-flag"><span class="led led-light"></span>EN VIVO</div><div class="nw-clock" data-clock></div></div>`;

export const NEWS_LAYOUTS = {
  "lower-third": ({ logoSrc }) => `<div class="nw-lt">${brand(logoSrc)}<div class="nw-stack">
      <div class="nw-kicker" data-anim="tab" data-optional="kicker"><span class="led led-light"></span><span class="label" data-field="kicker"></span></div>
      <div class="plate nw-main" data-anim="plate"><strong class="primary" data-field="name" data-split></strong><i class="fx shine"></i><i class="fx nw-streak"></i></div>
      <div class="nw-band" data-anim="band" data-optional="role"><span class="secondary" data-field="role"></span></div></div>${wipe}</div>`,
  "single-line": () => `<div class="nw-sl"><div class="tag" data-anim="tab" data-optional="context"><span class="label" data-field="context"></span></div>
      <div class="plate nw-main" data-anim="plate"><strong class="primary" data-field="label" data-split></strong><i class="fx shine"></i><i class="fx nw-streak"></i></div>${wipe}</div>`,
  headline: () => `<div class="nw-hl">${live}<div class="nw-stack">
      <div class="nw-kicker" data-anim="tab" data-optional="kicker"><span class="label" data-field="kicker"></span></div>
      <div class="plate nw-main" data-anim="plate"><strong class="primary" data-field="headline" data-split></strong><i class="fx shine"></i><i class="fx nw-streak"></i></div></div>${wipe}</div>`,
  breaking: () => `<div class="nw-bk"><div class="nw-bk-label" data-anim="tab"><i class="fx nw-stripes"></i><span class="led led-light"></span><span class="label" data-field="label"></span></div>
      <div class="plate nw-bk-main" data-anim="plate"><strong class="primary" data-field="headline" data-split></strong><i class="fx shine"></i></div>
      <div class="nw-bk-clock" data-anim="tab"><span data-clock></span></div>${wipe}</div>`,
  location: () => `<div class="nw-loc"><div class="orb" data-anim="tab">${pin}</div><div class="nw-stack">
      <div class="nw-kicker" data-anim="tab" data-optional="status"><span class="led led-light"></span><span class="label" data-field="status"></span></div>
      <div class="plate nw-main" data-anim="plate"><strong class="primary" data-field="location" data-split></strong><span class="nw-time" data-clock></span><i class="fx shine"></i></div>
      <div class="nw-band" data-anim="band" data-optional="reporter"><span class="secondary" data-field="reporter"></span></div></div>${wipe}</div>`,
  ticker: ({ logoSrc }) => `<div class="nw-tk">${brand(logoSrc)}<div class="tag nw-tk-label" data-anim="tab"><span class="led led-light"></span><span class="label" data-field="label"></span></div>
      <div class="plate nw-tk-main" data-anim="plate"><div class="tk-window"><div class="tk-track"></div></div><i class="fx shine"></i></div>
      <div class="nw-tk-clock" data-anim="tab"><span data-clock></span></div></div>`,
  bug: ({ logoSrc }) => `<div class="nw-bug"><div class="nw-bug-flag" data-anim="tab" data-optional="status"><span class="led led-light"></span><span class="label" data-field="status"></span></div>
      <div class="plate nw-bug-main" data-anim="plate"><img class="nw-bug-logo" src="${logoSrc}" alt="" data-brand-block><strong class="primary" data-field="station"></strong><span class="nw-bug-clock" data-clock data-bug-clock></span><i class="fx shine"></i></div></div>`
};

// Partes que dependen de los datos o del estilo.
export function decorateNews(el, graphic) {
  for (const node of el.querySelectorAll("[data-brand-block]")) node.hidden = !graphic.style.brand;
  const bugClock = el.querySelector("[data-bug-clock]");
  if (bugClock) bugClock.hidden = !graphic.fields.clock;
}

// Un solo reloj de pared para todas las piezas (titular, cinta, mosca…).
const clockFormat = new Intl.DateTimeFormat("es-EC", { hour: "2-digit", minute: "2-digit", hour12: false });
export function tickWallClocks(root) {
  const text = clockFormat.format(new Date());
  for (const node of root.querySelectorAll("[data-clock]")) if (node.textContent !== text) node.textContent = text;
}
