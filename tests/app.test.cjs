const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const DAY = 24 * 60 * 60 * 1000;

class Element {
  constructor(tag = "div") {
    this.tagName = tag;
    this.children = [];
    this.dataset = {};
    this.listeners = {};
    this.disabled = false;
    this.textContent = "";
    this.className = "";
  }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  setAttribute(name, value) { this[name] = value; }
  click() { if (!this.disabled) this.listeners.click?.(); }
}

function createApp({ now = Date.UTC(2026, 0, 10), saved = null } = {}) {
  const elements = new Map();
  const local = new Map(saved ? [["stendino-data-v1", JSON.stringify(saved)]] : []);
  let intervalCallback;
  const document = {
    hidden: false,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    createElement(tag) { return new Element(tag); },
    addEventListener() {}
  };
  class TestDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const context = {
    document,
    localStorage: {
      getItem(key) { return local.get(key) ?? null; },
      setItem(key, value) { local.set(key, value); }
    },
    Date: TestDate,
    window: { addEventListener() {}, setInterval(callback) { intervalCallback = callback; } },
    location: { protocol: "https:", hostname: "example.test" },
    navigator: {},
    console
  };
  vm.runInNewContext(source, context);
  const cards = () => elements.get("rack-list").children;
  const card = (name) => cards().find((item) => item.children.some((child) => child.className === "rack-name" && child.textContent === name));
  const status = (name) => card(name).children.find((item) => item.className === "rack-status").textContent;
  const action = (name) => card(name).children.find((item) => item.className === "action-button");
  return {
    elements, local, cards, card, status, action,
    runInterval() { intervalCallback?.(); },
    setNow(value) { now = value; }
  };
}

test("defaults and independent two-phase lifecycle", () => {
  const app = createApp();
  assert.deepEqual(app.cards().map((item) => item.className), ["rack-card free", "rack-card free"]);
  assert.equal(app.status("VECCHIO"), "LIBERO");
  assert.equal(app.action("VECCHIO").textContent, "OCCUPA");
  app.elements.get("threshold-minus").click();
  app.elements.get("threshold-minus").click();
  app.action("VECCHIO").click();
  assert.equal(app.card("VECCHIO").dataset.phase, "outside");
  assert.match(app.status("VECCHIO"), /^FUORI DA 0 GIORNI$/);
  assert.equal(app.action("VECCHIO").textContent, "RITIRA");
  assert.ok(app.card("VECCHIO").children.some((item) => item.className === "rack-illustration"));
  assert.equal(app.card("NUOVO").className, "rack-card free");
  app.action("VECCHIO").click();
  assert.equal(app.card("VECCHIO").dataset.phase, "inside");
  assert.match(app.status("VECCHIO"), /^IN CASA DA 0 GIORNI$/);
  assert.equal(app.action("VECCHIO"), undefined);
  assert.match(app.card("VECCHIO").children.find((item) => item.className === "rack-illustration").innerHTML, /<svg/);
});

test("zero in-house threshold makes the rack ready immediately and clears it", () => {
  const app = createApp({ saved: {
    thresholdDays: 2,
    insideThresholdDays: 0,
    racks: { VECCHIO: { takenAt: new Date(Date.UTC(2026, 0, 8)).toISOString() }, NUOVO: {} }
  } });
  assert.equal(app.card("VECCHIO").className, "rack-card ready");
  assert.equal(app.status("VECCHIO"), "FUORI DA 2 GIORNI");
  app.action("VECCHIO").click();
  assert.equal(app.card("VECCHIO").dataset.phase, "inside");
  assert.equal(app.card("VECCHIO").className, "rack-card ready");
  assert.equal(app.status("VECCHIO"), "IN CASA DA 0 GIORNI");
  app.action("VECCHIO").click();
  assert.equal(app.card("VECCHIO").className, "rack-card free");
  assert.equal(app.status("VECCHIO"), "LIBERO");
  const saved = JSON.parse(app.local.get("stendino-data-v1"));
  assert.deepEqual(saved.racks.VECCHIO, { phase: null, since: null });
});

