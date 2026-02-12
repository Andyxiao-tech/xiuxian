const TIME_SEGMENTS = [
  "子时 星沉", "丑时 露重", "寅时 拂晓", "卯时 朝曦", "辰时 辰光", "巳时 巳阳",
  "午时 日中", "未时 晡后", "申时 西成", "酉时 夕照", "戌时 初夜", "亥时 深更"
];
const SEGMENT_DURATION = 40;

const LOCATIONS = {
  "凡人城镇": { tag: "商贸", risk: -3, cultBonus: -0.1, alchemyBonus: 0.2, exploreBonus: 0.1, tax: 0.85 },
  "青岚宗": { tag: "正道", risk: -8, cultBonus: 0.18, alchemyBonus: 0.1, exploreBonus: 0, tax: 0.95 },
  "赤霄宗": { tag: "战宗", risk: 4, cultBonus: 0.14, alchemyBonus: -0.05, exploreBonus: 0.2, tax: 1.05 },
  "落月秘境": { tag: "秘境", risk: 12, cultBonus: 0.22, alchemyBonus: 0, exploreBonus: 0.35, tax: 1.2 },
  "万妖山": { tag: "妖域", risk: 20, cultBonus: 0.08, alchemyBonus: 0, exploreBonus: 0.4, tax: 1.3 },
  "仙界入口": { tag: "禁制", risk: 15, cultBonus: 0.3, alchemyBonus: -0.1, exploreBonus: 0.12, tax: 1.3 }
};

const REALM_DATA = [
  { name: "炼气", sub: Array.from({ length: 12 }, (_, i) => `${i + 1}层`), baseNeed: 120 },
  { name: "筑基", sub: ["初期", "中期", "后期", "圆满"], baseNeed: 420 },
  { name: "金丹", sub: ["凝丹", "成丹", "养丹", "圆满"], baseNeed: 920 },
  { name: "元婴", sub: ["凝婴", "稳婴", "出窍", "圆满"], baseNeed: 1900 },
  { name: "化神", sub: ["化形", "法相", "道意", "圆满"], baseNeed: 3800 },
  { name: "合体", sub: ["相融", "入身", "分身", "圆满"], baseNeed: 6500 },
  { name: "大乘", sub: ["前期", "中期", "后期", "圆满"], baseNeed: 10200 },
  { name: "飞升", sub: ["天劫", "天门", "仙躯"], baseNeed: 18000 }
];

const state = {
  time: { year: 1, month: 1, day: 1, segment: 0, secLeft: SEGMENT_DURATION },
  player: {
    realm: 0,
    sub: 0,
    cultivation: 0,
    hp: 100,
    mood: 72,
    luck: 12,
    karma: 0,
    merit: 0,
    contribution: 0,
    stones: 2800,
    herbs: 50,
    artifacts: 2,
    manuals: 1,
    sect: "散修",
    location: "凡人城镇",
    daoHeart: 60,
    qiPurity: 55,
    injuries: 0,
    demonMark: 8,
    insight: 0,
  },
  world: {
    tension: 18,
    chaos: 10,
    prosperity: 50,
    tribulationPressure: 8,
    control: {
      "凡人城镇": "中立",
      "青岚宗": "青岚宗",
      "赤霄宗": "赤霄宗",
      "落月秘境": "中立",
      "万妖山": "妖族",
      "仙界入口": "天道禁制"
    }
  },
  sects: {
    "青岚宗": { favor: 0, hostility: 0 },
    "赤霄宗": { favor: 0, hostility: 0 }
  },
  prodigies: [
    { name: "林清雪", root: "冰灵根", path: "正道", realm: "炼气九层", loyalty: 78, ambition: 34, demonic: 6, gratitude: 85, growth: 22, invested: 0, relation: 65 },
    { name: "韩烈", root: "火雷双灵根", path: "战修", realm: "筑基初期", loyalty: 56, ambition: 72, demonic: 22, gratitude: 41, growth: 31, invested: 0, relation: 50 },
    { name: "苏晚照", root: "木灵根", path: "丹道", realm: "炼气圆满", loyalty: 69, ambition: 48, demonic: 9, gratitude: 72, growth: 27, invested: 0, relation: 59 },
    { name: "顾长风", root: "剑灵体", path: "剑道", realm: "筑基中期", loyalty: 44, ambition: 88, demonic: 35, gratitude: 30, growth: 38, invested: 0, relation: 38 },
    { name: "白绫", root: "幻灵根", path: "诡道", realm: "炼气七层", loyalty: 51, ambition: 63, demonic: 57, gratitude: 36, growth: 25, invested: 0, relation: 42 },
  ],
  pendingChoice: null,
};

