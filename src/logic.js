/* Tipp-Trainer – reine Logik (Node + Browser), ohne DOM */
(function (root) {
"use strict";

function nfc(s) {
  try { return String(s == null ? "" : s).normalize("NFC"); }
  catch (e) { return String(s == null ? "" : s); }
}
function charsOf(s) { return Array.from(nfc(s)); }
function eqChar(a, b) { return nfc(a) === nfc(b); }

var DEFAULT_SETTINGS = {
  keyboardHelp: true,
  sound: true,
  fontSize: 22,
  mustCorrect: true,
  unlockAcc: 90,
  allUnlocked: false,
  theme: "auto",
  layout: "qwertz",
  colorblind: false,
  largeType: false,
  reduceMotion: false,
  metronome: false,
  metronomeBpm: 60,
  blind: false,
  showFingers: true,
  dailyGoalMin: 10,
  level: "kind",
  lang: "de"
};

var LEVEL_TARGETS = {
  kind: { cpm1: 60, cpm2: 100, cpm3: 140, label: "Kind" },
  jugend: { cpm1: 100, cpm2: 160, cpm3: 220, label: "Jugend" },
  erwachsen: { cpm1: 150, cpm2: 200, cpm3: 260, label: "Erwachsene" }
};

function levelTargets(level) {
  return LEVEL_TARGETS[level] || LEVEL_TARGETS.kind;
}

function todayKey(ts) {
  var d = ts ? new Date(ts) : new Date();
  var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  return y + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
}

function calcElapsedMs(startedAt, now, pausedMs, pausedAt) {
  if (!startedAt) return 0;
  var end = pausedAt != null ? pausedAt : now;
  var raw = end - startedAt - (pausedMs || 0);
  return raw > 0 ? raw : 0;
}

function calcCpm(strokes, elapsedMs) {
  if (!elapsedMs || elapsedMs <= 0 || !strokes) return 0;
  return (strokes / elapsedMs) * 60000;
}
function calcWpm(strokes, elapsedMs) {
  return calcCpm(strokes, elapsedMs) / 5;
}
function calcAccuracy(correct, errors) {
  var t = (correct || 0) + (errors || 0);
  if (!t) return 100;
  return (correct / t) * 100;
}

function starsFromResult(acc, cpm, level) {
  var t = levelTargets(level);
  var a = acc || 0, c = cpm || 0;
  if (a < 80) return 0;
  if (a >= 98 && c >= t.cpm3) return 3;
  if (a >= 95 && c >= t.cpm2) return 3;
  if (a >= 95 && c >= t.cpm1) return 2;
  if (a >= 90 && c >= t.cpm1) return 2;
  if (a >= 90) return 1;
  if (a >= 80) return 1;
  return 0;
}

function praiseFor(stars, acc, name) {
  var n = name ? nfc(name) : "";
  var who = n ? n + ", " : "";
  if (stars >= 3) return who + "großartig! Drei Sterne – das war richtig stark.";
  if (stars === 2) return who + "super getippt! Zwei Sterne, weiter so.";
  if (stars === 1 && acc >= 90) return who + "geschafft! Ein Stern – morgen wird's noch flüssiger.";
  if (stars === 1) return who + "gute Übung. Ein bisschen genauer, dann klappt's noch besser.";
  return who + "nicht schlimm. Üben wir die schwierigen Tasten noch einmal.";
}

function createSession(text, opts) {
  opts = opts || {};
  var chars = charsOf(text);
  return {
    text: nfc(text),
    chars: chars,
    pos: 0,
    errors: 0,
    corrects: 0,
    strokes: 0,
    mustCorrect: !!opts.mustCorrect,
    awaitingBackspace: false,
    startedAt: null,
    pausedAt: null,
    pausedMs: 0,
    done: false,
    marks: chars.map(function () { return "pending"; }),
    lastExpected: "",
    lastGot: "",
    lastOk: true,
    keyLog: [],
    errorKeys: {},
    okKeys: {},
    bigramErr: {},
    bigramOk: {},
    lastKeyTs: null
  };
}

function sessionElapsed(s, now) {
  return calcElapsedMs(s.startedAt, now, s.pausedMs, s.pausedAt);
}

function pauseSession(s, now) {
  if (s.pausedAt != null || s.done) return s;
  s.pausedAt = now;
  return s;
}
function resumeSession(s, now) {
  if (s.pausedAt == null) return s;
  s.pausedMs += now - s.pausedAt;
  s.pausedAt = null;
  return s;
}

function handleInput(s, raw, now) {
  if (s.done || s.pausedAt != null) return s;
  var key = raw == null ? "" : raw;
  if (key === "Dead" || key === "Process" || key === "Shift" || key === "Control" ||
      key === "Alt" || key === "AltGraph" || key === "Meta" || key === "CapsLock" ||
      key === "Tab" || key === "Escape" || key === "Enter" || key === "ArrowLeft" ||
      key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown") {
    return s;
  }
  if (!s.startedAt) s.startedAt = now;
  var isBs = key === "Backspace" || key === "\b";
  if (isBs) {
    if (s.mustCorrect && s.awaitingBackspace) {
      s.awaitingBackspace = false;
      if (s.pos > 0 && s.marks[s.pos] !== "ok") {
        /* stay on same pos, clear red flash */
      }
    } else if (!s.mustCorrect) {
      /* optional: ignore backspace when continuing */
    } else if (s.pos > 0 && !s.awaitingBackspace) {
      /* do not go back over correct chars in mustCorrect after they are accepted */
    }
    return s;
  }
  if (s.mustCorrect && s.awaitingBackspace) {
    /* still waiting for backspace – count extra misses but stay */
    s.strokes++;
    s.errors++;
    return s;
  }
  if (s.pos >= s.chars.length) {
    s.done = true;
    return s;
  }
  var expected = s.chars[s.pos];
  var got = nfc(key);
  if (got.length !== 1 && got !== expected) {
    /* paste or IME cluster: take first char */
    var gc = charsOf(got);
    got = gc.length ? gc[0] : got;
  }
  var ok = eqChar(got, expected);
  s.strokes++;
  s.lastExpected = expected;
  s.lastGot = got;
  s.lastOk = ok;
  var dt = s.lastKeyTs != null ? now - s.lastKeyTs : 0;
  s.lastKeyTs = now;
  var prev = s.pos > 0 ? s.chars[s.pos - 1] : "";
  var bi = prev + expected;
  if (ok) {
    s.corrects++;
    s.marks[s.pos] = "ok";
    s.pos++;
    s.okKeys[expected] = (s.okKeys[expected] || 0) + 1;
    if (prev) s.bigramOk[bi] = (s.bigramOk[bi] || 0) + 1;
    s.keyLog.push({ expected: expected, got: got, ok: true, t: now, dt: dt });
    if (s.pos >= s.chars.length) s.done = true;
  } else {
    s.errors++;
    s.marks[s.pos] = "bad";
    s.errorKeys[expected] = (s.errorKeys[expected] || 0) + 1;
    if (prev) s.bigramErr[bi] = (s.bigramErr[bi] || 0) + 1;
    s.keyLog.push({ expected: expected, got: got, ok: false, t: now, dt: dt });
    if (s.mustCorrect) s.awaitingBackspace = true;
    else {
      s.pos++;
      if (s.pos >= s.chars.length) s.done = true;
    }
  }
  return s;
}

function sessionResult(s, now, level) {
  var ms = sessionElapsed(s, now);
  var acc = calcAccuracy(s.corrects, s.errors);
  var cpm = calcCpm(s.corrects, ms);
  var wpm = calcWpm(s.corrects, ms);
  var stars = starsFromResult(acc, cpm, level);
  return {
    corrects: s.corrects,
    errors: s.errors,
    strokes: s.strokes,
    total: s.chars.length,
    pos: s.pos,
    elapsedMs: ms,
    acc: acc,
    cpm: cpm,
    wpm: wpm,
    stars: stars,
    done: !!s.done,
    errorKeys: Object.assign({}, s.errorKeys),
    okKeys: Object.assign({}, s.okKeys),
    bigramErr: Object.assign({}, s.bigramErr),
    bigramOk: Object.assign({}, s.bigramOk),
    keyLog: s.keyLog.slice()
  };
}

function mergeKeyStats(stats, result) {
  stats = stats || { keys: {}, bigrams: {} };
  stats.keys = stats.keys || {};
  stats.bigrams = stats.bigrams || {};
  function bump(map, k, field) {
    if (!k) return;
    if (!map[k]) map[k] = { hits: 0, errors: 0, timeSum: 0, n: 0 };
    map[k][field]++;
  }
  Object.keys(result.okKeys || {}).forEach(function (k) {
    if (!stats.keys[k]) stats.keys[k] = { hits: 0, errors: 0, timeSum: 0, n: 0 };
    stats.keys[k].hits += result.okKeys[k];
  });
  Object.keys(result.errorKeys || {}).forEach(function (k) {
    if (!stats.keys[k]) stats.keys[k] = { hits: 0, errors: 0, timeSum: 0, n: 0 };
    stats.keys[k].errors += result.errorKeys[k];
  });
  (result.keyLog || []).forEach(function (row) {
    var rec = stats.keys[row.expected];
    if (!rec) rec = stats.keys[row.expected] = { hits: 0, errors: 0, timeSum: 0, n: 0 };
    if (row.dt > 0 && row.dt < 5000) { rec.timeSum += row.dt; rec.n++; }
  });
  Object.keys(result.bigramOk || {}).forEach(function (k) {
    if (!stats.bigrams[k]) stats.bigrams[k] = { hits: 0, errors: 0 };
    stats.bigrams[k].hits += result.bigramOk[k];
  });
  Object.keys(result.bigramErr || {}).forEach(function (k) {
    if (!stats.bigrams[k]) stats.bigrams[k] = { hits: 0, errors: 0 };
    stats.bigrams[k].errors += result.bigramErr[k];
  });
  return stats;
}

function keyErrorRate(rec) {
  if (!rec) return 0;
  var t = (rec.hits || 0) + (rec.errors || 0);
  if (t < 3) return 0;
  return rec.errors / t;
}
function keyAvgMs(rec) {
  if (!rec || !rec.n) return 0;
  return rec.timeSum / rec.n;
}

function rankedProblemKeys(stats, limit) {
  var keys = (stats && stats.keys) || {};
  var list = Object.keys(keys).map(function (k) {
    var r = keys[k];
    var total = (r.hits || 0) + (r.errors || 0);
    return { key: k, errors: r.errors || 0, hits: r.hits || 0, total: total, rate: keyErrorRate(r), avgMs: keyAvgMs(r) };
  }).filter(function (x) { return x.total >= 3 && (x.errors > 0 || x.avgMs > 400); });
  list.sort(function (a, b) {
    var sa = a.rate * 2 + (a.avgMs > 450 ? 0.3 : 0) + a.errors * 0.01;
    var sb = b.rate * 2 + (b.avgMs > 450 ? 0.3 : 0) + b.errors * 0.01;
    return sb - sa;
  });
  return list.slice(0, limit || 8);
}

function rankedProblemBigrams(stats, limit) {
  var map = (stats && stats.bigrams) || {};
  var list = Object.keys(map).map(function (k) {
    var r = map[k];
    var total = (r.hits || 0) + (r.errors || 0);
    return { key: k, errors: r.errors || 0, hits: r.hits || 0, total: total, rate: total >= 3 ? (r.errors || 0) / total : 0 };
  }).filter(function (x) { return x.total >= 3 && x.errors > 0; });
  list.sort(function (a, b) { return b.rate - a.rate || b.errors - a.errors; });
  return list.slice(0, limit || 6);
}

function shuffleInPlace(a, rnd) {
  rnd = rnd || Math.random;
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(rnd() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function generatePracticeText(parts, length) {
  length = length || 120;
  var out = [];
  var i = 0;
  if (!parts.length) parts = ["das", "ist", "eine", "uebung"];
  while (charsOf(out.join(" ")).length < length) {
    out.push(parts[i % parts.length]);
    i++;
    if (i > 400) break;
  }
  var s = out.join(" ");
  return nfc(s).slice(0, length);
}

function generateWeakKeyText(stats, length, rnd) {
  var probs = rankedProblemKeys(stats, 8).map(function (x) { return x.key; }).filter(function (k) { return k && k !== " "; });
  if (!probs.length) probs = ["e", "n", "r", "i", "s", "t"];
  var grams = rankedProblemBigrams(stats, 6).map(function (x) { return x.key; });
  var parts = [];
  probs.forEach(function (k) {
    parts.push(k + k + k + k);
    parts.push((k + " ").repeat(3).trim());
  });
  grams.forEach(function (g) {
    parts.push((g + " ").repeat(3).trim());
    parts.push(g + g);
  });
  /* kleine Mischwörter aus Problem-Buchstaben */
  var alpha = probs.join("") + "asdfjklö";
  for (var i = 0; i < 12; i++) {
    var w = "";
    for (var j = 0; j < 4; j++) w += alpha.charAt(Math.floor((rnd || Math.random)() * alpha.length));
    parts.push(w);
  }
  shuffleInPlace(parts, rnd);
  return generatePracticeText(parts, length || 140);
}

function generateAdaptiveText(stats, length, rnd) {
  rnd = rnd || Math.random;
  var weak = generateWeakKeyText(stats, Math.round((length || 160) * 0.7), rnd);
  var filler = ["aber", "oder", "und", "das", "eine", "kleine", "starke", "Übung", "heute", "tippen", "lernen", "Finger", "schnell", "genau"];
  var extra = generatePracticeText(filler, Math.round((length || 160) * 0.4));
  var mix = (weak + " " + extra).replace(/\s+/g, " ").trim();
  var arr = mix.split(" ");
  shuffleInPlace(arr, rnd);
  return nfc(arr.join(" ")).slice(0, length || 160);
}

function isLessonUnlocked(lessons, index, progress, settings) {
  if (settings && settings.allUnlocked) return true;
  if (index <= 0) return true;
  var prev = lessons[index - 1];
  if (!prev) return true;
  var p = (progress || {})[prev.id];
  var need = (settings && settings.unlockAcc) || 90;
  return !!(p && p.best && p.best.acc >= need);
}

function applyLessonResult(progress, lesson, result) {
  progress = progress || {};
  var cur = progress[lesson.id] || { best: null, tries: 0, last: null };
  cur.tries = (cur.tries || 0) + 1;
  cur.last = { acc: result.acc, cpm: result.cpm, wpm: result.wpm, stars: result.stars, date: result.date || todayKey() };
  if (!cur.best || result.acc > cur.best.acc || (result.acc === cur.best.acc && result.cpm > (cur.best.cpm || 0))) {
    cur.best = { acc: result.acc, cpm: result.cpm, wpm: result.wpm, stars: result.stars, date: cur.last.date };
  }
  progress[lesson.id] = cur;
  return progress;
}

function updateStreak(streak, day) {
  streak = streak || { lastDay: null, count: 0, best: 0 };
  day = day || todayKey();
  if (streak.lastDay === day) return streak;
  var yest = (function () {
    var p = day.split("-");
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    d.setUTCDate(d.getUTCDate() - 1);
    var m = d.getUTCMonth() + 1, dd = d.getUTCDate();
    return d.getUTCFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (dd < 10 ? "0" : "") + dd;
  })();
  if (streak.lastDay === yest) streak.count = (streak.count || 0) + 1;
  else streak.count = 1;
  streak.lastDay = day;
  if (streak.count > (streak.best || 0)) streak.best = streak.count;
  return streak;
}

function addDailyMinutes(daily, day, minutes, goalMin) {
  daily = daily || { day: day, minutes: 0, goalMin: goalMin || 10 };
  if (daily.day !== day) { daily = { day: day, minutes: 0, goalMin: daily.goalMin || goalMin || 10 }; }
  daily.minutes = (daily.minutes || 0) + (minutes || 0);
  if (goalMin) daily.goalMin = goalMin;
  return daily;
}

function weekBars(history, day) {
  day = day || todayKey();
  var p = day.split("-");
  var end = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  var days = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    var m = d.getUTCMonth() + 1, dd = d.getUTCDate();
    var key = d.getUTCFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (dd < 10 ? "0" : "") + dd;
    days.push({ day: key, minutes: 0, accSum: 0, n: 0, cpmSum: 0 });
  }
  var map = {};
  days.forEach(function (x) { map[x.day] = x; });
  (history || []).forEach(function (h) {
    var b = map[h.date];
    if (!b) return;
    b.minutes += (h.elapsedMs || 0) / 60000;
    b.accSum += h.acc || 0;
    b.cpmSum += h.cpm || 0;
    b.n++;
  });
  days.forEach(function (b) {
    b.acc = b.n ? b.accSum / b.n : 0;
    b.cpm = b.n ? b.cpmSum / b.n : 0;
  });
  return days;
}

var BADGES = [
  { id: "first", title: "Los geht's", desc: "Erste Übung geschafft" },
  { id: "lesson1", title: "Grundstellung", desc: "Erste Lektion mit mindestens 90 %" },
  { id: "stars3", title: "Drei Sterne", desc: "Eine Übung mit drei Sternen" },
  { id: "acc100", title: "Perfekt", desc: "100 % Genauigkeit" },
  { id: "streak3", title: "Serie 3", desc: "Drei Tage in Folge geübt" },
  { id: "streak7", title: "Wochenheld", desc: "Sieben Tage in Folge geübt" },
  { id: "cpm150", title: "Schnell unterwegs", desc: "150 Anschläge pro Minute" },
  { id: "lessons10", title: "Zehn Lektionen", desc: "Zehn Lektionen geschafft" },
  { id: "goal", title: "Tagesziel", desc: "Tagesziel einmal erreicht" },
  { id: "adaptive", title: "Heute für dich", desc: "Adaptives Training genutzt" },
  { id: "weak", title: "Tasten-Detektiv", desc: "Schwache Tasten geübt" },
  { id: "exam", title: "Prüfung", desc: "Eine Prüfungslektion bestanden" }
];

function evalBadges(state, eventKind, result) {
  var earned = Object.assign({}, (state && state.badges) || {});
  var now = todayKey();
  function give(id) { if (!earned[id]) earned[id] = now; }
  var hist = (state && state.history) || [];
  if (hist.length >= 1 || eventKind) give("first");
  if (result && result.acc >= 90 && eventKind === "lesson1") give("lesson1");
  if (result && result.stars >= 3) give("stars3");
  if (result && result.acc >= 99.999) give("acc100");
  if (state && state.streak && state.streak.count >= 3) give("streak3");
  if (state && state.streak && state.streak.count >= 7) give("streak7");
  if (result && result.cpm >= 150) give("cpm150");
  var doneLessons = 0;
  Object.keys((state && state.progress) || {}).forEach(function (id) {
    var p = state.progress[id];
    if (p && p.best && p.best.acc >= 90) doneLessons++;
  });
  if (doneLessons >= 10) give("lessons10");
  if (state && state.daily && state.daily.minutes >= (state.daily.goalMin || 10)) give("goal");
  if (eventKind === "adaptive") give("adaptive");
  if (eventKind === "weak") give("weak");
  if (eventKind === "exam" && result && result.acc >= 90) give("exam");
  return earned;
}

function newProfile(name, extras) {
  extras = extras || {};
  return {
    name: nfc(name || "Gast"),
    created: Date.now(),
    settings: Object.assign({}, DEFAULT_SETTINGS, extras.settings || {}),
    progress: {},
    history: [],
    stats: { keys: {}, bigrams: {} },
    streak: { lastDay: null, count: 0, best: 0 },
    daily: { day: todayKey(), minutes: 0, goalMin: (extras.settings && extras.settings.dailyGoalMin) || 10 },
    badges: {}
  };
}

function appendHistory(history, entry, cap) {
  var h = (history || []).slice();
  h.push(entry);
  cap = cap || 200;
  if (h.length > cap) h = h.slice(h.length - cap);
  return h;
}

function exportState(store) {
  return JSON.stringify({
    app: "tipp-trainer",
    version: 1,
    exportedAt: new Date().toISOString(),
    current: store.current,
    profiles: store.profiles
  }, null, 2);
}

function importState(json, currentStore) {
  var data;
  try { data = typeof json === "string" ? JSON.parse(json) : json; }
  catch (e) { return { ok: false, error: "Die Datei ist kein gültiges JSON." }; }
  if (!data || (data.app && data.app !== "tipp-trainer") || !data.profiles || typeof data.profiles !== "object") {
    return { ok: false, error: "Das ist kein Tipp-Trainer-Export." };
  }
  var out = {
    current: data.current || (currentStore && currentStore.current) || Object.keys(data.profiles)[0],
    profiles: {}
  };
  Object.keys(data.profiles).forEach(function (id) {
    var p = data.profiles[id];
    if (!p || typeof p !== "object") return;
    var np = newProfile(p.name || id);
    np.created = p.created || np.created;
    np.settings = Object.assign({}, DEFAULT_SETTINGS, p.settings || {});
    np.progress = p.progress && typeof p.progress === "object" ? p.progress : {};
    np.history = Array.isArray(p.history) ? p.history.slice(-200) : [];
    np.stats = p.stats && typeof p.stats === "object" ? { keys: p.stats.keys || {}, bigrams: p.stats.bigrams || {} } : np.stats;
    np.streak = p.streak || np.streak;
    np.daily = p.daily || np.daily;
    np.badges = p.badges || {};
    out.profiles[id] = np;
  });
  if (!Object.keys(out.profiles).length) return { ok: false, error: "Im Export sind keine Profile." };
  if (!out.profiles[out.current]) out.current = Object.keys(out.profiles)[0];
  return { ok: true, store: out };
}

function slugName(name) {
  var s = nfc(name || "").trim().toLowerCase();
  s = s.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return s || "profil";
}

/* Tastatur-Layouts und Finger */
var FINGERS = {
  LP: { id: "LP", hand: "L", name: "Kleiner Finger links", short: "links klein" },
  LR: { id: "LR", hand: "L", name: "Ringfinger links", short: "links Ring" },
  LM: { id: "LM", hand: "L", name: "Mittelfinger links", short: "links Mitte" },
  LI: { id: "LI", hand: "L", name: "Zeigefinger links", short: "links Zeige" },
  LT: { id: "LT", hand: "L", name: "Daumen", short: "Daumen" },
  RT: { id: "RT", hand: "R", name: "Daumen", short: "Daumen" },
  RI: { id: "RI", hand: "R", name: "Zeigefinger rechts", short: "rechts Zeige" },
  RM: { id: "RM", hand: "R", name: "Mittelfinger rechts", short: "rechts Mitte" },
  RR: { id: "RR", hand: "R", name: "Ringfinger rechts", short: "rechts Ring" },
  RP: { id: "RP", hand: "R", name: "Kleiner Finger rechts", short: "rechts klein" }
};

function fingerFor(ch, layout) {
  var c = nfc(ch);
  if (c === " ") return "RT";
  var map;
  if (layout === "qwerty") {
    map = {
      "`":"LP","1":"LP","2":"LP","q":"LP","a":"LP","z":"LP",
      "3":"LR","w":"LR","s":"LR","x":"LR",
      "4":"LM","e":"LM","d":"LM","c":"LM",
      "5":"LI","6":"LI","r":"LI","t":"LI","f":"LI","g":"LI","v":"LI","b":"LI",
      "7":"RI","8":"RI","y":"RI","u":"RI","h":"RI","j":"RI","n":"RI","m":"RI",
      "9":"RM","i":"RM","k":"RM",",":"RM",
      "0":"RR","o":"RR","l":"RR",".":"RR",
      "-":"RP","=":"RP","p":"RP","[":"RP","]":"RP","\\":"RP",";":"RP","'":"RP","/":"RP",
      "ö":"RP","ä":"RP","ü":"RP","ß":"RP","#":"RP","+":"RP"
    };
  } else {
    map = {
      "^":"LP","1":"LP","2":"LP","q":"LP","a":"LP","y":"LP","<":"LP",
      "3":"LR","w":"LR","s":"LR","x":"LR",
      "4":"LM","e":"LM","d":"LM","c":"LM",
      "5":"LI","6":"LI","r":"LI","t":"LI","f":"LI","g":"LI","v":"LI","b":"LI",
      "7":"RI","8":"RI","z":"RI","u":"RI","h":"RI","j":"RI","n":"RI","m":"RI",
      "9":"RM","i":"RM","k":"RM",",":"RM",
      "0":"RR","o":"RR","l":"RR",".":"RR",
      "ß":"RP","´":"RP","p":"RP","ü":"RP","+":"RP","ö":"RP","ä":"RP","#":"RP","-":"RP"
    };
  }
  var lower = c.toLowerCase();
  if (map[c]) return map[c];
  if (map[lower]) return map[lower];
  /* Sonderzeichen grob */
  if ("@".indexOf(c) >= 0) return "LP";
  if ("€".indexOf(c) >= 0) return "LM";
  if ("{[]}\\".indexOf(c) >= 0) return "RP";
  if ("!?".indexOf(c) >= 0) return "RP";
  if (":;".indexOf(c) >= 0) return "RP";
  if ("'\"".indexOf(c) >= 0) return "RP";
  if ("()".indexOf(c) >= 0) return c === "(" ? "RM" : "RR";
  return "RP";
}

function needsShift(ch, layout) {
  var c = nfc(ch);
  if (c === " ") return false;
  if (c.toLowerCase() !== c && c.toUpperCase() === c) return true; /* uppercase letter */
  var shifted = layout === "qwerty"
    ? "!@#$%^&*()_+{}:\"<>?|"
    : "°!\"§$%&/()=?`*'>;:_";
  return shifted.indexOf(c) >= 0;
}

var LAYOUTS = {
  qwertz: [
    ["^","1","2","3","4","5","6","7","8","9","0","ß","´"],
    ["q","w","e","r","t","z","u","i","o","p","ü","+"],
    ["a","s","d","f","g","h","j","k","l","ö","ä","#"],
    ["y","x","c","v","b","n","m",",",".","-"]
  ],
  qwerty: [
    ["`","1","2","3","4","5","6","7","8","9","0","-","="],
    ["q","w","e","r","t","y","u","i","o","p","[","]"],
    ["a","s","d","f","g","h","j","k","l",";","'"],
    ["z","x","c","v","b","n","m",",",".","/"]
  ]
};

function keyId(ch) { return "k-" + encodeURIComponent(nfc(ch)); }

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function round1(n) { return Math.round(n * 10) / 10; }
function round0(n) { return Math.round(n); }

var api = {
  nfc: nfc, charsOf: charsOf, eqChar: eqChar,
  DEFAULT_SETTINGS: DEFAULT_SETTINGS, LEVEL_TARGETS: LEVEL_TARGETS, levelTargets: levelTargets,
  todayKey: todayKey, calcElapsedMs: calcElapsedMs,
  calcCpm: calcCpm, calcWpm: calcWpm, calcAccuracy: calcAccuracy,
  starsFromResult: starsFromResult, praiseFor: praiseFor,
  createSession: createSession, sessionElapsed: sessionElapsed,
  pauseSession: pauseSession, resumeSession: resumeSession, handleInput: handleInput,
  sessionResult: sessionResult, mergeKeyStats: mergeKeyStats,
  keyErrorRate: keyErrorRate, keyAvgMs: keyAvgMs,
  rankedProblemKeys: rankedProblemKeys, rankedProblemBigrams: rankedProblemBigrams,
  generateWeakKeyText: generateWeakKeyText, generateAdaptiveText: generateAdaptiveText,
  generatePracticeText: generatePracticeText,
  isLessonUnlocked: isLessonUnlocked, applyLessonResult: applyLessonResult,
  updateStreak: updateStreak, addDailyMinutes: addDailyMinutes, weekBars: weekBars,
  BADGES: BADGES, evalBadges: evalBadges,
  newProfile: newProfile, appendHistory: appendHistory,
  exportState: exportState, importState: importState, slugName: slugName,
  FINGERS: FINGERS, fingerFor: fingerFor, needsShift: needsShift, LAYOUTS: LAYOUTS,
  keyId: keyId, clamp: clamp, round1: round1, round0: round0
};
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.Tipp = api;
})(typeof self !== "undefined" ? self : this);
