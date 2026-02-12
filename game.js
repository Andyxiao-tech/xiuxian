const TIME_SEGMENTS = [
  "子时 星沉", "丑时 露重", "寅时 拂晓", "卯时 朝曦", "辰时 辰光", "巳时 巳阳",
  "午时 日中", "未时 晡后", "申时 西成", "酉时 夕照", "戌时 初夜", "亥时 深更"
];
const SEGMENT_DURATION = 40;

const REALM_DATA = [
  { name: "炼气", sub: Array.from({ length: 12 }, (_, i) => `${i + 1}层`), baseNeed: 110 },
  { name: "筑基", sub: ["初期", "中期", "后期", "圆满"], baseNeed: 360 },
  { name: "金丹", sub: ["凝丹", "成丹", "养丹", "圆满"], baseNeed: 860 },
  { name: "元婴", sub: ["凝婴", "稳婴", "出窍", "圆满"], baseNeed: 1800 },
  { name: "化神", sub: ["化形", "法相", "道意", "圆满"], baseNeed: 3600 },
  { name: "合体", sub: ["相融", "入身", "分身", "圆满"], baseNeed: 6200 },
  { name: "大乘", sub: ["前期", "中期", "后期", "圆满"], baseNeed: 9800 },
  { name: "飞升", sub: ["天劫", "天门", "仙躯"], baseNeed: 18000 }
];

const state = {
  time: { year: 1, month: 1, day: 1, segment: 0, secLeft: SEGMENT_DURATION, weekDay: 1 },
  player: {
    name: "宿主",
    realm: 0,
    sub: 0,
    cultivation: 0,
    hp: 100,
    mood: 76,
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
    buffs: [],
    risks: { heartDemon: 8, injury: 0 },
  },
  world: {
    tension: 18,
    chaos: 10,
    prosperity: 50,
    control: {
      "凡人城镇": "中立",
      "青岚宗": "青岚宗",
      "赤霄宗": "赤霄宗",
      "落月秘境": "中立",
      "万妖山": "妖族",
      "仙界入口": "天道禁制"
    }
  },
  prodigies: [
    { name: "林清雪", root: "冰灵根", path: "正道", realm: "炼气九层", loyalty: 78, ambition: 34, demonic: 6, gratitude: 85, growth: 22, invested: 0 },
    { name: "韩烈", root: "火雷双灵根", path: "战修", realm: "筑基初期", loyalty: 56, ambition: 72, demonic: 22, gratitude: 41, growth: 31, invested: 0 },
    { name: "苏晚照", root: "木灵根", path: "丹道", realm: "炼气圆满", loyalty: 69, ambition: 48, demonic: 9, gratitude: 72, growth: 27, invested: 0 },
    { name: "顾长风", root: "剑灵体", path: "剑道", realm: "筑基中期", loyalty: 44, ambition: 88, demonic: 35, gratitude: 30, growth: 38, invested: 0 },
    { name: "白绫", root: "幻灵根", path: "诡道", realm: "炼气七层", loyalty: 51, ambition: 63, demonic: 57, gratitude: 36, growth: 25, invested: 0 },
  ],
  logs: { dialogue: [], events: [] },
  pendingChoices: []
};

const eventLibrary = buildEventLibrary();

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
  prodigyTpl: document.getElementById("prodigyTpl"),
};