test("legacy records migrate without losing the outside timestamp", () => {
  const timestamp = new Date(Date.UTC(2026, 0, 8)).toISOString();
  const app = createApp({ saved: {
    thresholdDays: 2,
    insideThresholdDays: 0,
    racks: { VECCHIO: { takenAt: timestamp }, NUOVO: { takenAt: "not-a-date" } }
  } });
  assert.equal(app.card("VECCHIO").dataset.phase, "outside");
  assert.match(app.status("VECCHIO"), /^FUORI DA 2 GIORNI$/);
  app.action("VECCHIO").click();
  const saved = JSON.parse(app.local.get("stendino-data-v1"));
  assert.equal(saved.racks.VECCHIO.phase, "inside");
  assert.equal(saved.insideThresholdDays, 0);
  assert.equal(app.card("NUOVO").className, "rack-card free");
});

test("both phases count only complete 24-hour periods and refresh periodically", () => {
  const start = Date.UTC(2026, 0, 8, 15);
  const app = createApp({ now: start + DAY - 60_000, saved: {
    thresholdDays: 2,
    insideThresholdDays: 1,
    racks: {
      VECCHIO: { phase: "outside", since: new Date(start).toISOString() },
      NUOVO: { phase: "inside", since: new Date(start).toISOString() }
    }
  } });
  assert.equal(app.status("VECCHIO"), "FUORI DA 0 GIORNI");
  assert.equal(app.action("VECCHIO"), undefined);
  assert.equal(app.status("NUOVO"), "IN CASA DA 0 GIORNI");
  assert.equal(app.action("NUOVO"), undefined);
  assert.equal(app.action("VECCHIO"), undefined);
  app.setNow(start + DAY);
  app.runInterval();
  assert.equal(app.status("VECCHIO"), "FUORI DA 1 GIORNO");
  assert.equal(app.status("NUOVO"), "IN CASA DA 1 GIORNO");
  assert.equal(app.action("NUOVO").textContent, "RITIRA");
  assert.equal(app.action("VECCHIO"), undefined);
  app.setNow(start + 2 * DAY - 60_000);
  app.runInterval();
  assert.equal(app.status("VECCHIO"), "FUORI DA 1 GIORNO");
  assert.equal(app.status("NUOVO"), "IN CASA DA 1 GIORNO");
  assert.equal(app.card("VECCHIO").className, "rack-card occupied");
  app.setNow(start + 2 * DAY);
  app.runInterval();
  assert.equal(app.status("VECCHIO"), "FUORI DA 2 GIORNI");
  assert.equal(app.status("NUOVO"), "IN CASA DA 2 GIORNI");
  assert.equal(app.card("VECCHIO").className, "rack-card ready");
  assert.equal(app.action("VECCHIO").textContent, "RITIRA");
  assert.equal(app.card("NUOVO").className, "rack-card ready");
});

test("outside and inside phases survive reload with their own timestamps", () => {
  const start = Date.UTC(2026, 0, 10, 12);
  const app = createApp({ now: start });
  app.elements.get("threshold-minus").click();
  app.elements.get("threshold-minus").click();
  app.action("VECCHIO").click();
  const outsideState = JSON.parse(app.local.get("stendino-data-v1"));
  const reloadedOutside = createApp({ now: start + 1000, saved: outsideState });
  assert.equal(reloadedOutside.card("VECCHIO").dataset.phase, "outside");
  const oldSince = outsideState.racks.VECCHIO.since;
  reloadedOutside.action("VECCHIO").click();
  const insideState = JSON.parse(reloadedOutside.local.get("stendino-data-v1"));
  assert.notEqual(insideState.racks.VECCHIO.since, oldSince);
  const reloadedInside = createApp({ saved: insideState });
  assert.equal(reloadedInside.card("VECCHIO").dataset.phase, "inside");
  assert.match(reloadedInside.status("VECCHIO"), /^IN CASA DA 0 GIORNI$/);
});

test("the in-house threshold is independent and persists at its zero minimum", () => {
  const app = createApp();
  app.elements.get("threshold-minus").click();
  app.elements.get("threshold-minus").click();
  app.action("VECCHIO").click();
  app.action("VECCHIO").click();
  assert.equal(app.card("VECCHIO").className, "rack-card occupied");
  assert.equal(app.action("VECCHIO"), undefined);
  app.elements.get("inside-threshold-minus").click();
  assert.equal(app.elements.get("inside-threshold-value").textContent, "0");
  assert.equal(app.elements.get("inside-threshold-minus").disabled, true);
  assert.equal(app.card("VECCHIO").className, "rack-card ready");
  app.action("VECCHIO").click();
  assert.equal(app.card("VECCHIO").className, "rack-card free");
  const saved = JSON.parse(app.local.get("stendino-data-v1"));
  assert.equal(saved.thresholdDays, 0);
  assert.equal(saved.insideThresholdDays, 0);
});
