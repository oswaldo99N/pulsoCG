// Ensayos en tiempo real: reproducen una transmisión completa usando las
// mismas acciones que el operador (mostrar, ocultar, marcador, relojes…).
// Sirven para ver el paquete en OBS/vMix y para pruebas de estrés.
// `speed` acelera las esperas (1 = tiempo real de ensayo, 20 = prueba rápida).

const wait = (ms, speed, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) return reject(new Error("aborted"));
  const timer = setTimeout(resolve, ms / speed);
  signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("aborted")); }, { once: true });
});

// Ayudantes sobre el estado actual (siempre se lee el último).
function helpers(ctx) {
  const items = template => ctx.state().items.filter(item => item.graphic.templateId === template);
  const one = (template, index = 0) => items(template)[index];
  const fields = item => ctx.state().items.find(entry => entry.id === item.id)?.graphic.fields ?? {};
  const update = (item, patch) => ctx.dispatch({ type: "item_update", id: item.id, graphic: { ...ctx.state().items.find(entry => entry.id === item.id).graphic, fields: { ...fields(item), ...patch } } });
  const show = (item, patch) => item && ctx.dispatch({ type: "item_show", id: item.id, graphic: patch ? { ...item.graphic, fields: { ...fields(item), ...patch } } : undefined });
  const hide = item => item && ctx.dispatch({ type: "item_hide", id: item.id });
  const timer = (item, key, op, value, run) => ctx.dispatch({ type: "item_timer", id: item.id, key, op, value, run });
  const add = (item, key, delta) => update(item, { [key]: String(Math.max(0, (parseInt(fields(item)[key], 10) || 0) + delta)) });
  // Muestra un gráfico un rato y lo retira: el patrón más común en una transmisión.
  const flash = async (item, patch, ms = 4000) => { if (!item) return; await show(item, patch); await ctx.wait(ms); await hide(item); await ctx.wait(700); };
  return { items, one, fields, update, show, hide, timer, add, flash };
}