function buildEventLibrary() {
  const lib = [];
  const domains = ["修炼", "探索", "投资", "炼丹", "炼器", "副本", "宗门", "天劫", "红尘", "妖兽"];
  const moods = ["平稳", "激荡", "诡异", "祥瑞", "危机", "顿悟", "纷争", "潮涌"];
  const rewards = [
    () => ({ cultivation: 40, mood: 2 }),
    () => ({ stones: 120, prosperity: 1 }),
    () => ({ herbs: 8, cultivation: 15 }),
    () => ({ merit: 2, karma: -1 }),
    () => ({ contribution: 5, stones: 80 }),
    () => ({ tension: -1, mood: 3 }),
  ];

  let id = 1;
  domains.forEach((d, di) => {
    for (let i = 0; i < 22; i++) {
      const m = moods[(i + di) % moods.length];
      const reward = rewards[(i + di) % rewards.length]();
      lib.push({
        id: `EV-${id++}`,
        title: `${d}事件·${m}第${i + 1}卷`,
        desc: `【${d}】天地灵机呈现${m}之象，你遭遇“${d}${i + 1}号异变”，系统建议谨慎决策。`,
        tags: [d, m],
        weight: 5 + (i % 7),
        minRealm: di % 3 === 0 ? 0 : di % 4,
        cooldown: 2 + (i % 5),
        effects: reward
      });
    }
  });

  const breakthroughs = ["经脉淤塞", "道基裂纹", "丹火失衡", "心魔低语", "神识震荡", "法相反噬"];
  for (let i = 0; i < 36; i++) {
    lib.push({
      id: `RISK-${i + 1}`,
      title: `突破风险预警·${i + 1}`,
      desc: `系统演算：若强行突破，可能触发「${breakthroughs[i % breakthroughs.length]}」。建议准备护法与材料。`,
      tags: ["突破", "风险"],
      weight: 6,
      minRealm: Math.floor(i / 6),
      cooldown: 6,
      effects: () => ({ mood: -2, heartDemon: 1 })
    });
  }

  const prodigyEvents = ["捷报", "叛心", "顿悟", "受创", "奇遇", "求援"];
  for (let i = 0; i < 40; i++) {
    lib.push({
      id: `PD-${i + 1}`,
      title: `天骄回响·${prodigyEvents[i % 6]}#${i + 1}`,
      desc: `你投资的天骄传来消息：当前状态为「${prodigyEvents[i % 6]}」，其抉择将影响宗门与天下格局。`,
      tags: ["投资", "天骄"],
      weight: 7,
      minRealm: 0,
      cooldown: 3,
      effects: () => ({ stones: 60 + (i % 5) * 35, contribution: 2 + (i % 4) })
    });
  }

  return lib;
}

const cooldownBook = new Map();

function logTo(panel, text, kind = "system") {
  const node = document.createElement("div");
  node.className = `msg ${kind}`;
  node.textContent = text;
  panel.appendChild(node);
  panel.scrollTop = panel.scrollHeight;
}

function realmName() {
  const r = REALM_DATA[state.player.realm];
  return `${r.name}${r.sub[state.player.sub]}`;
}

function needForNext() {
  const r = REALM_DATA[state.player.realm];
  return Math.round(r.baseNeed * (1 + state.player.sub * 0.35));
}

function renderStats() {
  const p = state.player;
  const nextNeed = needForNext();
  const risk = Math.min(95, p.risks.heartDemon + p.risks.injury + (p.mood < 45 ? 12 : 0));
  el.stats.innerHTML = `
    <div class="stat-grid">
      <span>境界</span><strong>${realmName()}</strong>
      <span>修为</span><strong>${p.cultivation}/${nextNeed}</strong>
      <span>生命</span><strong>${p.hp}</strong>
      <span>心境</span><strong>${p.mood}</strong>
      <span>灵石</span><strong>${p.stones}</strong>
      <span>灵药</span><strong>${p.herbs}</strong>
      <span>法宝</span><strong>${p.artifacts}</strong>
      <span>功法</span><strong>${p.manuals}</strong>
      <span>宗门</span><strong>${p.sect}</strong>
      <span>位置</span><strong>${p.location}</strong>
      <span>功德/因果</span><strong>${p.merit}/${p.karma}</strong>
      <span>心魔风险</span><strong>${risk}%</strong>
    </div>
    <hr />
    <div>突破需求：修为达标 + 材料（灵药≥8，灵石≥400）+ 心境≥45</div>
    <div>风险评估：${risk < 30 ? "低" : risk < 55 ? "中" : "高"}（失败可能触发Debuff）</div>
  `;

  el.mapPanel.innerHTML = Object.entries(state.world.control)
    .map(([k, v]) => `• ${k}：${v}`)
    .join("<br />") +
    `<hr/>世界紧张度：${state.world.tension}｜乱度：${state.world.chaos}｜繁荣：${state.world.prosperity}`;
}

function renderProdigies() {
  el.prodigyList.innerHTML = "";
  state.prodigies.forEach((pd) => {
    const node = el.prodigyTpl.content.firstElementChild.cloneNode(true);
    node.querySelector(".name").textContent = pd.name;
    node.querySelector(".path").textContent = `${pd.path}｜${pd.realm}`;
    node.querySelector(".prodigy-meta").textContent =
      `灵根:${pd.root} 忠诚:${pd.loyalty} 野心:${pd.ambition} 魔性:${pd.demonic} 感恩:${pd.gratitude} 成长:${pd.growth} 投资:${pd.invested}`;

    const input = node.querySelector(".invest-input");
    node.querySelector(".invest-btn").addEventListener("click", () => {
      const amt = Math.max(10, Number(input.value || 100));
      investProdigy(pd.name, amt);
    });

    el.prodigyList.appendChild(node);
  });
}

