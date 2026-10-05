const STORAGE_KEY = "heightmax-state-v1";

const defaultState = () => ({
  preferences: { ageGroup: "adult", experience: "new", minutes: 10 },
  days: {},
  sleep: [],
  measurements: [],
});

const exercises = [
  {
    id: "breathing",
    name: "Easy standing reset",
    detail: "Stand comfortably. Let your shoulders soften; take 4 slow breaths.",
    dose: "1 min",
    icon: '<path d="M4 18c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6-1.2"/><path d="M4 12c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6-1.2"/><path d="M4 6c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6-1.2"/>',
  },
  {
    id: "wall-slides",
    name: "Wall slides",
    detail: "If comfortable, slide your arms up a wall without forcing the range.",
    dose: "6 slow reps",
    icon: '<path d="M7 4v16"/><path d="M7 7h8a3 3 0 0 1 3 3v2"/><path d="M7 13h8a3 3 0 0 1 3 3v1"/><path d="M11 4h8"/>',
  },
  {
    id: "chin-nods",
    name: "Gentle chin nods",
    detail: "Look ahead, softly nod as if saying yes. Keep it small and pain-free.",
    dose: "5 easy reps",
    icon: '<circle cx="12" cy="9" r="4"/><path d="M7 13c1 2 3 3 5 3s4-1 5-3"/><path d="M8 20c1.2-1.5 2.5-2 4-2s2.8.5 4 2"/>',
  },
  {
    id: "seated-reach",
    name: "Seated side reach",
    detail: "Sit tall and reach gently to each side. Stop if anything hurts.",
    dose: "3 each side",
    icon: '<path d="M9 20v-7a3 3 0 0 1 3-3h2"/><path d="M12 10V5a2 2 0 0 1 4 0v4"/><path d="M9 15H5v5"/><path d="M16 13h4v7"/>',
  },
];

let state = defaultState();
let toastTimer;

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("Saved state is invalid.");
    state = {
      ...defaultState(),
      ...parsed,
      preferences: { ...defaultState().preferences, ...(parsed.preferences || {}) },
      days: parsed.days && typeof parsed.days === "object" ? parsed.days : {},
      sleep: Array.isArray(parsed.sleep) ? parsed.sleep : [],
      measurements: Array.isArray(parsed.measurements) ? parsed.measurements : [],
    };
  } catch (error) {
    console.error("Could not load saved HeightMax data:", error);
    document.getElementById("storage-alert").hidden = false;
  }
}

function saveState(message = "Saved on this device.") {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    document.querySelector(".save-status").innerHTML = '<span class="save-dot"></span> Saved on this device';
    document.getElementById("storage-alert").hidden = true;
    if (message) showToast(message);
    return true;
  } catch (error) {
    console.error("Could not save HeightMax data:", error);
    document.getElementById("storage-alert").hidden = false;
    document.querySelector(".save-status").textContent = "Could not save";
    showToast("Your browser couldn't save this change. Check browser storage and try again.");
    return false;
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
}

function formatDate(dateString, options = { month: "short", day: "numeric" }) {
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function getStreak() {
  let count = 0;
  const date = new Date();
  if (!state.days[todayKey()]?.completed?.length) date.setDate(date.getDate() - 1);
  while (true) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (!state.days[key]?.completed?.length) break;
    count += 1;
    date.setDate(date.getDate() - 1);
  }
  return count;
}

function routineItems() {
  const count = Number(state.preferences.minutes) <= 5 ? 2 : Number(state.preferences.minutes) >= 15 ? 4 : 3;
  return exercises.slice(0, count);
}

function experienceDose(exercise) {
  if (state.preferences.experience === "new" || Number(state.preferences.minutes) <= 5) {
    return exercise.dose;
  }
  return `${exercise.dose} · optional second round`;
}

