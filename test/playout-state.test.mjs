import test from "node:test";
import assert from "node:assert/strict";
import { applyAction, initialState, persistedState, publicState } from "../src/playout-state.mjs";
import { formatClock, parseClock, parsePlayers, parseRows, timerValue } from "../public/sports.js";
import { PROFILE_PRESETS } from "../public/presets.js";
import { ANIMATION_PRESETS, COLOR_PRESETS, DESIGN_PRESETS, FONT_PRESETS, QUICK_POSITIONS, TEMPLATES, cleanGraphic, contrastText, defaultsFor, motionTiming } from "../public/templates.js";

const add = (state, templateId) => applyAction(state, { type: "item_add", templateId });
const last = state => state.items.at(-1);

test("incluye 10 plantillas generales y 12 deportivas", () => {
  const all = Object.values(TEMPLATES);
  assert.equal(all.filter(template => template.category === "general").length, 10);
  assert.equal(all.filter(template => template.category !== "general").length, 12);
  assert.ok(["soccer-scorebug", "basket-scorebug", "volley-scorebug", "card", "substitution", "lineup"].every(id => TEMPLATES[id]));
});

test("incluye diez paletas de color con una opción UPEC", () => {
  assert.equal(COLOR_PRESETS.length, 10);
  assert.ok(COLOR_PRESETS.some(preset => preset.id === "upec"));
  assert.ok(COLOR_PRESETS.every(preset => ["accent", "accent2", "background", "text"].every(key => /^#[0-9a-f]{6}$/.test(preset[key]))));
});

test("incluye materiales, fuentes, animaciones y nueve posiciones rápidas", () => {
  assert.equal(DESIGN_PRESETS.length, 6);
  assert.equal(FONT_PRESETS.length, 6);
  assert.equal(ANIMATION_PRESETS.length, 4);
  assert.equal(QUICK_POSITIONS.length, 9);
  const fallback = cleanGraphic({ templateId: "ticker", style: { skin: "classic", font: "comic", animation: "spin", align: "diagonal" } });
  assert.deepEqual([fallback.style.skin, fallback.style.font, fallback.style.animation, fallback.style.align], ["glass", "inter", "reveal", "left"]);
});

test("limita cada ajuste a su rango", () => {
  const graphic = cleanGraphic({ templateId: "headline", style: { scale: 5, x: -1200, y: -2000, accent: "#123456", background: "invalid", opacity: 4, speed: 9, autoOut: 12, shine: false } });
  assert.equal(graphic.style.scale, 1.6);
  assert.equal(graphic.style.x, -1000);
  assert.equal(graphic.style.y, -900);
  assert.equal(graphic.style.accent, "#123456");
  assert.equal(graphic.style.background, "#0e1015");
  assert.equal(graphic.style.opacity, 1);
  assert.equal(graphic.style.speed, 2);
  assert.equal(graphic.style.autoOut, 12);
  assert.equal(graphic.style.shine, false);
  assert.equal(cleanGraphic({ templateId: "headline", fields: { headline: "x".repeat(200) } }).fields.headline.length, 96);
});

test("la velocidad ajusta la duración y el contraste del texto es legible", () => {
  assert.ok(motionTiming({ speed: 2 }).enter < motionTiming({ speed: 1 }).enter);
  assert.equal(contrastText("#ffffff"), "#0b0c0e");
  assert.equal(contrastText("#0e1015"), "#ffffff");
});

test("migra el formato anterior de capas y cola a la lista, todo oculto", () => {
  const state = initialState({
    layers: { primary: { onAir: true, graphic: { templateId: "lower-third", fields: { name: "Ana", role: "X" } } }, ticker: { graphic: { templateId: "ticker" } } },
    queue: [{ id: "1", graphic: { templateId: "quote", fields: { quote: "Hola", source: "Yo" } } }]
  });
  assert.deepEqual(state.items.map(item => item.graphic.templateId), ["lower-third", "ticker", "quote"]);
  assert.ok(state.items.every(item => !item.onAir && item.phase === "idle"));
  assert.equal(initialState({}).items.length, 1);
});

test("reinicia siempre con todo oculto", () => {
  const state = initialState({ items: [{ id: "a", onAir: true, phase: "live", graphic: { templateId: "bug" } }] });
  assert.equal(state.items[0].onAir, false);
});

test("varios gráficos pueden estar en pantalla al mismo tiempo", () => {
  let state = initialState({ items: [] });
  for (const templateId of ["lower-third", "lower-third", "lower-third", "ticker", "bug"]) state = add(state, templateId);
  for (const item of state.items) state = applyAction(state, { type: "item_show", id: item.id });
  assert.equal(state.items.length, 5);
  assert.ok(state.items.every(item => item.onAir && item.phase === "entering"));
  const lowers = state.items.filter(item => item.graphic.templateId === "lower-third").map(item => item.graphic.style.y);
  assert.deepEqual(lowers, [0, -170, -340]);
});

test("ocultar afecta solo al gráfico indicado y ocultar todo afecta a todos", () => {
  let state = add(add(initialState({ items: [] }), "ticker"), "bug");
  const [ticker, bug] = state.items;
  state = applyAction(state, { type: "item_show", id: ticker.id });
  state = applyAction(state, { type: "item_show", id: bug.id });
  state = applyAction(state, { type: "item_hide", id: ticker.id });
  assert.equal(state.items[0].phase, "exiting");
  assert.equal(state.items[1].phase, "entering");
  state = applyAction(state, { type: "hide_all" });
  assert.ok(state.items.every(item => item.phase === "exiting"));
});

test("no se muestra con campos obligatorios vacíos", () => {
  let state = add(initialState({ items: [] }), "quote");
  const result = applyAction(state, { type: "item_show", id: last(state).id, graphic: { fields: { quote: "", source: "" } } });
  assert.equal(result.error, "validation");
  assert.ok(result.errors.quote && result.errors.source);
});

test("editar un gráfico visible lo actualiza en pantalla; uno oculto solo se guarda", () => {
  let state = add(initialState({ items: [] }), "lower-third");
  const id = last(state).id;
  state = applyAction(state, { type: "item_update", id, graphic: { fields: { name: "Oculto", role: "R" } } });
  assert.equal(last(state).phase, "idle");
  assert.equal(last(state).graphic.fields.name, "Oculto");
  state = applyAction(state, { type: "item_show", id });
  state = applyAction(state, { type: "settle", id, itemRevision: last(state).revision, phase: "live", onAir: true });
  state = applyAction(state, { type: "item_update", id, graphic: { fields: { name: "En vivo", role: "R" }, style: { x: 120 } } });
  assert.equal(last(state).phase, "updating");
  assert.equal(last(state).graphic.style.x, 120);
});

test("duplicar coloca la copia encima y eliminar la quita", () => {
  let state = add(initialState({ items: [] }), "lower-third");
  const original = last(state);
  state = applyAction(state, { type: "item_duplicate", id: original.id });
  assert.equal(state.items.length, 2);
  assert.equal(state.items[1].graphic.style.y, original.graphic.style.y - 170);
  assert.equal(state.items[1].onAir, false);
  state = applyAction(state, { type: "item_delete", id: original.id });
  assert.equal(state.items.length, 1);
});

test("los gráficos nuevos heredan el estilo del último", () => {
  let state = add(initialState({ items: [] }), "lower-third");
  state = applyAction(state, { type: "item_update", id: last(state).id, graphic: { fields: defaultsFor("lower-third"), style: { skin: "metal", accent: "#00ff00" } } });
  state = add(state, "headline");
  assert.equal(last(state).graphic.style.skin, "metal");
  assert.equal(last(state).graphic.style.accent, "#00ff00");
});

test("guarda, reemplaza y elimina estilos sin datos de posición", () => {
  let state = initialState({ items: [] });
  state = applyAction(state, { type: "preset_save", name: "Noche", style: { skin: "aurora", x: 400, scale: 1.4 } });
  assert.equal(state.presets[0].style.skin, "aurora");
  assert.equal(state.presets[0].style.x, undefined);
  state = applyAction(state, { type: "preset_save", name: "Noche", style: { skin: "metal" } });
  assert.equal(state.presets.length, 1);
  assert.equal(applyAction(state, { type: "preset_save", name: "  " }).error, "validation");
  state = applyAction(state, { type: "preset_delete", id: state.presets[0].id });
  assert.equal(state.presets.length, 0);
});

test("aplica un estilo a todos conservando su posición", () => {
  let state = add(add(initialState({ items: [] }), "lower-third"), "ticker");
  state = applyAction(state, { type: "item_show", id: state.items[1].id });
  state = applyAction(state, { type: "apply_look_all", style: { skin: "frost", accent: "#112233", y: -500 } });
  assert.ok(state.items.every(item => item.graphic.style.skin === "frost"));
  assert.equal(state.items[0].graphic.style.y, 0);
  assert.equal(state.items[1].phase, "updating");
});

test("todo lo que se muestra queda en Guardados sin repetirse", () => {
  let state = add(initialState({ items: [] }), "lower-third");
  const id = last(state).id;
  const show = name => {
    state = applyAction(state, { type: "item_update", id, graphic: { fields: { kicker: "EN VIVO", name, role: "Invitado" } } });
    state = applyAction(state, { type: "item_show", id });
    state = applyAction(state, { type: "item_hide", id });
  };
  show("Ana Ruiz"); show("Luis Paz"); show("Ana Ruiz");
  assert.deepEqual(state.library.map(entry => entry.fields.name), ["Luis Paz", "Ana Ruiz"]);
  state = applyAction(state, { type: "library_delete", id: state.library[0].id });
  assert.equal(state.library.length, 1);
});

test("pegar una lista guarda una entrada por línea", () => {
  let state = applyAction(initialState({ items: [] }), { type: "library_import", templateId: "lower-third", text: "Ana Ruiz | Alcaldesa\nCarlos Mena - Economista\n\nLucía Paz\tCorresponsal" });
  assert.equal(state.imported, 3);
  assert.deepEqual(state.library.map(entry => [entry.fields.name, entry.fields.role]), [["Ana Ruiz", "Alcaldesa"], ["Carlos Mena", "Economista"], ["Lucía Paz", "Corresponsal"]]);
  assert.equal(applyAction(state, { type: "library_import", templateId: "headline", text: "  \n" }).error, "validation");
  state = applyAction(state, { type: "library_save", templateId: "headline", fields: { headline: "Nueva ley", kicker: "NACIONAL" } });
  assert.equal(state.library.at(-1).templateId, "headline");
});

test("los perfiles conservan sus gráficos y guardados al cambiar", () => {
  let state = add(initialState({ items: [] }), "lower-third");
  state = applyAction(state, { type: "library_import", templateId: "lower-third", text: "Ana | Alcaldesa" });
  const firstProfile = state.activeProfile;
  state = applyAction(state, { type: "item_show", id: last(state).id });
  state = applyAction(state, { type: "profile_create", name: "Deportes" });
  assert.equal(state.profiles.length, 2);
  assert.equal(state.items.length, 0);
  assert.equal(state.library.length, 0);
  state = add(state, "ticker");
  state = applyAction(state, { type: "profile_switch", id: firstProfile });
  assert.equal(state.items.length, 1);
  assert.equal(state.items[0].onAir, false);
  assert.ok(state.library.some(entry => entry.fields.name === "Ana"));
  const summary = publicState(state).profiles;
  assert.deepEqual(summary.map(profile => [profile.name, profile.itemCount]), [["Principal", 1], ["Deportes", 1]]);
  assert.equal(publicState(state).profileData, undefined);
});

test("copiar, renombrar, eliminar e importar perfiles", () => {
  let state = add(initialState({ items: [] }), "headline");
  state = applyAction(state, { type: "profile_create", name: "Copia", copy: true });
  assert.equal(state.items.length, 1);
  state = applyAction(state, { type: "profile_rename", id: state.activeProfile, name: "Noche" });
  assert.equal(state.profiles.at(-1).name, "Noche");
  state = applyAction(state, { type: "profile_delete", id: state.activeProfile });
  assert.equal(state.profiles.length, 1);
  assert.equal(applyAction(state, { type: "profile_delete", id: state.activeProfile }).error, "validation");
  state = applyAction(state, { type: "profile_import", data: { name: "Importado", items: [{ id: "x", graphic: { templateId: "quote" } }], library: [{ templateId: "quote", fields: { quote: "Hola", source: "Yo" } }] } });
  assert.equal(state.profiles.at(-1).name, "Importado");
  assert.equal(state.items[0].graphic.templateId, "quote");
  assert.equal(state.library.length, 1);
});

test("los datos guardados sobreviven a un reinicio con varios perfiles", () => {
  let state = add(initialState({ items: [] }), "lower-third");
  state = applyAction(state, { type: "profile_create", name: "B" });
  state = add(state, "bug");
  const restored = initialState(JSON.parse(JSON.stringify(persistedState(state))));
  assert.equal(restored.profiles.length, 2);
  assert.equal(restored.items[0].graphic.templateId, "bug");
  assert.equal(Object.values(restored.profileData)[0].items[0].graphic.templateId, "lower-third");
});

test("relojes: corren, se pausan, se ajustan y no reinician la animación", async () => {
  let state = add(initialState({ items: [] }), "basket-scorebug");
  const id = last(state).id;
  assert.equal(last(state).timers.clock.baseMs, 600_000);
  assert.equal(last(state).timers.shot.baseMs, 24_000);
  state = applyAction(state, { type: "item_show", id });
  const revision = last(state).revision;
  state = applyAction(state, { type: "item_timer", id, key: "clock", op: "start" });
  assert.equal(last(state).timers.clock.running, true);
  assert.equal(last(state).revision, revision);
  await new Promise(resolve => setTimeout(resolve, 60));
  state = applyAction(state, { type: "item_timer", id, key: "clock", op: "stop" });
  assert.ok(last(state).timers.clock.baseMs < 600_000 && last(state).timers.clock.baseMs > 599_000);
  state = applyAction(state, { type: "item_timer", id, key: "shot", op: "set", value: 14_000, run: true });
  assert.deepEqual([last(state).timers.shot.baseMs, last(state).timers.shot.running], [14_000, true]);
  assert.equal(applyAction(state, { type: "item_timer", id, key: "nada", op: "start" }).error, "not_found");
  const restored = initialState(JSON.parse(JSON.stringify(persistedState(state))));
  assert.equal(restored.items[0].timers.shot.running, false);
  assert.ok(restored.items[0].timers.shot.baseMs <= 14_000);
});

test("formato de relojes como en TV", () => {
  assert.equal(formatClock(parseClock("67:32"), "mmss", "up"), "67:32");
  assert.equal(formatClock(47_300, "basket", "down"), "47.3");
  assert.equal(formatClock(125_000, "basket", "down"), "02:05");
  assert.equal(formatClock(4_200, "seconds", "down"), "5");
  assert.equal(timerValue({ running: true, baseMs: 10_000, startedAt: 1000 }, 4000, "down"), 7000);
  assert.equal(timerValue({ running: true, baseMs: 1_000, startedAt: 0 }, 9000, "down"), 0);
});

test("colores y listas de las plantillas deportivas se validan", () => {
  const graphic = cleanGraphic({ templateId: "card", fields: { cardType: "verde", teamColor: "rojo" } });
  assert.equal(graphic.fields.cardType, "yellow");
  assert.equal(graphic.fields.teamColor, "#e10600");
  assert.equal(cleanGraphic({ templateId: "volley-scorebug", fields: { serve: "away" } }).fields.serve, "away");
  assert.deepEqual(parsePlayers("10 Ana Ruiz\n#7 - Luis\nSin número"), [{ number: "10", name: "Ana Ruiz" }, { number: "7", name: "Luis" }, { number: "", name: "Sin número" }]);
  assert.deepEqual(parseRows("Posesión | 58% | 42%"), [["Posesión", "58%", "42%"]]);
});

test("perfiles listos: noticias, fútbol, básquet y vóley sin tocar los demás", () => {
  let state = add(initialState({ items: [] }), "headline");
  const original = state.activeProfile;
  for (const preset of PROFILE_PRESETS) {
    state = applyAction(state, { type: "profile_create_preset", preset: preset.id });
    assert.equal(state.items.length, preset.items.length);
    assert.ok(state.items.every(item => item.onAir === false));
    if (preset.id !== "news") assert.ok(state.items[0].graphic.templateId.endsWith("scorebug"));
    assert.equal(state.items[0].graphic.style.font, preset.style.font);
    assert.ok(state.library.some(entry => entry.templateId === (preset.id === "news" ? "lower-third" : "player")));
  }
  assert.deepEqual(state.profiles.map(profile => profile.name), ["Principal", "Noticias", "Fútbol", "Básquet", "Ecuavóley · Ecuador"]);
  assert.equal(applyAction(state, { type: "profile_create_preset", preset: "golf" }).error, "not_found");
  state = applyAction(state, { type: "profile_switch", id: original });
  assert.deepEqual(state.items.map(item => item.graphic.templateId), ["headline"]);
});

test("cada perfil listo tiene un ensayo y todos sus pasos encuentran sus gráficos", async () => {
  const { runSimulation, SIMULATIONS } = await import("../src/simulation.mjs");
  for (const preset of PROFILE_PRESETS) {
    assert.ok(SIMULATIONS[preset.id]?.length > 5, preset.id);
    let state = applyAction(initialState({ items: [] }), { type: "profile_create_preset", preset: preset.id });
    const dispatch = async action => { const next = applyAction(state, action); if (next.error) throw new Error(`${preset.id}: ${action.type} → ${next.error}`); state = next; return state; };
    await runSimulation({ preset: preset.id, dispatch, state: () => state, speed: 1e6 });
    if (preset.id === "soccer") assert.equal(state.items.find(item => item.graphic.templateId === "matchup").graphic.fields.status, "FINAL");
    if (preset.id === "volley") assert.equal(state.items.find(item => item.graphic.templateId === "volley-scorebug").graphic.fields.homeSets, "2");
  }
});

test("vóley: un set compartido, ganados desde parciales y final sin sexto set", async () => {
  const { normalizeVolley, volleyMatch } = await import('../public/sports.js');
  const f = { ...defaultsFor('volley-scorebug'), history: '25-21 23-25', homeSets: '3', awaySets: '3', setNumber: '5' };
  const normalized = normalizeVolley(f);
  assert.equal(normalized.setNumber, '3');
  assert.equal(normalized.homeSets, '1');
  assert.equal(normalized.awaySets, '1');
  assert.equal(volleyMatch({ ...f, homePoints: '25', awayPoints: '24' }).canClose, false);
  assert.equal(volleyMatch({ ...f, homePoints: '26', awayPoints: '24' }).canClose, true);
  const end = normalizeVolley({ ...f, history: '25-21 23-25 25-20 20-25 15-12' });
  assert.equal(end.setNumber, '5');
  assert.equal(end.homeSets, '3');
  assert.equal(volleyMatch(end).finished, true);
});

test("ecuavóley: ganar saque no suma punto; cierre y gráficos se sincronizan", async () => {
  const { volleyRally, assetUrl } = await import('../public/sports.js');
  let state = applyAction(initialState(), { type: 'profile_create_preset', preset: 'volley' });
  const sb = state.items.find(i => i.graphic.templateId === 'volley-scorebug');
  let f = volleyRally(sb.graphic.fields, 'away');
  assert.equal(f.awayPoints, '0');
  assert.equal(f.serve, 'away');
  f = volleyRally(f, 'away');
  assert.equal(f.awayPoints, '1');
  assert.ok(assetUrl(f.homeLogo).endsWith('flag-ecuador.svg'));
  state = applyAction(state, { type: 'item_update', id: sb.id, graphic: { ...sb.graphic, fields: { ...f, homeName: 'QUITO', history: '15-11 13-15', homePoints: '8', awayPoints: '7' } } });
  const get = type => state.items.find(i => i.graphic.templateId === type).graphic.fields;
  assert.equal(get('volley-scorebug').setNumber, '3');
  assert.equal(get('matchup').homeName, 'QUITO');
  assert.equal(get('matchup').homeScore, '1');
  assert.equal(get('substitution').minute, 'SET 3');
  assert.equal(get('period-scores').periods, 'Set 1 | 15 | 11\nSet 2 | 13 | 15');
  assert.equal(get('player').team, 'QUITO');
  assert.equal(get('player').teamLogo, 'flag-ecuador');
});

test("avisos de vóley: punto de set y partido solo con tanteo y saque válidos", () => {
  let state = applyAction(initialState(), { type: 'profile_create_preset', preset: 'volley' });
  const find = context => state.items.find(i => i.graphic.fields.context === context);
  const sb = state.items.find(i => i.graphic.templateId === 'volley-scorebug');
  assert.equal(applyAction(state, { type: 'item_show', id: find('set-point').id }).error, 'validation');
  state = applyAction(state, { type: 'item_update', id: sb.id, graphic: { ...sb.graphic, fields: { ...sb.graphic.fields, homePoints: '14', awayPoints: '13', serve: 'home', history: '15-10' } } });
  const point = find('match-point');
  assert.match(point.graphic.fields.detail, /set 2/);
  state = applyAction(state, { type: 'item_show', id: point.id });
  assert.equal(state.items.find(i => i.id === point.id).onAir, true);
  const current = state.items.find(i => i.id === sb.id);
  state = applyAction(state, { type: 'item_update', id: sb.id, graphic: { ...current.graphic, fields: { ...current.graphic.fields, awayPoints: '14', serve: 'away' } } });
  assert.equal(state.items.find(i => i.id === point.id).phase, 'exiting');
  assert.equal(applyAction(state, { type: 'item_show', id: point.id }).error, 'validation');
});

test("avisos de vóley: resultado del set sincroniza ganador, parcial y logo", () => {
  let state = applyAction(initialState(), { type: 'profile_create_preset', preset: 'volley' });
  const sb = state.items.find(i => i.graphic.templateId === 'volley-scorebug');
  const result = state.items.find(i => i.graphic.fields.context === 'set-result');
  assert.equal(applyAction(state, { type: 'item_show', id: result.id }).error, 'validation');
  state = applyAction(state, { type: 'item_update', id: sb.id, graphic: { ...sb.graphic, fields: { ...sb.graphic.fields, homeName: 'UPEC', history: '15-11 13-15' } } });
  const f = state.items.find(i => i.id === result.id).graphic.fields;
  assert.equal(f.detail, 'PERÚ · set 2: 13-15');
  assert.equal(f.teamLogo, 'flag-peru');
  assert.equal(applyAction(state, { type: 'item_show', id: result.id }).error, undefined);
});

test("vóley completo: 16 gráficos, dos alineaciones y avisos del partido", () => {
  const preset = PROFILE_PRESETS.find(p => p.id === 'volley');
  assert.equal(preset.items.length, 16);
  assert.equal(preset.items.filter(i => i.templateId === 'lineup').length, 2);
  assert.ok(preset.items.some(i => i.fields?.label === 'CAMBIO DE CANCHA'));
  for (const context of ['set-point', 'match-point', 'set-result']) assert.ok(preset.items.some(i => i.fields?.context === context));
});

test("guardar un aviso conserva su vínculo con el marcador", () => {
  let state = applyAction(initialState(), { type: 'profile_create_preset', preset: 'volley' });
  const item = state.items.find(i => i.graphic.fields.context === 'set-point');
  state = applyAction(state, { type: 'library_save', templateId: item.graphic.templateId, fields: item.graphic.fields });
  assert.equal(state.library.at(-1).fields.context, 'set-point');
});