function investProdigy(name, amount) {
  const p = state.player;
  const pd = state.prodigies.find((x) => x.name === name);
  if (!pd) return;
  if (p.stones < amount) {
    logTo(el.dialogueLog, `灵石不足，无法投资 ${name}。`, "warn");
    return;
  }
  p.stones -= amount;
  pd.invested += amount;
  const synergy = Math.max(0.7, (pd.gratitude + pd.loyalty - pd.ambition * 0.3 - pd.demonic * 0.4) / 120);
  const gain = Math.round(amount * (1.0 + pd.growth / 100) * synergy);
  const rewardType = ["stones", "herbs", "manuals", "artifacts"][Math.floor(Math.random() * 4)];

  if (rewardType === "stones") p.stones += Math.round(gain * 0.7);
  if (rewardType === "herbs") p.herbs += Math.max(1, Math.round(gain / 60));
  if (rewardType === "manuals") p.manuals += Math.random() < 0.35 ? 1 : 0;
  if (rewardType === "artifacts") p.artifacts += Math.random() < 0.2 ? 1 : 0;

  pd.growth += 1 + Math.floor(amount / 500);
  pd.loyalty += Math.random() < 0.75 ? 1 : 0;
  pd.ambition += Math.random() < 0.25 ? 1 : 0;

  const betrayal = Math.max(1, pd.ambition + pd.demonic - pd.loyalty - pd.gratitude / 2);
  if (Math.random() * 100 < betrayal * 0.7) {
    const steal = Math.min(p.stones, 120 + Math.floor(Math.random() * 180));
    p.stones -= steal;
    logTo(el.eventLog, `【天骄异动】${pd.name} 野心膨胀，暗中挪走资源 ${steal} 灵石！`, "warn");
    state.world.chaos += 2;
  } else {
    logTo(el.dialogueLog, `恭喜宿主，成功投资 ${pd.name}（${amount}灵石）并获得返利，当前契合度 ${(synergy * 100).toFixed(0)}%。`, "system");
  }

  if (pd.growth > 50 && Math.random() < 0.25) {
    state.world.control["落月秘境"] = pd.name;
    logTo(el.eventLog, `【格局变动】${pd.name} 夺得落月秘境控制权，世界线发生偏转。`, "world");
  }

  renderStats();
  renderProdigies();
}

function applyEffects(effects) {
  const p = state.player;
  for (const [k, v] of Object.entries(effects)) {
    if (k in p && typeof p[k] === "number") p[k] += v;
    else if (k === "heartDemon") p.risks.heartDemon += v;
    else if (k in state.world && typeof state.world[k] === "number") state.world[k] += v;
  }
  clampPlayer();
}

function clampPlayer() {
  const p = state.player;
  p.hp = Math.max(1, Math.min(100, p.hp));
  p.mood = Math.max(0, Math.min(100, p.mood));
  p.stones = Math.max(0, p.stones);
  p.herbs = Math.max(0, p.herbs);
  p.risks.heartDemon = Math.max(0, Math.min(95, p.risks.heartDemon));
  p.risks.injury = Math.max(0, Math.min(95, p.risks.injury));
}

function manualAction(action) {
  const p = state.player;
  if (action === "cultivate") {
    p.cultivation += 50 + Math.floor(Math.random() * 40);
    p.mood += 1;
    logTo(el.dialogueLog, "你运转周天，灵力缓慢凝实。", "player");
  } else if (action === "secluded") {
    p.cultivation += 100 + Math.floor(Math.random() * 80);
    p.mood -= 2;
    p.stones = Math.max(0, p.stones - 70);
    logTo(el.dialogueLog, "你选择闭关，时间与灵石被快速消耗。", "player");
  } else if (action === "explore") {
    p.cultivation += 30;
    p.herbs += 3 + Math.floor(Math.random() * 4);
    state.world.tension += Math.random() < 0.3 ? 2 : 0;
    logTo(el.dialogueLog, "你外出探索，采得灵药并记录地脉。", "player");
  } else if (action === "alchemy") {
    if (p.herbs < 6) return logTo(el.dialogueLog, "灵药不足，无法炼丹。", "warn");
    p.herbs -= 6;
    p.mood += 2;
    p.stones += 90;
    logTo(el.dialogueLog, "丹炉微鸣，炼丹小成，售丹获得灵石。", "player");
  } else if (action === "artifact") {
    if (p.stones < 150) return logTo(el.dialogueLog, "灵石不足，无法炼器。", "warn");
    p.stones -= 150;
    p.artifacts += 1;
    p.cultivation += 18;
    logTo(el.dialogueLog, "地火淬炼，法器出炉。", "player");
  } else if (action === "dungeon") {
    p.cultivation += 70;
    p.hp -= 8 + Math.floor(Math.random() * 10);
    p.stones += 130;
    p.herbs += 6;
    logTo(el.dialogueLog, "你闯入秘境副本，带伤而归但收获颇丰。", "player");
  } else if (action === "breakthrough") {
    tryBreakthrough();
  }

  clampPlayer();
  renderStats();
}