function renderRoutine() {
  const date = todayKey();
  const daily = state.days[date] || { completed: [], feeling: "" };
  const items = routineItems();
  const completed = Array.isArray(daily.completed) ? daily.completed : [];
  document.getElementById("routine-minutes").textContent = state.preferences.minutes;
  const experienceCopy = {
    new: "A beginner-friendly practice",
    some: "A steady practice",
    regular: "A regular practice",
  }[state.preferences.experience] || "A gentle practice";
  document.getElementById("routine-subtitle").textContent =
    state.preferences.ageGroup === "under18"
      ? `${experienceCopy}. Ask a trusted adult if you have growth or exercise concerns.`
      : `${experienceCopy} to help you feel more at ease.`;
  document.getElementById("routine-list").innerHTML = items.map((exercise) => {
    const done = completed.includes(exercise.id);
    return `<div class="exercise-row${done ? " completed" : ""}" data-exercise="${exercise.id}" role="checkbox" aria-checked="${done}" tabindex="0">
      <span class="exercise-check" aria-hidden="true">✓</span>
      <span class="exercise-illustration" aria-hidden="true"><svg viewBox="0 0 24 24">${exercise.icon}</svg></span>
      <span><span class="exercise-name">${exercise.name}</span><span class="exercise-detail">${exercise.detail}</span></span>
      <span class="exercise-dose">${experienceDose(exercise)}</span>
    </div>`;
  }).join("");
  document.getElementById("routine-progress-label").textContent = `${completed.filter((id) => items.some((item) => item.id === id)).length} of ${items.length} complete`;
  const doneCount = completed.filter((id) => items.some((item) => item.id === id)).length;
  document.getElementById("routine-progress").style.width = `${items.length ? doneCount / items.length * 100 : 0}%`;
  document.getElementById("streak-count").textContent = getStreak();
  document.querySelectorAll("[data-feeling]").forEach((button) => {
    button.setAttribute("aria-pressed", String(daily.feeling === button.dataset.feeling));
  });
  document.getElementById("today-date").textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long", month: "long", day: "numeric",
  }).format(new Date()).toUpperCase();
}

function renderEntries(containerId, entries, kind) {
  const container = document.getElementById(containerId);
  if (!entries.length) {
    container.innerHTML = `<div class="entry-empty">No ${kind === "sleep" ? "sleep logs" : "measurements"} yet. Your entries will appear here.</div>`;
    return;
  }
  container.innerHTML = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .map((entry) => {
      const date = escapeHtml(formatDate(entry.date, { year: "numeric", month: "short", day: "numeric" }));
      const id = escapeHtml(entry.id);
      const value = escapeHtml(kind === "sleep" ? `${entry.hours} hrs` : `${entry.cm} cm`);
      return `<div class="entry-row">
        <span class="entry-date">${date}</span>
        <span class="entry-value">${value}</span>
        <button class="delete-entry" type="button" data-delete-kind="${kind}" data-delete-id="${id}" aria-label="Delete ${kind} entry from ${date}">×</button>
      </div>`;
    }).join("");
}

function renderProgress() {
  const completedDays = Object.values(state.days).filter((day) => Array.isArray(day.completed) && day.completed.length > 0).length;
  document.getElementById("total-practice").textContent = completedDays;
  document.getElementById("total-sleep").textContent = state.sleep.length;
  document.getElementById("total-measurements").textContent = state.measurements.length;
  renderEntries("measurement-list", state.measurements, "measurement");
  renderEntries("sleep-list", state.sleep, "sleep");
  document.getElementById("measurement-date").value ||= todayKey();
}

function renderPreferences() {
  document.getElementById("age-group").value = state.preferences.ageGroup;
  document.getElementById("experience").value = state.preferences.experience;
  document.getElementById("available-minutes").value = String(state.preferences.minutes);
}

function renderAll() {
  renderRoutine();
  renderProgress();
  renderPreferences();
}

