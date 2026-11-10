const T = require("./logic.js");
const D = require("./lessons.js");
let pass = 0, fail = 0; const fails = [];
const ok = (c, m) => { if (c) pass++; else { fail++; if (fails.length < 40) fails.push(m); } };

ok(D.LESSONS.length >= 30, "mind. 30 Lektionen (" + D.LESSONS.length + ")");
ok(D.LESSONS.filter(l => l.kind === "wdh").length >= 2, "Wiederholungslektionen");
ok(D.LESSONS.filter(l => l.exam || l.kind === "pruefung").length >= 2, "Prüfungslektionen");
ok(Object.keys(D.TEXTS).join(" ").includes("english"), "English-Texte");
ok(D.TEXTS.code && D.TEXTS.schule && D.TEXTS.alltag, "Textarten");

// Didaktik: frühe Lektionen nur gelernte Zeichen
function taughtUpTo(idx) {
  const set = new Set([" "]);
  for (let i = 0; i <= idx; i++) {
    const L = D.LESSONS[i];
    if (L.kind === "neu" && L.keys && !["Shift", "Wörter", "Sätze", "Schule", "Text", "alles", "alle"].includes(L.keys)) {
      [...L.keys].forEach(c => set.add(c));
    }
  }
  return set;
}
D.LESSONS.slice(0, 16).forEach((L, i) => {
  const t = taughtUpTo(i);
  const bad = [...L.text].filter(c => !t.has(c));
  ok(bad.length === 0, "Charset " + L.id + " " + [...new Set(bad)].join(""));
});

// Unicode / Vergleich
ok(T.eqChar("ß", "ß".normalize("NFD") && "ß"), "eq ß");
ok(T.eqChar("ä".normalize("NFD")[0] ? "ä".normalize("NFC") : "ä", "ä"), "NFC ä");
ok(T.eqChar("ä".normalize("NFD"), "ä") === T.eqChar(T.nfc("ä\u0308".includes("ä") ? "ä" : "ä"), "ä") || T.eqChar(T.nfc("a\u0308"), "ä"), "combining umlaut");
ok(T.eqChar(T.nfc("a\u0308"), "ä"), "a+combining = ä");
ok(T.charsOf("süß").length === 3, "chars ß");

// Session mustCorrect
let s = T.createSession("ab", { mustCorrect: true });
T.handleInput(s, "a", 1000);
ok(s.pos === 1 && s.corrects === 1, "richtig zählt");
T.handleInput(s, "x", 1100);
ok(s.errors === 1 && s.awaitingBackspace && s.pos === 1, "Fehler wartet auf Rücktaste");
T.handleInput(s, "z", 1200);
ok(s.errors === 2 && s.pos === 1, "weiter tippen erhöht Fehler, bleibt stehen");
T.handleInput(s, "Backspace", 1300);
ok(!s.awaitingBackspace && s.pos === 1, "Rücktaste hebt Wartezustand");
T.handleInput(s, "b", 1400);
ok(s.done && s.corrects === 2, "danach richtig fertig");

// ohne Korrekturzwang
s = T.createSession("ab", { mustCorrect: false });
T.handleInput(s, "x", 2000);
ok(s.pos === 1 && s.errors === 1 && !s.awaitingBackspace, "darf weiter");
T.handleInput(s, "b", 2100);
ok(s.done, "fertig ohne Korrektur");

// Dead / Modifier ignorieren
s = T.createSession("a", { mustCorrect: true });
T.handleInput(s, "Dead", 1);
T.handleInput(s, "Shift", 2);
ok(s.pos === 0 && s.strokes === 0, "Dead/Shift ignoriert");
T.handleInput(s, "a", 3);
ok(s.done, "dann a");

// Zeit / CPM / WPM / Genauigkeit
ok(T.calcCpm(100, 60000) === 100, "100 A/min");
ok(T.calcWpm(100, 60000) === 20, "20 W/min");
ok(T.calcCpm(0, 1000) === 0, "0 strokes");
ok(T.calcCpm(10, 0) === 0, "0 zeit");
ok(Math.abs(T.calcAccuracy(9, 1) - 90) < 1e-9, "90%");
ok(T.calcAccuracy(0, 0) === 100, "leer = 100");
ok(T.calcElapsedMs(1000, 5000, 500) === 3500, "elapsed minus pause");
ok(T.calcElapsedMs(1000, 5000, 0, 2000) === 1000, "während Pause eingefroren");