function tryBreakthrough() {
  const p = state.player;
  if (p.realm >= REALM_DATA.length - 1 && p.sub >= REALM_DATA[p.realm].sub.length - 1) {
    return logTo(el.dialogueLog, "你已立于此界绝巅，待天门再启。", "system");
  }

  const need = needForNext();
  const hasMaterial = p.herbs >= 8 && p.stones >= 400;
  const calmMind = p.mood >= 45;
  if (p.cultivation < need || !hasMaterial || !calmMind) {
    return logTo(el.dialogueLog, "突破条件不足：请补充修为、材料或心境。", "warn");
  }

  const base = 62 + p.luck * 0.4 + p.merit * 0.5 - p.karma * 0.6 - p.risks.heartDemon * 0.8 - p.risks.injury * 0.6;
  const bonus = (p.sect === "散修" ? 0 : 6) + (p.artifacts > 0 ? 3 : 0) + (p.manuals > 0 ? 3 : 0);
  const chance = Math.max(8, Math.min(94, base + bonus));

  p.stones -= 400;
  p.herbs -= 8;
  p.cultivation -= need;

  if (Math.random() * 100 < chance) {
    p.risks.heartDemon = Math.max(0, p.risks.heartDemon - 3);
    p.mood += 6;
    p.merit += 1;

    p.sub += 1;
    if (p.sub >= REALM_DATA[p.realm].sub.length) {
      p.sub = 0;
      p.realm += 1;
    }

    logTo(el.dialogueLog, `【突破成功】恭喜宿主，已晋升至 ${realmName()}！`, "system");
    if (Math.random() < 0.4) {
      logTo(el.eventLog, `【异象】${realmName()} 之威引动天象，四方势力开始关注你。`, "world");
      state.world.tension += 3;
    }
  } else {
    const bad = ["丹裂", "经脉淤塞", "心魔萌芽", "虚浮道基"];
    const debuff = bad[Math.floor(Math.random() * bad.length)];
    p.hp -= 14;
    p.mood -= 9;
    p.risks.injury += 9;
    p.risks.heartDemon += 5;
    if (Math.random() < 0.2 && p.sub > 0) p.sub -= 1;
    logTo(el.dialogueLog, `【突破失败】你遭遇${debuff}，战力短期下滑。`, "warn");
  }

  clampPlayer();
  renderStats();
}

function parseCommand(raw) {
  const text = raw.trim();
  if (!text) return;
  logTo(el.dialogueLog, `> ${text}`, "player");

  if (["修炼", "打坐"].includes(text)) return manualAction("cultivate");
  if (["闭关", "闭关修炼"].includes(text)) return manualAction("secluded");
  if (["探索", "外出"].includes(text)) return manualAction("explore");
  if (["炼丹"].includes(text)) return manualAction("alchemy");
  if (["炼器"].includes(text)) return manualAction("artifact");
  if (["副本", "探秘", "探秘副本"].includes(text)) return manualAction("dungeon");
  if (["突破", "尝试突破"].includes(text)) return manualAction("breakthrough");

  if (text.startsWith("加入宗门")) {
    const name = text.replace("加入宗门", "").trim() || "青岚宗";
    state.player.sect = name;
    state.player.contribution += 10;
    logTo(el.dialogueLog, `你已加入 ${name}，获得入门资源与任务。`, "system");
    return renderStats();
  }

  if (text.startsWith("前往")) {
    const place = text.replace("前往", "").trim();
    if (!place) return;
    state.player.location = place;
    logTo(el.dialogueLog, `你御器前往 ${place}。`, "system");
    return renderStats();
  }

  if (text.startsWith("投资")) {
    const arr = text.split(/\s+/);
    const name = arr[1];
    const amt = Number(arr[2] || 100);
    if (!name) return logTo(el.dialogueLog, "用法：投资 天骄名 金额", "warn");
    return investProdigy(name, amt);
  }

  if (["帮助", "help"].includes(text.toLowerCase())) {
    return logTo(el.dialogueLog, "可用指令：修炼/闭关/探索/炼丹/炼器/探秘副本/突破/加入宗门 名称/前往 地点/投资 天骄 金额", "system");
  }

  logTo(el.dialogueLog, "系统已记录你的意图，将在事件演化中反馈结果。", "system");
}