const SCENARIOS = {
  news: [
    ["Mosca y cinta al aire", async h => { await h.show(h.one("bug")); await h.show(h.one("ticker")); }],
    ["Titular de apertura", async h => h.flash(h.one("headline"), null, 6000)],
    ["Presentadora", async h => h.flash(h.one("lower-third"), null, 5000)],
    ["Ubicación del enlace en vivo", async h => h.flash(h.one("location"), null, 5000)],
    ["Entrevistado", async h => h.flash(h.one("lower-third", 1), null, 5000)],
    ["Cita textual", async h => h.flash(h.one("quote"), null, 6000)],
    ["Última hora", async h => h.flash(h.one("breaking"), null, 7000)],
    ["Cambio de titular en vivo", async (h, ctx) => {
      const headline = h.one("headline");
      await h.show(headline);
      await ctx.wait(3500);
      await h.update(headline, { kicker: "ÚLTIMO MOMENTO", headline: "Autoridades confirman nuevas medidas para la ciudad" });
      await ctx.wait(4500);
      await h.hide(headline);
    }],
    ["Pantalla completa", async h => h.flash(h.one("fullscreen"), null, 6000)],
    ["A continuación", async h => h.flash(h.one("upcoming"), null, 5000)],
    ["Cierre", async h => { await h.hide(h.one("ticker")); await h.hide(h.one("bug")); }]
  ],

  soccer: [
    ["Previa del partido", async h => h.flash(h.one("matchup"), null, 5000)],
    ["Alineación local", async h => h.flash(h.one("lineup", 0), null, 6000)],
    ["Alineación visitante", async h => h.flash(h.one("lineup", 1), null, 6000)],
    ["Pitazo inicial: marcador y reloj", async h => {
      const sb = h.one("soccer-scorebug");
      await h.update(sb, { homeScore: "0", awayScore: "0", homeRed: "0", awayRed: "0", period: "1T", addedTime: "" });
      await h.timer(sb, "clock", "set", 0, true);
      await h.show(sb);
      await h.show(h.one("ticker"));
    }],
    ["Narrador", async h => h.flash(h.one("lower-third"), null, 4000)],
    ["Tarjeta amarilla (min 12)", async h => { await h.timer(h.one("soccer-scorebug"), "clock", "set", 12 * 60_000 + 4_000, true); await h.flash(h.one("card", 0), { cardType: "yellow", minute: "12'" }); }],
    ["¡GOL local! (min 23)", async h => {
      const sb = h.one("soccer-scorebug");
      await h.timer(sb, "clock", "set", 23 * 60_000 + 41_000, true);
      await h.add(sb, "homeScore", 1);
      await h.flash(h.one("score-event"), { label: "¡GOL!", minute: "23'", score: "DNO 1 - 0 ATS" }, 5000);
    }],
    ["Revisión VAR", async h => h.flash(h.one("game-event"), { label: "REVISIÓN VAR", detail: "Posible fuera de juego" }, 4000)],
    ["VAR confirma el gol", async h => h.flash(h.one("game-event"), { label: "VAR", detail: "Gol confirmado" }, 3000)],
    ["Fin del primer tiempo + estadísticas", async (h, ctx) => {
      const sb = h.one("soccer-scorebug");
      await h.update(sb, { addedTime: "2" });
      await ctx.wait(2000);
      await h.timer(sb, "clock", "stop");
      await h.update(sb, { addedTime: "" });
      await h.flash(h.one("match-stats"), { title: "ESTADÍSTICAS · PRIMER TIEMPO" }, 6000);
    }],
    ["Segundo tiempo", async h => { const sb = h.one("soccer-scorebug"); await h.update(sb, { period: "2T" }); await h.timer(sb, "clock", "set", 45 * 60_000, true); }],
    ["Cambio local (min 63)", async h => { await h.timer(h.one("soccer-scorebug"), "clock", "set", 63 * 60_000, true); await h.flash(h.one("substitution")); }],
    ["Roja al visitante (min 71)", async h => {
      const sb = h.one("soccer-scorebug");
      await h.timer(sb, "clock", "set", 71 * 60_000 + 12_000, true);
      await h.add(sb, "awayRed", 1);
      await h.flash(h.one("card", 1), { cardType: "red", minute: "71'" }, 5000);
    }],
    ["¡GOL visitante! (min 78)", async h => {
      const sb = h.one("soccer-scorebug");
      await h.timer(sb, "clock", "set", 78 * 60_000 + 30_000, true);
      await h.add(sb, "awayScore", 1);
      await h.flash(h.one("score-event"), { label: "¡GOL!", player: "Franco Aguirre", number: "10", team: "Atlético Sur", teamColor: "#1d4ed8", minute: "78'", score: "DNO 1 - 1 ATS" }, 5000);
    }],
    ["¡GOL local! (min 88)", async h => {
      const sb = h.one("soccer-scorebug");
      await h.timer(sb, "clock", "set", 88 * 60_000 + 5_000, true);
      await h.add(sb, "homeScore", 1);
      await h.flash(h.one("score-event"), { label: "¡GOLAZO!", player: "Sebastián Paredes", number: "10", team: "Deportivo Norte", teamColor: "#e10600", minute: "88'", score: "DNO 2 - 1 ATS" }, 5000);
    }],
    ["Tiempo añadido +4", async (h, ctx) => { const sb = h.one("soccer-scorebug"); await h.timer(sb, "clock", "set", 90 * 60_000, true); await h.update(sb, { addedTime: "4" }); await ctx.wait(4000); }],
    ["Figura del partido", async h => h.flash(h.one("player"), { stats: "1 gol · 1 asistencia · 89% de pases" }, 5000)],
    ["Final del partido", async (h, ctx) => {
      const sb = h.one("soccer-scorebug");
      await h.timer(sb, "clock", "stop");
      await h.update(sb, { period: "FINAL", addedTime: "" });
      await ctx.wait(1500);
      await h.hide(sb);
      await h.flash(h.one("matchup"), { homeScore: "2", awayScore: "1", status: "FINAL" }, 6000);
      await h.hide(h.one("ticker"));
    }]
  ],

  basket: [
    ["Previa", async h => h.flash(h.one("matchup"), null, 5000)],
    ["Quinteto inicial", async h => h.flash(h.one("lineup"), null, 5000)],
    ["Salto inicial: marcador y relojes", async h => {
      const sb = h.one("basket-scorebug");
      await h.update(sb, { homeScore: "0", awayScore: "0", homeFouls: "0", awayFouls: "0", homeTimeouts: "2", awayTimeouts: "2", period: "1º" });
      await h.timer(sb, "clock", "set", 600_000, true);
      await h.timer(sb, "shot", "set", 24_000, true);
      await h.show(sb);
    }],
    ["Primer cuarto en juego", async (h, ctx) => {
      const sb = h.one("basket-scorebug");
      const plays = [["home", 2], ["away", 3], ["home", 2], ["home", 1], ["away", 2], ["home", 3], ["away", 2], ["away", 1]];
      for (const [side, points] of plays) {
        await h.add(sb, `${side}Score`, points);
        await h.timer(sb, "shot", "set", 24_000, true);
        if (points === 1) await h.add(sb, `${side === "home" ? "away" : "home"}Fouls`, 1);
        await ctx.wait(1600);
      }
    }],
    ["¡Triple!", async h => { await h.add(h.one("basket-scorebug"), "homeScore", 3); await h.flash(h.one("score-event"), null, 4000); }],
    ["Faltas: el visitante entra en BONUS", async (h, ctx) => { const sb = h.one("basket-scorebug"); for (let i = 0; i < 4; i++) { await h.add(sb, "awayFouls", 1); await ctx.wait(500); } await ctx.wait(2500); }],
    ["Tiempo muerto", async h => {
      const sb = h.one("basket-scorebug");
      await h.timer(sb, "clock", "stop"); await h.timer(sb, "shot", "stop");
      await h.add(sb, "homeTimeouts", -1);
      await h.flash(h.one("game-event"), null, 4000);
    }],
    ["Posesión de 14 y último minuto (décimas)", async (h, ctx) => {
      const sb = h.one("basket-scorebug");
      await h.timer(sb, "clock", "set", 58_000, true);
      await h.timer(sb, "shot", "set", 14_000, true);
      await ctx.wait(5000);
    }],
    ["Cambio", async h => h.flash(h.one("substitution"))],
    ["Jugador destacado", async h => h.flash(h.one("player"), null, 5000)],
    ["Segundo cuarto: se reinician faltas", async h => {
      const sb = h.one("basket-scorebug");
      await h.update(sb, { period: "2º", homeFouls: "0", awayFouls: "0" });
      await h.timer(sb, "clock", "set", 600_000, true);
      await h.timer(sb, "shot", "set", 24_000, true);
    }],
    ["Medio tiempo: estadísticas y parciales", async (h, ctx) => {
      const sb = h.one("basket-scorebug");
      await ctx.wait(3000);
      await h.timer(sb, "clock", "stop"); await h.timer(sb, "shot", "stop");
      await h.flash(h.one("match-stats"), null, 5000);
      await h.flash(h.one("period-scores"), { periods: "1º | 25 | 23\n2º | 22 | 24" }, 5000);
    }],
    ["Final", async h => {
      const sb = h.one("basket-scorebug");
      await h.update(sb, { period: "4º", homeScore: "87", awayScore: "79" });
      await h.timer(sb, "clock", "set", 0, false);
      await h.hide(sb);
      await h.flash(h.one("period-scores"), { title: "RESULTADO FINAL" }, 5000);
      await h.flash(h.one("matchup"), { homeScore: "87", awayScore: "79", status: "FINAL" }, 5000);
    }]
  ],

  volley: [
    ["Previa", async h => h.flash(h.one("matchup"), null, 5000)],
    ["Alineación", async h => h.flash(h.one("lineup"), null, 5000)],
    ["Inicio: marcador", async h => {
      const sb = h.one("volley-scorebug");
      await h.update(sb, { homeSets: "0", awaySets: "0", homePoints: "0", awayPoints: "0", setNumber: "1", history: "", serve: "home" });
      await h.show(sb);
    }],
    ["Set 1: puntos y saque", async (h, ctx) => playSet(h, ctx, 15, 11)],
    ["Set 2 con tiempo muerto", async (h, ctx) => {
      await playSet(h, ctx, 7, 9, false);
      await h.flash(h.one("game-event"), null, 4000);
      await playSet(h, ctx, 13, 15);
    }],
    ["¡Punto!", async h => h.flash(h.one("score-event"), null, 4000)],
    ["Cambio", async h => h.flash(h.one("substitution"))],
    ["Set 3", async (h, ctx) => playSet(h, ctx, 15, 9)],
    ["Jugadora destacada", async h => h.flash(h.one("player"), null, 5000)],
    ["Resultado final", async (h, ctx) => {
      await h.hide(h.one("volley-scorebug"));
      await h.flash(h.one("period-scores"), { periods: "Set 1 | 15 | 11\nSet 2 | 13 | 15\nSet 3 | 15 | 9", total: "wins" }, 5000);
      await h.flash(h.one("match-stats"), null, 5000);
      await h.flash(h.one("matchup"), { homeScore: "2", awayScore: "1", status: "FINAL" }, 5000);
    }]
  ]
};

