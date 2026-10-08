(() => {
  "use strict";

  const STORAGE_KEY = "stendino-data-v1";
  const DEFAULT_STATE = {
    thresholdDays: 2,
    insideThresholdDays: 1,
    racks: {
      VECCHIO: { phase: null, since: null },
      NUOVO: { phase: null, since: null }
    }
  };
  const home = document.getElementById("home");
  const settings = document.getElementById("settings");
  const rackList = document.getElementById("rack-list");
  const thresholdValue = document.getElementById("threshold-value");
  const insideThresholdValue = document.getElementById("inside-threshold-value");
  let state = loadState();

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || typeof parsed !== "object") return freshDefaultState();
      const threshold = Number.isInteger(parsed.thresholdDays) && parsed.thresholdDays >= 0
        ? Math.min(parsed.thresholdDays, 3650) : DEFAULT_STATE.thresholdDays;
      const insideThreshold = Number.isInteger(parsed.insideThresholdDays) && parsed.insideThresholdDays >= 0
        ? Math.min(parsed.insideThresholdDays, 3650) : DEFAULT_STATE.insideThresholdDays;
      const racks = {};
      for (const name of Object.keys(DEFAULT_STATE.racks)) {
        const savedRack = parsed.racks && parsed.racks[name] && typeof parsed.racks[name] === "object"
          ? parsed.racks[name] : {};
        // Compatibilità: i dati della prima versione usavano takenAt per lo stendino fuori.
        const legacyDate = validDate(savedRack.takenAt);
        const phase = savedRack.phase === "inside" || savedRack.phase === "outside"
          ? savedRack.phase : legacyDate ? "outside" : null;
        const since = phase === "inside"
          ? validDate(savedRack.since) || validDate(savedRack.insideSince) || null
          : phase === "outside"
            ? validDate(savedRack.since) || validDate(savedRack.outsideSince) || legacyDate
            : null;
        racks[name] = phase && since ? { phase, since } : { phase: null, since: null };
      }
      return { thresholdDays: threshold, insideThresholdDays: insideThreshold, racks };
    } catch {
      return freshDefaultState();
    }
  }

  function validDate(value) {
    return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
  }

  function freshDefaultState() {
    return {
      thresholdDays: DEFAULT_STATE.thresholdDays,
      insideThresholdDays: DEFAULT_STATE.insideThresholdDays,
      racks: { VECCHIO: { phase: null, since: null }, NUOVO: { phase: null, since: null } }
    };
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
      const rack = state.racks[name];
      const isFree = !rack.phase;
      const days = isFree ? null : elapsedDays(rack.since, now);
      const threshold = rack.phase === "inside" ? state.insideThresholdDays : state.thresholdDays;
      const isReady = !isFree && days >= threshold;
      const statusClass = isFree ? "free" : isReady ? "ready" : "occupied";
      const statusText = isFree ? "LIBERO" : `${rack.phase === "inside" ? "IN CASA" : "FUORI"} DA ${days} ${days === 1 ? "GIORNO" : "GIORNI"}`;
      const card = document.createElement("article");
      card.className = `rack-card ${statusClass}`;
      card.dataset.phase = rack.phase || "free";
      if (!isFree) card.append(createIllustration(rack.phase));
      const title = document.createElement("h2");
      title.className = "rack-name";
      title.textContent = name;
      const status = document.createElement("p");
      status.className = "rack-status";
      status.textContent = statusText;
      card.append(title, status);
      if (isFree || isReady) {
        const action = document.createElement("button");
        action.className = "action-button";
        action.type = "button";
        action.textContent = isFree ? "OCCUPA" : "RITIRA";
        action.setAttribute("aria-label", `${action.textContent} ${name}`);
        action.addEventListener("click", () => {
          if (!rack.phase) {
            state.racks[name] = { phase: "outside", since: new Date().toISOString() };
          } else if (rack.phase === "outside") {
            state.racks[name] = { phase: "inside", since: new Date().toISOString() };
          } else if (isReady) {
            state.racks[name] = { phase: null, since: null };
          }
          saveState();
          render();
        });
        card.append(action);
      }
      rackList.append(card);
    }
    thresholdValue.textContent = String(state.thresholdDays);
    document.getElementById("threshold-minus").disabled = state.thresholdDays <= 0;
    insideThresholdValue.textContent = String(state.insideThresholdDays);
    document.getElementById("inside-threshold-minus").disabled = state.insideThresholdDays <= 0;
  }

  function createIllustration(phase) {
    const illustration = document.createElement("span");
    illustration.className = "rack-illustration";
    illustration.setAttribute("aria-hidden", "true");
    illustration.innerHTML = phase === "inside"
      ? '<svg viewBox="0 0 160 160" focusable="false"><path d="M27 74 80 30l53 44v62H27V74Z"/><path d="M64 136V91h32v45M45 78h70"/></svg>'
      : '<svg viewBox="0 0 160 160" focusable="false"><circle cx="80" cy="80" r="29"/><path d="M80 20v18m0 84v18M20 80h18m84 0h18M37.6 37.6l12.7 12.7m59.4 59.4 12.7 12.7m0-84.8-12.7 12.7m-59.4 59.4-12.7 12.7"/></svg>';
    return illustration;
  }

  function showSettings(show) {
    home.hidden = show;
    settings.hidden = !show;
    if (!show) render();
  }

  document.getElementById("settings-open").addEventListener("click", () => showSettings(true));
  document.getElementById("settings-back").addEventListener("click", () => showSettings(false));
  document.getElementById("threshold-minus").addEventListener("click", () => {
    state.thresholdDays = Math.max(0, state.thresholdDays - 1);
    saveState(); render();
  });
  document.getElementById("threshold-plus").addEventListener("click", () => {
    state.thresholdDays = Math.min(3650, state.thresholdDays + 1);
    saveState(); render();
  });
  document.getElementById("inside-threshold-minus").addEventListener("click", () => {
    state.insideThresholdDays = Math.max(0, state.insideThresholdDays - 1);
    saveState(); render();
  });
  document.getElementById("inside-threshold-plus").addEventListener("click", () => {
    state.insideThresholdDays = Math.min(3650, state.insideThresholdDays + 1);
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
