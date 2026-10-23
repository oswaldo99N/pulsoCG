// Perfiles listos para usar: cada uno trae sus gráficos ya acomodados, un
// estilo propio y "Guardados" de ejemplo (planteles y avisos frecuentes).
// Los equipos son ficticios: el operador cambia nombres, siglas y colores.

const roster = (team, color, players) => players.map(([number, name, position]) => ({ templateId: "player", fields: { number, name, position, team, stats: "" }, color }));
const events = labels => labels.map(([label, detail]) => ({ templateId: "game-event", fields: { label, detail, team: "" } }));

// Posiciones en pantalla (desplazamientos desde el ancla de cada plantilla).
const LOWER_LEFT = { align: "left", x: 0, y: 0 };
const LOWER_RIGHT = { align: "right", x: 0, y: 0 };
const TOP_CENTER = { align: "center", x: 0, y: -720 };

// Estilo premium del paquete de noticias (también se aplica al perfil Principal).
export const NEWS_STYLE = { skin: "glass", font: "inter-tight", accent: "#e3132b", accent2: "#ff5a36", background: "#0b1020", text: "#ffffff", radius: 6, primaryWeight: 800, opacity: .86, shadow: .8, grain: .3, animation: "reveal", brand: true };

export const PROFILE_PRESETS = [
  {
    id: "news", name: "Noticias", icon: "newspaper",
    note: "Rótulos en dos niveles, titular con EN VIVO y reloj, última hora, cinta y mosca del canal.",
    style: NEWS_STYLE,
    items: [
      { templateId: "bug", style: { x: 0, y: 0 } },
      { templateId: "lower-third", fields: { kicker: "EN VIVO", name: "Valentina Torres", role: "Periodista · Pulso Noticias" }, style: LOWER_LEFT },
      { templateId: "lower-third", fields: { kicker: "ENTREVISTA", name: "Carlos Mena", role: "Economista · Universidad Central" }, style: LOWER_RIGHT },
      { templateId: "headline", style: { align: "left", x: 0, y: 0 } },
      { templateId: "breaking" },
      { templateId: "location", style: LOWER_LEFT },
      { templateId: "single-line", style: LOWER_LEFT },
      { templateId: "quote", style: LOWER_LEFT },
      { templateId: "upcoming", style: LOWER_LEFT },
      { templateId: "fullscreen" },
      { templateId: "ticker" }
    ],
    library: [
      { templateId: "lower-third", fields: { kicker: "", name: "Andrea Salazar", role: "Ministra de Gobierno" } },
      { templateId: "lower-third", fields: { kicker: "", name: "Jorge Andrade", role: "Analista político" } },
      { templateId: "lower-third", fields: { kicker: "", name: "Camila Andrade", role: "Corresponsal en Tulcán" } },
      { templateId: "headline", fields: { kicker: "NACIONAL", headline: "Asamblea aprueba la reforma tributaria en segundo debate" } },
      { templateId: "headline", fields: { kicker: "ECONOMÍA", headline: "El precio del combustible se mantiene estable este mes" } },
      { templateId: "breaking", fields: { label: "ÚLTIMA HORA", headline: "Se registra un sismo de magnitud 5,2 en la zona norte" } }
    ]
  },
  {
    id: "soccer", name: "Fútbol", icon: "goal",
    note: "Marcador con reloj, alineaciones en cancha, tarjetas, cambios, gol, VAR y estadísticas.",
    style: { skin: "glass", font: "inter-tight", accent: "#00d26a", accent2: "#c6ff3d", background: "#0a1226", text: "#f4f7ff", radius: 8, primaryWeight: 800, animation: "reveal" },
    items: [
      { templateId: "soccer-scorebug", style: { x: 0, y: 0 } },
      { templateId: "matchup" },
      { templateId: "lineup" },
      { templateId: "lineup", fields: { team: "Atlético Sur", formation: "4-4-2", teamColor: "#1d4ed8", coach: "Raúl Benítez", players: "1 Hernán Díaz\n2 Ángel Zambrano\n6 Marco Lozano\n4 Ricardo Pinto\n3 Josué Vera\n7 Fabián Cortez\n8 Óscar Rivas\n5 Joel Arias\n11 Wilmer Castro\n9 Nicolás Torres\n10 Franco Aguirre", bench: "12 Iván Nieto\n15 Edison Mora\n17 Cristian León" } },
      { templateId: "card", style: LOWER_LEFT },
      { templateId: "card", fields: { cardType: "red", player: "Óscar Rivas", number: "8", minute: "71'", team: "Atlético Sur", teamColor: "#1d4ed8" }, style: LOWER_RIGHT },
      { templateId: "substitution", style: LOWER_LEFT },
      { templateId: "score-event", style: LOWER_LEFT },
      { templateId: "game-event", style: TOP_CENTER },
      { templateId: "player", style: LOWER_LEFT },
      { templateId: "match-stats" },
      { templateId: "lower-third", fields: { kicker: "NARRACIÓN", name: "Jorge Andrade", role: "Relator · Pulso Deportes" }, style: LOWER_LEFT },
      { templateId: "ticker", fields: { label: "RESULTADOS", items: "Club Andino 2 - 1 Unión Costa | Real Valle 0 - 0 Sporting Lago | Ciudad FC 3 - 2 Estrella Roja" } }
    ],
    library: [
      ...roster("Deportivo Norte", "#e10600", [["1", "Carlos Pérez", "ARQUERO"], ["2", "Juan Mora", "DEFENSA"], ["4", "Diego Lara", "DEFENSA"], ["5", "Pablo Ríos", "DEFENSA"], ["3", "Iván Cruz", "DEFENSA"], ["6", "Kevin Soto", "MEDIOCAMPISTA"], ["8", "Mateo Ruiz", "MEDIOCAMPISTA"], ["10", "Sebastián Paredes", "MEDIOCAMPISTA"], ["7", "Bryan León", "DELANTERO"], ["9", "Andrés Mena", "DELANTERO"], ["11", "Luis Vega", "DELANTERO"], ["19", "Daniel Ortiz", "DELANTERO"]]),
      ...roster("Atlético Sur", "#1d4ed8", [["1", "Hernán Díaz", "ARQUERO"], ["8", "Óscar Rivas", "MEDIOCAMPISTA"], ["9", "Nicolás Torres", "DELANTERO"], ["10", "Franco Aguirre", "DELANTERO"]]),
      ...events([["REVISIÓN VAR", "Posible penal"], ["REVISIÓN VAR", "Posible fuera de juego"], ["VAR", "Gol anulado"], ["VAR", "Penal confirmado"], ["ATENCIÓN MÉDICA", "Jugador lesionado"], ["PAUSA DE HIDRATACIÓN", "Se reanuda en 3 minutos"]])
    ]
  },
  {
    id: "basket", name: "Básquet", icon: "circle-dot",
    note: "Marcador con cuarto, reloj, posesión de 24, faltas, bonus y tiempos muertos.",
    style: { skin: "satin", font: "oswald", accent: "#ff7a1a", accent2: "#ffc247", background: "#120d0a", text: "#fff7ef", radius: 4, primaryWeight: 700, animation: "slide" },
    items: [
      { templateId: "basket-scorebug", style: { x: 0, y: 0 } },
      { templateId: "matchup", fields: { competition: "LIGA NACIONAL · JORNADA 5", homeName: "Halcones del Norte", awayName: "Toros del Sur", status: "HOY · 20:30", venue: "Coliseo Municipal", homeColor: "#f97316", awayColor: "#7c3aed" } },
      { templateId: "lineup", fields: { team: "Halcones del Norte", formation: "", teamColor: "#f97316", coach: "Ernesto Vallejo", players: "4 Ramiro Solís\n7 Kevin Bravo\n11 Jairo Méndez\n15 Darío Quintero\n23 Marlon Reyes", bench: "5 Luis Cano\n9 Samuel Ibarra\n13 Teo Garzón\n21 Iker Ponce" } },
      { templateId: "player", fields: { number: "23", position: "PÍVOT", name: "Marlon Reyes", team: "Halcones del Norte", stats: "18 PTS · 11 REB · 2 TAP", teamColor: "#f97316" }, style: LOWER_LEFT },
      { templateId: "score-event", fields: { label: "¡TRIPLE!", minute: "Q2 · 03:12", player: "Kevin Bravo", number: "7", team: "Halcones del Norte", score: "NOR 41 - 38 SUR", teamColor: "#f97316" }, style: LOWER_LEFT },
      { templateId: "substitution", fields: { inName: "Samuel Ibarra", inNumber: "9", outName: "Jairo Méndez", outNumber: "11", team: "Halcones del Norte", minute: "Q3", teamColor: "#f97316" }, style: LOWER_LEFT },
      { templateId: "game-event", fields: { label: "TIEMPO MUERTO", detail: "Halcones del Norte", team: "", teamColor: "#f97316" }, style: TOP_CENTER },
      { templateId: "match-stats", fields: { title: "ESTADÍSTICAS · MEDIO TIEMPO", homeName: "NOR", awayName: "SUR", rows: "Tiros de campo | 48% | 42%\nTriples | 6/15 | 4/14\nRebotes | 21 | 17\nAsistencias | 12 | 9\nPérdidas | 6 | 9\nRobos | 5 | 3", homeColor: "#f97316", awayColor: "#7c3aed" } },
      { templateId: "period-scores", fields: { homeName: "Norte", awayName: "Sur", homeColor: "#f97316", awayColor: "#7c3aed" } },
      { templateId: "lower-third", fields: { kicker: "COMENTARIO", name: "Paola Cevallos", role: "Analista · Pulso Deportes" }, style: LOWER_LEFT }
    ],
    library: [
      ...roster("Halcones del Norte", "#f97316", [["4", "Ramiro Solís", "BASE"], ["7", "Kevin Bravo", "ESCOLTA"], ["11", "Jairo Méndez", "ALERO"], ["15", "Darío Quintero", "ALA-PÍVOT"], ["23", "Marlon Reyes", "PÍVOT"], ["9", "Samuel Ibarra", "ALERO"]]),
      ...roster("Toros del Sur", "#7c3aed", [["3", "Andrés Cobo", "BASE"], ["10", "Felipe Arce", "ESCOLTA"], ["12", "Gabriel Ruiz", "ALERO"], ["33", "Omar Bastidas", "PÍVOT"]]),
      ...events([["TIEMPO MUERTO", "Halcones del Norte"], ["TIEMPO MUERTO", "Toros del Sur"], ["FALTA ANTIDEPORTIVA", "Dos tiros libres y posesión"], ["REVISIÓN ARBITRAL", "Se revisa la jugada"], ["QUINTA FALTA", "Jugador eliminado"]])
    ]
  },
  {
    id: "volley", name: "Ecuavóley · Ecuador", icon: "volleyball",
    note: "Ecuavóley: tres jugadores, al mejor de tres sets, puntos con saque y parciales sincronizados. Reglas ajustables.",
    style: { skin: "glass", font: "manrope", accent: "#ffcc33", accent2: "#3ec6ff", background: "#0a1838", text: "#f5f9ff", radius: 12, primaryWeight: 800, animation: "rise" },
    items: [
      { templateId: "volley-scorebug", fields: { homeLogo: "flag-ecuador", awayLogo: "flag-peru", scoring: "sideout", bestOf: "3", pointsToWin: "15", decidingPoints: "15", competition: "ECUAVÓLEY · ECUADOR" }, style: { x: 0, y: 0 } },
      { templateId: "matchup", fields: { competition: "LIGA DE VÓLEY · SEMIFINAL", homeName: "Ecuador", awayName: "Perú", status: "HOY · 18:00", venue: "Coliseo Mayor", homeColor: "#facc15", awayColor: "#dc2626" } },
      { templateId: "lineup", fields: { team: "Ecuador", formation: "", teamColor: "#facc15", coach: "Lorena Viteri", players: "1 Andrea Mora (Colocadora)\n4 Camila Reyes (Servidora)\n7 Daniela Paz (Voladora)", bench: "2 Paula Rivas\n8 Elena Mejía\n14 Karla Soto" } },
      { templateId: "lineup", fields: { team: "Perú", formation: "", teamColor: "#dc2626", teamLogo: "flag-peru", coach: "Entrenador visitante", players: "2 Jugadora 1 (Colocadora)\n6 Jugadora 2 (Servidora)\n11 Jugadora 3 (Voladora)", bench: "12 Suplente 1\n14 Suplente 2" } },
      { templateId: "player", fields: { number: "1", position: "COLOCADORA", name: "Andrea Mora", team: "Ecuador", stats: "5 puntos · 2 bloqueos", teamColor: "#facc15" }, style: LOWER_LEFT },
      { templateId: "score-event", fields: { label: "¡PUNTO!", minute: "SET 2", player: "Camila Reyes", number: "4", team: "Ecuador", score: "ECU 18 - 15 PER", teamColor: "#facc15" }, style: LOWER_LEFT },
      { templateId: "substitution", fields: { inName: "Paula Rivas", inNumber: "2", outName: "Andrea Mora", outNumber: "1", team: "Ecuador", minute: "SET 3", teamColor: "#facc15" }, style: LOWER_LEFT },
      { templateId: "game-event", fields: { label: "TIEMPO MUERTO", detail: "Pausa solicitada por el equipo", team: "Ecuador", teamColor: "#facc15" }, style: TOP_CENTER },
      { templateId: "game-event", fields: { label: "TIEMPO MUERTO", detail: "Pausa solicitada por el equipo", team: "Perú", teamColor: "#dc2626" }, style: TOP_CENTER },
      { templateId: "game-event", fields: { label: "PUNTO DE SET", context: "set-point" }, style: TOP_CENTER },
      { templateId: "game-event", fields: { label: "PUNTO DE PARTIDO", context: "match-point" }, style: TOP_CENTER },
      { templateId: "game-event", fields: { label: "RESULTADO DEL SET", context: "set-result" }, style: { ...TOP_CENTER, autoOut: 8 } },
      { templateId: "game-event", fields: { label: "CAMBIO DE CANCHA", detail: "Los equipos intercambian lados", team: "" }, style: { ...TOP_CENTER, autoOut: 8 } },
      { templateId: "match-stats", fields: { title: "ESTADÍSTICAS DEL PARTIDO", homeName: "ECU", awayName: "PER", rows: "Ataques | 42 | 37\nBloqueos | 9 | 6\nAces | 5 | 3\nErrores propios | 14 | 19\nEficiencia en recepción | 61% | 54%", homeColor: "#facc15", awayColor: "#dc2626" } },
      { templateId: "period-scores", fields: { title: "PARCIALES POR SET", homeName: "Ecuador", awayName: "Perú", periods: "Set 1 | 15 | 11\nSet 2 | 13 | 15\nSet 3 | 15 | 9", total: "wins", homeColor: "#facc15", awayColor: "#dc2626" } },
      { templateId: "lower-third", fields: { kicker: "NARRACIÓN", name: "Diego Almeida", role: "Relator · Pulso Deportes" }, style: LOWER_LEFT }
    ],
    library: [
      ...roster("Ecuador", "#facc15", [["1", "Andrea Mora", "COLOCADORA"], ["4", "Camila Reyes", "SERVIDORA"], ["7", "Daniela Paz", "VOLADORA"], ["2", "Paula Rivas", "SERVIDORA"], ["8", "Elena Mejía", "VOLADORA"], ["14", "Karla Soto", "COLOCADORA"]]),
      ...roster("Perú", "#dc2626", [["2", "Jugadora 1", "COLOCADORA"], ["6", "Jugadora 2", "SERVIDORA"], ["11", "Jugadora 3", "VOLADORA"]]),
      ...events([["ATENCIÓN MÉDICA", "Atención a un jugador"], ["PARTIDO SUSPENDIDO", "A la espera de la reanudación"], ["CAMBIO DE CANCHA", "Los equipos intercambian lados"], ["TIEMPO MUERTO", "Ecuador"], ["TIEMPO MUERTO", "Perú"], ["PUNTO DE SET", ""], ["PUNTO DE PARTIDO", ""]])
    ]
  }
];