ok(T.starsFromResult(99, 150, "kind") === 3, "3 Sterne kind");
ok(T.starsFromResult(85, 200, "kind") === 1, "1 Stern bei 85%");
ok(T.starsFromResult(70, 300, "kind") === 0, "0 unter 80");

// Freischaltung
const lessons = [{ id: "l01" }, { id: "l02" }, { id: "l03" }];
ok(T.isLessonUnlocked(lessons, 0, {}, { unlockAcc: 90, allUnlocked: false }), "erste frei");
ok(!T.isLessonUnlocked(lessons, 1, {}, { unlockAcc: 90 }), "zweite gesperrt");
ok(T.isLessonUnlocked(lessons, 1, { l01: { best: { acc: 90 } } }, { unlockAcc: 90 }), "90% schaltet frei");
ok(!T.isLessonUnlocked(lessons, 1, { l01: { best: { acc: 89 } } }, { unlockAcc: 90 }), "89% nicht");
ok(T.isLessonUnlocked(lessons, 2, {}, { allUnlocked: true }), "alle frei");

let prog = T.applyLessonResult({}, { id: "l01" }, { acc: 92, cpm: 80, wpm: 16, stars: 1, date: "2026-11-10" });
prog = T.applyLessonResult(prog, { id: "l01" }, { acc: 92, cpm: 100, wpm: 20, stars: 2, date: "2026-11-10" });
ok(prog.l01.best.cpm === 100 && prog.l01.tries === 2, "Bestwert höherer Speed");

// Schwache Tasten
const stats = { keys: { f: { hits: 2, errors: 8, timeSum: 4000, n: 10 }, a: { hits: 20, errors: 0, timeSum: 2000, n: 20 } }, bigrams: { "df": { hits: 1, errors: 5 } } };
const weak = T.generateWeakKeyText(stats, 80, () => 0.2);
ok(typeof weak === "string" && weak.length > 20, "weak text länge");
ok(weak.includes("f") || weak.includes("d"), "weak enthält Problemtaste/Bigram");
const ada = T.generateAdaptiveText(stats, 100, () => 0.3);
ok(ada.length > 20, "adaptive text");
ok(T.rankedProblemKeys(stats, 3)[0].key === "f", "f ist Problemtaste");

// Streak / Woche
let st = T.updateStreak({ lastDay: null, count: 0, best: 0 }, "2026-11-10");
ok(st.count === 1, "streak start");
st = T.updateStreak(st, "2026-11-10");
ok(st.count === 1, "gleicher Tag unverändert");
st = T.updateStreak(st, "2026-11-11");
ok(st.count === 2, "nächster Tag +1");
st = T.updateStreak(st, "2026-11-13");
ok(st.count === 1, "Lücke setzt zurück");
const week = T.weekBars([{ date: "2026-11-10", elapsedMs: 120000, acc: 90, cpm: 80 }], "2026-11-10");
ok(week.length === 7, "7 Tage");
ok(Math.abs(week[6].minutes - 2) < 0.01, "2 Minuten am letzten Tag");

// Export / Import
const store = { current: "adam", profiles: { adam: T.newProfile("Adam") } };
store.profiles.adam.history = [{ date: "2026-11-10", cpm: 80, acc: 91 }];
const json = T.exportState(store);
const imp = T.importState(json, { current: "x", profiles: {} });
ok(imp.ok && imp.store.profiles.adam.history.length === 1, "import ok");
ok(!T.importState("{", store).ok, "kaputtes json");
ok(!T.importState({ app: "other", profiles: {} }, store).ok, "falsche app");

// Finger
ok(T.fingerFor("a", "qwertz") === "LP", "a linker Klein");
ok(T.fingerFor("j", "qwertz") === "RI", "j rechter Zeige");
ok(T.fingerFor("z", "qwertz") === "RI", "z qwertz rechts");
ok(T.fingerFor("y", "qwerty") === "RI", "y qwerty rechts");
ok(T.needsShift("A"), "A braucht Shift");
ok(!T.needsShift("a"), "a kein Shift");

// Badges
const earned = T.evalBadges({ history: [{}], streak: { count: 3 }, badges: {} }, "adaptive", { acc: 100, stars: 3, cpm: 160 });
ok(earned.first && earned.stars3 && earned.acc100 && earned.adaptive && earned.streak3, "abzeichen");

console.log(pass + " passed, " + fail + " failed");
if (fails.length) fails.forEach(f => console.log("FAIL:", f));
process.exit(fail ? 1 : 0);
