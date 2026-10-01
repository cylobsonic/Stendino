(() => {
  "use strict";

  const STORAGE_KEY = "stendino-data-v1";
  const DEFAULT_STATE = {
    thresholdDays: 2,
    racks: {
      VECCHIO: { takenAt: null },
      NUOVO: { takenAt: null }
    }
  };
  const home = document.getElementById("home");
  const settings = document.getElementById("settings");
  const rackList = document.getElementById("rack-list");
  const thresholdValue = document.getElementById("threshold-value");
  let state = loadState();

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || typeof parsed !== "object") return freshDefaultState();
      const threshold = Number.isInteger(parsed.thresholdDays) && parsed.thresholdDays >= 1
        ? Math.min(parsed.thresholdDays, 3650) : DEFAULT_STATE.thresholdDays;
      const racks = {};
      for (const name of Object.keys(DEFAULT_STATE.racks)) {
        const value = parsed.racks && parsed.racks[name] ? parsed.racks[name].takenAt : null;
        const date = typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
        racks[name] = { takenAt: date };
      }
      return { thresholdDays: threshold, racks };
    } catch {
      return freshDefaultState();
    }
  }

  function freshDefaultState() {
    return { thresholdDays: DEFAULT_STATE.thresholdDays, racks: { VECCHIO: { takenAt: null }, NUOVO: { takenAt: null } } };
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { /* L'app resta utilizzabile anche se lo spazio locale non è disponibile. */ }
  }

  function elapsedDays(takenAt, now = Date.now()) {
    const elapsed = now - Date.parse(takenAt);
    return Math.max(0, Math.floor(elapsed / 86_400_000));
  }

  function render() {
    const now = Date.now();
    rackList.replaceChildren();
    for (const name of Object.keys(DEFAULT_STATE.racks)) {
      const takenAt = state.racks[name].takenAt;
      const days = takenAt ? elapsedDays(takenAt, now) : null;
      const statusClass = !takenAt ? "free" : days >= state.thresholdDays ? "ready" : "occupied";
      const statusText = !takenAt ? "LIBERO" : `FUORI DA ${days} ${days === 1 ? "GIORNO" : "GIORNI"}`;
      const card = document.createElement("article");
      card.className = `rack-card ${statusClass}`;
      const title = document.createElement("h2");
      title.className = "rack-name";
      title.textContent = name;
      const status = document.createElement("p");
      status.className = "rack-status";
      status.textContent = statusText;
      const action = document.createElement("button");
      action.className = "action-button";
      action.type = "button";
      action.textContent = takenAt ? "RITIRA" : "OCCUPA";
      action.setAttribute("aria-label", `${action.textContent} ${name}`);
      action.addEventListener("click", () => {
        state.racks[name].takenAt = takenAt ? null : new Date().toISOString();
        saveState();
        render();
      });
      card.append(title, status, action);
      rackList.append(card);
    }
    thresholdValue.textContent = String(state.thresholdDays);
    document.getElementById("threshold-minus").disabled = state.thresholdDays <= 1;
  }

  function showSettings(show) {
    home.hidden = show;
    settings.hidden = !show;
    if (!show) render();
  }

  document.getElementById("settings-open").addEventListener("click", () => showSettings(true));
  document.getElementById("settings-back").addEventListener("click", () => showSettings(false));
  document.getElementById("threshold-minus").addEventListener("click", () => {
    state.thresholdDays = Math.max(1, state.thresholdDays - 1);
    saveState(); render();
  });
  document.getElementById("threshold-plus").addEventListener("click", () => {
    state.thresholdDays = Math.min(3650, state.thresholdDays + 1);
    saveState(); render();
  });
  window.addEventListener("pageshow", render);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
  window.setInterval(render, 60_000);
  render();

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }
})();