function tickCooldowns() {
  for (const [id, left] of cooldownBook.entries()) {
    if (left <= 1) cooldownBook.delete(id);
    else cooldownBook.set(id, left - 1);
  }
}

function triggerWorldEvents() {
  const p = state.player;
  tickCooldowns();

  const candidates = eventLibrary.filter((ev) =>
    p.realm >= ev.minRealm && !cooldownBook.has(ev.id)
  );

  const count = Math.random() < 0.65 ? 1 : 2;
  for (let n = 0; n < count; n++) {
    const picked = weightedPick(candidates);
    if (!picked) continue;
    cooldownBook.set(picked.id, picked.cooldown);
    const effects = picked.effects();
    applyEffects(effects);
    logTo(el.eventLog, `【${picked.title}】${picked.desc}`, "world");
  }

  if (state.time.day % 7 === 0 && state.time.segment === 0) {
    weeklySettlement();
  }
}

function weeklySettlement() {
  const p = state.player;
  let delta = 0;
  if (p.sect !== "散修") {
    delta = 80 + p.contribution * 2;
    p.stones += delta;
    p.contribution += 2;
    logTo(el.eventLog, `【周结算】宗门发放俸禄 ${delta} 灵石，贡献度提升。`, "world");
  }

  state.prodigies.forEach((pd) => {
    if (pd.invested <= 0) return;
    const returnAmt = Math.round(pd.invested * (0.03 + pd.growth / 500));
    p.stones += returnAmt;
    pd.invested = Math.round(pd.invested * 0.9);
    if (Math.random() < 0.25) pd.realm = ["炼气圆满", "筑基初期", "筑基后期", "金丹凝丹"][Math.floor(Math.random() * 4)];
    logTo(el.eventLog, `【投资分红】${pd.name} 回馈 ${returnAmt} 灵石。`, "world");
  });
  renderProdigies();
}

function weightedPick(list) {
  if (!list.length) return null;
  const total = list.reduce((s, it) => s + it.weight, 0);
  let rand = Math.random() * total;
  for (const it of list) {
    rand -= it.weight;
    if (rand <= 0) return it;
  }
  return list[list.length - 1];
}

function timeTick() {
  state.time.secLeft -= 1;
  if (state.time.secLeft <= 0) {
    state.time.secLeft = SEGMENT_DURATION;
    state.time.segment += 1;

    if (state.time.segment >= TIME_SEGMENTS.length) {
      state.time.segment = 0;
      state.time.day += 1;
      state.player.mood = Math.max(0, state.player.mood - 1);
      state.player.hp = Math.min(100, state.player.hp + 2);
      if (state.time.day > 30) {
        state.time.day = 1;
        state.time.month += 1;
        if (state.time.month > 12) {
          state.time.month = 1;
          state.time.year += 1;
        }
      }
    }

    triggerWorldEvents();
    renderStats();
    renderTime();
  } else {
    renderTime();
  }
}

function renderTime() {
  const t = state.time;
  el.timeDisplay.textContent = `第${t.year}年·${t.month}月·${t.day}日 ${TIME_SEGMENTS[t.segment]}`;
  el.timerDisplay.textContent = `下个时辰：${t.secLeft}s`;
}

function boot() {
  logTo(el.dialogueLog, "修仙系统绑定成功。欢迎来到修真界，宿主。", "system");
  logTo(el.dialogueLog, "建议先输入「帮助」查看指令，或直接点击下方行动按钮。", "system");
  logTo(el.eventLog, `事件库加载完成：${eventLibrary.length} 条事件，可持续扩展。`, "world");

  document.querySelectorAll("[data-action]").forEach((btn) =>
    btn.addEventListener("click", () => manualAction(btn.dataset.action))
  );

  el.sendBtn.addEventListener("click", () => {
    parseCommand(el.commandInput.value);
    el.commandInput.value = "";
  });

  el.commandInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      parseCommand(el.commandInput.value);
      el.commandInput.value = "";
    }
  });

  renderStats();
  renderProdigies();
  renderTime();
  setInterval(timeTick, 1000);
}

boot();