const cooldownBook = new Map();
const eventLibrary = Array.isArray(EVENT_LIBRARY) ? EVENT_LIBRARY : [];

const el = {
  dialogueLog: document.getElementById("dialogueLog"),
  eventLog: document.getElementById("eventLog"),
  commandInput: document.getElementById("commandInput"),
  sendBtn: document.getElementById("sendBtn"),
  stats: document.getElementById("stats"),
  timeDisplay: document.getElementById("timeDisplay"),
  timerDisplay: document.getElementById("timerDisplay"),
  prodigyList: document.getElementById("prodigyList"),
  mapPanel: document.getElementById("mapPanel"),
  choicePanel: document.getElementById("choicePanel"),
  prodigyTpl: document.getElementById("prodigyTpl"),
};

function logTo(panel, text, kind = "system") {
  const node = document.createElement("div");
  node.className = `msg ${kind}`;
  node.textContent = text;
  panel.appendChild(node);
  panel.scrollTop = panel.scrollHeight;
}

function locMod() { return LOCATIONS[state.player.location] || LOCATIONS["凡人城镇"]; }
function realmName() { const r = REALM_DATA[state.player.realm]; return `${r.name}${r.sub[state.player.sub]}`; }
function isNight() { return state.time.segment <= 2 || state.time.segment >= 10; }

function needForNext() {
  const p = state.player;
  const r = REALM_DATA[p.realm];
  const impurityPenalty = Math.max(0, 70 - p.qiPurity) * 2;
  return Math.round(r.baseNeed * (1 + p.sub * 0.34) + impurityPenalty);
}

function calcBreakthroughChance() {
  const p = state.player;
  const place = locMod();
  const pressure = state.world.tribulationPressure + state.world.chaos * 0.4;
  return Math.max(6, Math.min(95,
    48
    + p.daoHeart * 0.35
    + p.qiPurity * 0.25
    + p.luck * 0.4
    + p.insight * 0.5
    + p.merit * 0.5
    - p.karma * 0.6
    - p.injuries * 0.7
    - p.demonMark * 0.8
    - pressure * 0.35
    + place.cultBonus * 18
    + (p.sect === "散修" ? 0 : 4)
    + (isNight() ? 1 : -1)
  ));
}

function applyEffects(rawEffects) {
  const p = state.player;
  const w = state.world;
  const effects = { ...rawEffects };

  if (effects.stones && effects.stones > 0) effects.stones = Math.round(effects.stones * locMod().tax);

  for (const [k, v] of Object.entries(effects)) {
    if (k in p && typeof p[k] === "number") p[k] += v;
    else if (k in w && typeof w[k] === "number") w[k] += v;
    else if (k === "relationShift") {
      state.prodigies.forEach((pd) => pd.relation += v);
    }
  }

  if (p.demonMark >= 35) {
    p.daoHeart -= 1;
    p.mood -= 1;
    p.injuries += 1;
  }
  if (p.karma >= 30) {
    w.tribulationPressure += 1;
    p.mood -= 1;
  }
  if (p.merit >= 30) {
    w.tribulationPressure = Math.max(0, w.tribulationPressure - 1);
    p.daoHeart += 1;
  }

  clampState();
}

function clampState() {
  const p = state.player;
  const w = state.world;
  p.hp = Math.max(1, Math.min(100, p.hp));
  p.mood = Math.max(0, Math.min(100, p.mood));
  p.stones = Math.max(0, p.stones);
  p.herbs = Math.max(0, p.herbs);
  p.daoHeart = Math.max(0, Math.min(100, p.daoHeart));
  p.qiPurity = Math.max(0, Math.min(100, p.qiPurity));
  p.injuries = Math.max(0, Math.min(95, p.injuries));
  p.demonMark = Math.max(0, Math.min(95, p.demonMark));
  w.tension = Math.max(0, Math.min(120, w.tension));
  w.chaos = Math.max(0, Math.min(120, w.chaos));
  w.prosperity = Math.max(0, Math.min(120, w.prosperity));
  w.tribulationPressure = Math.max(0, Math.min(120, w.tribulationPressure));
}