function navigate(page) {
  if (!["today", "progress", "preferences"].includes(page)) page = "today";
  document.querySelectorAll(".page").forEach((section) => {
    const active = section.id === `page-${page}`;
    section.hidden = !active;
    section.classList.toggle("active", active);
  });
  document.querySelectorAll("[data-page-link]").forEach((link) => {
    const active = link.dataset.pageLink === page;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.getElementById("current-section").textContent = page.toUpperCase();
  if (page === "progress") renderProgress();
  if (page === "preferences") renderPreferences();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleExercise(id) {
  const date = todayKey();
  const daily = state.days[date] || { completed: [], feeling: "" };
  const current = Array.isArray(daily.completed) ? daily.completed : [];
  const previous = [...current];
  daily.completed = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  state.days[date] = daily;
  if (saveState("")) {
    renderRoutine();
    renderProgress();
    if (daily.completed.includes(id)) showToast("Practice checked off. Nice work.");
  } else {
    daily.completed = previous;
  }
}

function deleteEntry(kind, id) {
  const key = kind === "sleep" ? "sleep" : "measurements";
  const item = state[key].find((entry) => entry.id === id);
  if (!item) return;
  state[key] = state[key].filter((entry) => entry.id !== id);
  if (saveState(kind === "sleep" ? "Sleep entry deleted." : "Measurement deleted.")) renderProgress();
  else state[key].push(item);
}

document.addEventListener("click", (event) => {
  const pageLink = event.target.closest("[data-page-link]");
  if (pageLink) {
    event.preventDefault();
    navigate(pageLink.dataset.pageLink);
    return;
  }
  const goto = event.target.closest("[data-goto]");
  if (goto) {
    navigate(goto.dataset.goto);
    return;
  }
  const exerciseRow = event.target.closest("[data-exercise]");
  if (exerciseRow) toggleExercise(exerciseRow.dataset.exercise);
  const feelingButton = event.target.closest("[data-feeling]");
  if (feelingButton) {
    const daily = state.days[todayKey()] || { completed: [], feeling: "" };
    const previousFeeling = daily.feeling;
    daily.feeling = feelingButton.dataset.feeling;
    state.days[todayKey()] = daily;
    if (saveState("Check-in saved.")) renderRoutine();
    else daily.feeling = previousFeeling;
  }
  const deleteButton = event.target.closest("[data-delete-kind]");
  if (deleteButton) deleteEntry(deleteButton.dataset.deleteKind, deleteButton.dataset.deleteId);
});

document.addEventListener("keydown", (event) => {
  const row = event.target.closest?.("[data-exercise]");
  if (row && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    toggleExercise(row.dataset.exercise);
  }
});

document.getElementById("sleep-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("sleep-hours");
  const hours = Number(input.value);
  if (!Number.isFinite(hours) || hours < 0.5 || hours > 24) {
    input.setCustomValidity("Enter a sleep duration between 0.5 and 24 hours.");
    input.reportValidity();
    return;
  }
  input.setCustomValidity("");
  state.sleep.push({ id: crypto.randomUUID(), date: todayKey(), hours: Number(hours.toFixed(1)) });
  if (saveState("Sleep logged.")) {
    input.value = "";
    renderProgress();
  } else state.sleep.pop();
});

document.getElementById("measurement-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("height-value");
  const cm = Number(input.value);
  const date = document.getElementById("measurement-date").value;
  if (!Number.isFinite(cm) || cm < 30 || cm > 250 || !date) {
    showToast("Enter a height from 30 to 250 cm and choose a date.");
    return;
  }
  const entry = { id: crypto.randomUUID(), date, cm: Number(cm.toFixed(1)) };
  state.measurements.push(entry);
  if (saveState("Measurement saved.")) {
    input.value = "";
    renderProgress();
  } else state.measurements = state.measurements.filter((item) => item.id !== entry.id);
});

document.getElementById("preferences-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const previous = state.preferences;
  state.preferences = {
    ageGroup: document.getElementById("age-group").value,
    experience: document.getElementById("experience").value,
    minutes: Number(document.getElementById("available-minutes").value),
  };
  if (saveState("Your plan has been updated.")) {
    renderRoutine();
    navigate("today");
  } else {
    state.preferences = previous;
    renderPreferences();
  }
});

window.addEventListener("hashchange", () => navigate(location.hash.slice(1) || "today"));

loadState();
renderAll();
document.getElementById("measurement-date").value ||= todayKey();
navigate(location.hash.slice(1) || "today");