// Juega un set hasta el marcador indicado alternando puntos como un partido real;
// si `close`, cierra el set (parcial, sets ganados, siguiente set).
async function playSet(h, ctx, homeTarget, awayTarget, close = true) {
  const sb = h.one("volley-scorebug");
  let home = parseInt(h.fields(sb).homePoints, 10) || 0, away = parseInt(h.fields(sb).awayPoints, 10) || 0;
  let seed = homeTarget * 31 + awayTarget;
  while (home < homeTarget || away < awayTarget) {
    seed = (seed * 9301 + 49297) % 233280;
    const homeWins = away >= awayTarget || (home < homeTarget && seed / 233280 < (homeTarget - home) / (homeTarget - home + awayTarget - away));
    if (homeWins) home++; else away++;
    await h.update(sb, { homePoints: String(home), awayPoints: String(away), serve: homeWins ? "home" : "away" });
    await ctx.wait(450);
  }
  if (!close) return;
  const f = h.fields(sb);
  const winner = home > away ? "home" : "away";
  await h.update(sb, {
    history: [f.history, `${home}-${away}`].filter(Boolean).join(" "),
    [`${winner}Sets`]: String((parseInt(f[`${winner}Sets`], 10) || 0) + 1),
    homePoints: "0", awayPoints: "0", setNumber: String((parseInt(f.setNumber, 10) || 1) + 1)
  });
  await ctx.wait(1500);
}

export const SIMULATIONS = Object.fromEntries(Object.entries(SCENARIOS).map(([id, steps]) => [id, steps.map(([label]) => label)]));

// Ejecuta un ensayo. `dispatch(action)` aplica la acción como si la hiciera el
// operador y devuelve el estado nuevo; `state()` devuelve el estado actual.
export async function runSimulation({ preset, dispatch, state, speed = 1, signal, onStep = () => {} }) {
  const steps = SCENARIOS[preset];
  if (!steps) throw new Error("unknown_simulation");
  const ctx = { dispatch, state, wait: ms => wait(ms, speed, signal) };
  const h = helpers(ctx);
  await dispatch({ type: "hide_all" });
  for (let index = 0; index < steps.length; index++) {
    if (signal?.aborted) throw new Error("aborted");
    onStep({ index, total: steps.length, label: steps[index][0] });
    await steps[index][1](h, ctx);
    await ctx.wait(800);
  }
  onStep({ index: steps.length, total: steps.length, label: "Ensayo terminado" });
}