function renderStats() {
  const p = state.player;
  const nextNeed = needForNext();
  const chance = calcBreakthroughChance().toFixed(1);
  const risk = Math.min(99, p.demonMark * 0.75 + p.injuries * 0.55 + (p.karma > p.merit ? 8 : 0));
  el.stats.innerHTML = `
    <div class="stat-grid">
      <span>境界</span><strong>${realmName()}</strong>
      <span>修为</span><strong>${p.cultivation}/${nextNeed}</strong>
      <span>生命/心境</span><strong>${p.hp}/${p.mood}</strong>
      <span>道心/灵力纯度</span><strong>${p.daoHeart}/${p.qiPurity}</strong>
      <span>心魔印记</span><strong>${p.demonMark}</strong>
      <span>伤势堆叠</span><strong>${p.injuries}</strong>
      <span>功德/因果</span><strong>${p.merit}/${p.karma}</strong>
      <span>灵石/灵药</span><strong>${p.stones}/${p.herbs}</strong>
      <span>法宝/功法</span><strong>${p.artifacts}/${p.manuals}</strong>
      <span>宗门贡献</span><strong>${p.contribution}</strong>
      <span>宗门/位置</span><strong>${p.sect}/${p.location}</strong>
      <span>突破成功率</span><strong>${chance}%</strong>
    </div>
    <hr />
    <div>突破条件：修为达标 + 灵药≥8 + 灵石≥400 + 道心≥45 + 灵力纯度≥45</div>
    <div>风险评估：${risk < 28 ? "低" : risk < 52 ? "中" : "高"}，风险会降低未来收益并抬升天劫压力。</div>
  `;

  el.mapPanel.innerHTML = Object.entries(state.world.control).map(([k, v]) => {
    const m = LOCATIONS[k];
    return `• ${k}（${m.tag}）: ${v}｜风险${m.risk >= 0 ? "+" : ""}${m.risk}`;
  }).join("<br/>") +
  `<hr/>紧张度:${state.world.tension}｜乱度:${state.world.chaos}｜繁荣:${state.world.prosperity}｜天劫压力:${state.world.tribulationPressure}`;
}

function renderProdigies() {
  el.prodigyList.innerHTML = "";
  state.prodigies.forEach((pd) => {
    const node = el.prodigyTpl.content.firstElementChild.cloneNode(true);
    node.querySelector(".name").textContent = pd.name;
    node.querySelector(".path").textContent = `${pd.path}｜${pd.realm}`;
    node.querySelector(".prodigy-meta").textContent =
      `灵根:${pd.root} 忠诚:${pd.loyalty} 野心:${pd.ambition} 魔性:${pd.demonic} 感恩:${pd.gratitude} 成长:${pd.growth} 关系:${pd.relation} 投资:${pd.invested}`;
    const input = node.querySelector(".invest-input");
    node.querySelector(".invest-btn").addEventListener("click", () => investProdigy(pd.name, Math.max(10, Number(input.value || 100))));
    el.prodigyList.appendChild(node);
  });
}

function investProdigy(name, amount) {
  const p = state.player;
  const pd = state.prodigies.find((x) => x.name === name);
  if (!pd) return;
  if (p.stones < amount) return logTo(el.dialogueLog, `灵石不足，无法投资 ${name}。`, "warn");

  p.stones -= amount;
  pd.invested += amount;
  const trust = (pd.loyalty + pd.gratitude + pd.relation) / 3;
  const danger = (pd.ambition * 0.6 + pd.demonic * 0.8) - trust * 0.7 + p.karma * 0.4;
  const synergy = Math.max(0.55, (trust + pd.growth - pd.ambition * 0.5 - pd.demonic * 0.4) / 140);
  const gain = Math.round(amount * (0.55 + pd.growth / 100) * synergy);

  const returns = [
    () => applyEffects({ stones: Math.round(gain * 0.7), contribution: 1, prosperity: 1 }),
    () => applyEffects({ herbs: Math.max(1, Math.round(gain / 60)), qiPurity: 1 }),
    () => applyEffects({ manuals: Math.random() < 0.38 ? 1 : 0, daoHeart: 1 }),
    () => applyEffects({ artifacts: Math.random() < 0.22 ? 1 : 0, tension: 1, insight: 1 }),
  ];
  returns[Math.floor(Math.random() * returns.length)]();

  pd.growth += 1 + Math.floor(amount / 500);
  pd.relation += 1;
  pd.loyalty += Math.random() < 0.65 ? 1 : 0;
  pd.ambition += Math.random() < 0.30 ? 1 : 0;

  if (Math.random() * 100 < Math.max(3, danger * 0.65)) {
    const steal = Math.min(p.stones, 90 + Math.floor(Math.random() * 220));
    applyEffects({ stones: -steal, chaos: 3, karma: 1, demonMark: 1 });
    logTo(el.eventLog, `【天骄反噬】${pd.name} 借机扩张势力，暗中挪走 ${steal} 灵石。因果+1，乱度上升。`, "warn");
  } else {
    applyEffects({ merit: 1, contribution: 2 });
    logTo(el.dialogueLog, `恭喜宿主，成功投资 ${pd.name}（${amount}灵石），契合度 ${(synergy * 100).toFixed(0)}%，后续回报链已增强。`, "system");
  }

  if (pd.growth > 52 && Math.random() < 0.25) {
    state.world.control["落月秘境"] = pd.name;
    applyEffects({ tension: 2, prosperity: 1 });
    logTo(el.eventLog, `【格局变动】${pd.name} 夺得落月秘境控制权，探索收益与事件难度同步提高。`, "world");
  }

  clampState();
  renderStats();
  renderProdigies();
}

function actionBaseMultiplier() {
  const p = state.player;
  const place = locMod();
  const injuryPenalty = Math.max(0.45, 1 - p.injuries * 0.012);
  const demonPenalty = Math.max(0.55, 1 - p.demonMark * 0.009);
  const moodBonus = 0.8 + p.mood / 100;
  return injuryPenalty * demonPenalty * moodBonus * (1 + place.cultBonus * 0.5);
}

function manualAction(action) {
  const p = state.player;
  const place = locMod();
  const m = actionBaseMultiplier();

  if (action === "cultivate") {
    const gain = Math.round((55 + Math.random() * 35) * m * (isNight() ? 1.15 : 0.95));
    applyEffects({ cultivation: gain, qiPurity: 1, mood: 1, demonMark: Math.random() < 0.2 ? 1 : 0 });
    logTo(el.dialogueLog, `你运转周天，获得修为 ${gain}。${isNight() ? "夜修更稳" : "白日杂念较多"}。`, "player");
  } else if (action === "secluded") {
    const cost = Math.round(70 * place.tax);
    if (p.stones < cost) return logTo(el.dialogueLog, `闭关需要 ${cost} 灵石维持阵法。`, "warn");
    const gain = Math.round((110 + Math.random() * 70) * m * (1 + p.manuals * 0.03));
    applyEffects({ cultivation: gain, stones: -cost, mood: -2, daoHeart: 1, demonMark: -1, injuries: Math.random() < 0.2 ? 1 : 0 });
    logTo(el.dialogueLog, `你选择闭关，消耗 ${cost} 灵石，修为 +${gain}，道心得到淬炼。`, "player");
  } else if (action === "explore") {
    const gain = Math.round((28 + Math.random() * 40) * (1 + place.exploreBonus));
    const hazard = Math.max(0.05, 0.18 + place.risk / 100 + state.world.chaos / 180 + p.demonMark / 300);
    applyEffects({ cultivation: gain, herbs: 3 + Math.floor(Math.random() * 4), tension: 1 });
    if (Math.random() < hazard) {
      applyEffects({ hp: -8, injuries: 3, demonMark: 1, karma: 1 });
      logTo(el.eventLog, `探索途中遭遇伏击，伤势+3，因果+1。此后突破与收益都将受影响。`, "warn");
    }
    logTo(el.dialogueLog, `你在 ${p.location} 探索获修为 +${gain}，并采集灵药。`, "player");
  } else if (action === "alchemy") {
    const need = Math.max(4, 6 - Math.floor(place.alchemyBonus * 4));
    if (p.herbs < need) return logTo(el.dialogueLog, `灵药不足（需要 ${need}）。`, "warn");
    const quality = Math.round((p.qiPurity + p.daoHeart + p.insight * 2) / 3 + Math.random() * 10);
    const income = Math.round((90 + quality * 1.4) * place.tax);
    applyEffects({ herbs: -need, stones: income, qiPurity: 1, mood: 1, merit: quality > 70 ? 1 : 0, karma: quality < 40 ? 1 : 0 });
    logTo(el.dialogueLog, `丹炉微鸣，丹品评分 ${quality}，获得 ${income} 灵石。丹品会反馈功德/因果链。`, "player");
  } else if (action === "artifact") {
    const cost = Math.round(160 * place.tax);
    if (p.stones < cost) return logTo(el.dialogueLog, `炼器需要 ${cost} 灵石。`, "warn");
    const stable = p.daoHeart > 55 && p.qiPurity > 52;
    applyEffects({ stones: -cost, artifacts: 1, cultivation: 20, demonMark: stable ? 0 : 2, injuries: stable ? 0 : 1 });
    logTo(el.dialogueLog, stable ? "炼器成功，法宝入库并稳固道基。" : "炼器成功但心神不稳，心魔印记上升。", "player");
  } else if (action === "dungeon") {
    const reward = Math.round((120 + Math.random() * 100) * (1 + place.exploreBonus));
    const risk = 0.25 + place.risk / 80 + state.world.tension / 220;
    applyEffects({ stones: reward, herbs: 6, cultivation: 70, chaos: 1, tension: 2 });
    if (Math.random() < risk) applyEffects({ hp: -14, injuries: 6, demonMark: 2, karma: 1 });
    else applyEffects({ merit: 2, insight: 2 });
    logTo(el.dialogueLog, `你闯秘境副本，灵石 +${reward}。高收益同时抬升世界紧张度。`, "player");
  } else if (action === "breakthrough") {
    return tryBreakthrough();
  } else if (action === "tribulation") {
    return doMindTribulation();
  }

  postActionDecay();
  renderStats();
}

function postActionDecay() {
  const p = state.player;
  if (p.mood < 35) applyEffects({ demonMark: 1, daoHeart: -1 });
  if (p.injuries > 35) applyEffects({ hp: -1, mood: -1 });
}

function doMindTribulation() {
  const p = state.player;
  const success = 35 + p.daoHeart * 0.5 + p.merit * 0.4 - p.karma * 0.5 - p.demonMark * 0.8;
  if (Math.random() * 100 < success) {
    applyEffects({ demonMark: -8, daoHeart: 4, mood: 4, insight: 3, merit: 1, tribulationPressure: -2 });
    logTo(el.dialogueLog, "你渡过心劫，心魔印记显著下降，未来突破成功率提高。", "system");
  } else {
    applyEffects({ injuries: 4, mood: -6, demonMark: 5, qiPurity: -2, karma: 1 });
    logTo(el.dialogueLog, "渡心劫失败，反噬加剧：后续行动收益和突破率都会受损。", "warn");
  }
  renderStats();
}

function tryBreakthrough() {
  const p = state.player;
  if (p.realm >= REALM_DATA.length - 1 && p.sub >= REALM_DATA[p.realm].sub.length - 1) return logTo(el.dialogueLog, "你已立于此界绝巅，待天门再启。", "system");

  const need = needForNext();
  if (p.cultivation < need || p.herbs < 8 || p.stones < 400 || p.daoHeart < 45 || p.qiPurity < 45) {
    return logTo(el.dialogueLog, "突破条件不足（修为/资源/道心/灵力纯度）请先补足。", "warn");
  }

  const chance = calcBreakthroughChance();
  applyEffects({ stones: -400, herbs: -8, cultivation: -need, tribulationPressure: 1 });

  if (Math.random() * 100 < chance) {
    p.sub += 1;
    if (p.sub >= REALM_DATA[p.realm].sub.length) { p.sub = 0; p.realm += 1; }
    applyEffects({ daoHeart: 3, qiPurity: 2, demonMark: -3, merit: 2, tension: 2 });
    logTo(el.dialogueLog, `【突破成功】你已晋升至 ${realmName()}。功德增加并压低后续反噬概率。`, "system");
    if (Math.random() < 0.45) logTo(el.eventLog, `【异象】${realmName()}异象冲霄，世界紧张度提升，强敌关注你。`, "world");
  } else {
    const debuff = ["丹裂", "经脉淤塞", "心魔萌芽", "虚浮道基"][Math.floor(Math.random() * 4)];
    applyEffects({ hp: -16, mood: -10, injuries: 10, demonMark: 6, qiPurity: -4, karma: 1, chaos: 2 });
    if (Math.random() < 0.25 && p.sub > 0) p.sub -= 1;
    logTo(el.dialogueLog, `【突破失败】${debuff}：伤势与心魔上升，将持续降低行动收益并提高天劫压力。`, "warn");
  }

  renderStats();
}

function parseCommand(raw) {
  const text = raw.trim();
  if (!text) return;
  logTo(el.dialogueLog, `> ${text}`, "player");

  if (["修炼", "打坐"].includes(text)) return manualAction("cultivate");
  if (["闭关", "闭关修炼"].includes(text)) return manualAction("secluded");
  if (["探索", "外出"].includes(text)) return manualAction("explore");
  if (text === "炼丹") return manualAction("alchemy");
  if (text === "炼器") return manualAction("artifact");
  if (["副本", "探秘", "探秘副本"].includes(text)) return manualAction("dungeon");
  if (["突破", "尝试突破"].includes(text)) return manualAction("breakthrough");
  if (["渡心劫", "心劫"].includes(text)) return manualAction("tribulation");

  if (text.startsWith("加入宗门")) {
    const name = text.replace("加入宗门", "").trim() || "青岚宗";
    state.player.sect = name;
    state.player.location = name in LOCATIONS ? name : state.player.location;
    applyEffects({ contribution: 10, merit: 1, mood: 2 });
    logTo(el.dialogueLog, `你已加入 ${name}，宗门资源将影响周结算与突破辅助。`, "system");
    return renderStats();
  }

  if (text.startsWith("前往")) {
    const place = text.replace("前往", "").trim();
    if (!(place in LOCATIONS)) return logTo(el.dialogueLog, `未知地点：${place}`, "warn");
    state.player.location = place;
    applyEffects({ mood: -1 + Math.floor((LOCATIONS[place].risk < 8 ? 2 : 0)), tension: LOCATIONS[place].risk > 10 ? 1 : 0 });
    logTo(el.dialogueLog, `你已前往 ${place}（${LOCATIONS[place].tag}）。区域修炼与风险系数已生效。`, "system");
    return renderStats();
  }

  if (text.startsWith("投资")) {
    const [_, name, amt] = text.split(/\s+/);
    if (!name) return logTo(el.dialogueLog, "用法：投资 天骄名 金额", "warn");
    return investProdigy(name, Number(amt || 100));
  }

  if (["帮助", "help"].includes(text.toLowerCase())) {
    return logTo(el.dialogueLog, "指令：修炼/闭关/探索/炼丹/炼器/探秘副本/突破/渡心劫/加入宗门 名称/前往 地点/投资 天骄 金额", "system");
  }

  logTo(el.dialogueLog, "系统已记录你的意图，世界线将在后续时辰反馈结果。", "system");
}

function tickCooldowns() {
  for (const [id, left] of cooldownBook.entries()) {
    if (left <= 1) cooldownBook.delete(id);
    else cooldownBook.set(id, left - 1);
  }
}

function weightedPick(list) {
  if (!list.length) return null;
  const sum = list.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * sum;
  for (const x of list) {
    r -= x.weight;
    if (r <= 0) return x;
  }
  return list[list.length - 1];
}

function renderChoicePanel() {
  el.choicePanel.innerHTML = "";
  if (!state.pendingChoice) return;
  state.pendingChoice.choices.forEach((c, idx) => {
    const b = document.createElement("button");
    b.textContent = c.text;
    b.addEventListener("click", () => resolveChoice(idx));
    el.choicePanel.appendChild(b);
  });
}

function resolveChoice(index) {
  const pending = state.pendingChoice;
  if (!pending) return;
  const choice = pending.choices[index];
  applyEffects(choice.effects);
  logTo(el.eventLog, `【事件抉择】你选择了「${choice.text}」，因果链已写入世界状态。`, "world");

  if (pending.tags.includes("投资")) {
    const target = state.prodigies[Math.floor(Math.random() * state.prodigies.length)];
    const shift = choice.effects.relationShift || (choice.text.includes("继续") ? 2 : -1);
    target.relation += shift;
    target.loyalty += shift > 0 ? 1 : 0;
    target.ambition += shift < 0 ? 1 : 0;
  }

  state.pendingChoice = null;
  renderChoicePanel();
  renderStats();
  renderProdigies();
}

function triggerWorldEvents() {
  tickCooldowns();
  if (state.pendingChoice) return;

  const pool = eventLibrary.filter((ev) => state.player.realm >= ev.minRealm && !cooldownBook.has(ev.id));
  const count = Math.random() < 0.58 ? 1 : 2;
  for (let i = 0; i < count; i++) {
    const ev = weightedPick(pool);
    if (!ev) continue;
    cooldownBook.set(ev.id, ev.cooldown);
    state.pendingChoice = ev;
    logTo(el.eventLog, `【${ev.title}】${ev.desc}`, "world");
    renderChoicePanel();
    break;
  }

  if (state.time.day % 7 === 0 && state.time.segment === 0) weeklySettlement();
}

function weeklySettlement() {
  const p = state.player;
  if (p.sect !== "散修") {
    const salary = Math.round((80 + p.contribution * 2 + p.merit * 3 - p.karma) * (1 - state.world.chaos / 250));
    applyEffects({ stones: Math.max(30, salary), contribution: 2, mood: 1 });
    logTo(el.eventLog, `【宗门周结算】发放俸禄 ${Math.max(30, salary)} 灵石。乱度越高，俸禄折损越大。`, "world");
  }

  state.prodigies.forEach((pd) => {
    if (pd.invested <= 0) return;
    const trust = (pd.loyalty + pd.gratitude + pd.relation) / 3;
    const yieldRate = Math.max(0.01, 0.04 + pd.growth / 600 + trust / 800 - pd.ambition / 700 - pd.demonic / 700);
    const back = Math.round(pd.invested * yieldRate);
    applyEffects({ stones: back, prosperity: 1, merit: back > 80 ? 1 : 0 });
    pd.invested = Math.round(pd.invested * 0.9);
    if (Math.random() < 0.24) pd.realm = ["炼气圆满", "筑基初期", "筑基后期", "金丹凝丹"][Math.floor(Math.random() * 4)];
    logTo(el.eventLog, `【投资分红】${pd.name} 回馈 ${back} 灵石（收益率 ${(yieldRate * 100).toFixed(1)}%）。`, "world");
  });

  applyEffects({ mood: -1 + (p.merit > p.karma ? 1 : 0), tribulationPressure: p.karma > p.merit ? 1 : -1 });
  renderProdigies();
}

function timeTick() {
  state.time.secLeft -= 1;
  if (state.time.secLeft > 0) return renderTime();

  state.time.secLeft = SEGMENT_DURATION;
  state.time.segment += 1;
  if (state.time.segment >= TIME_SEGMENTS.length) {
    state.time.segment = 0;
    state.time.day += 1;
    applyEffects({ mood: -1, hp: 2, demonMark: state.player.mood < 35 ? 1 : 0, injuries: state.player.injuries > 45 ? 1 : 0 });
    if (state.time.day > 30) {
      state.time.day = 1;
      state.time.month += 1;
      if (state.time.month > 12) {
        state.time.month = 1;
        state.time.year += 1;
      }
      applyEffects({ tribulationPressure: 1, tension: 1 });
    }
  }

  triggerWorldEvents();
  renderStats();
  renderTime();
}

function renderTime() {
  const t = state.time;
  el.timeDisplay.textContent = `第${t.year}年·${t.month}月·${t.day}日 ${TIME_SEGMENTS[t.segment]}`;
  el.timerDisplay.textContent = `下个时辰：${t.secLeft}s`;
}

function boot() {
  logTo(el.dialogueLog, "修仙系统绑定成功。你的每个属性都将改变后续收益、风险与剧情。", "system");
  logTo(el.dialogueLog, "提示：心魔印记、伤势、因果都会进入突破公式和事件判定，可用『渡心劫』与功德行为缓解。", "system");
  logTo(el.eventLog, `事件库加载完成：${eventLibrary.length} 条，并已启用“事件选择→结果反馈→长期影响”链路。`, "world");

  document.querySelectorAll("[data-action]").forEach((btn) => btn.addEventListener("click", () => manualAction(btn.dataset.action)));
  el.sendBtn.addEventListener("click", () => { parseCommand(el.commandInput.value); el.commandInput.value = ""; });
  el.commandInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { parseCommand(el.commandInput.value); el.commandInput.value = ""; }
  });

  renderStats();
  renderProdigies();
  renderChoicePanel();
  renderTime();
  setInterval(timeTick, 1000);
}

boot();
