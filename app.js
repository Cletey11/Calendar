(() => {
  "use strict";
  const grid = document.getElementById("calendarGrid");
  const monthTitle = document.getElementById("monthTitle");
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalDate = document.getElementById("modalDate");
  const memoryText = document.getElementById("memoryText");
  const charCount = document.getElementById("charCount");
  const modalStatus = document.getElementById("modalStatus");
  const deleteButton = document.getElementById("deleteMemory");
  const dayMemories = document.getElementById("dayMemories");
  const toast = document.getElementById("toast");
  const accessBackdrop = document.getElementById("accessBackdrop");
  const accessCodeInput = document.getElementById("accessCode");
  const accessStatus = document.getElementById("accessStatus");
  const authorButtons = [...document.querySelectorAll(".author-choice")];

  let view = new Date(); view.setDate(1);
  let selectedDate = null;
  let editingId = null;
  let selectedAuthor = localStorage.getItem("calendar-author") || "caleb";
  let memories = [];
  let accessCode = sessionStorage.getItem("our-calendar-code") || localStorage.getItem("our-calendar-code") || "";

  const pad = n => String(n).padStart(2, "0");
  const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const toKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const prettyDate = key => new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday:"long", month:"long", day:"numeric", year:"numeric" });
  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

  function showToast(msg) { toast.textContent = msg; toast.classList.remove("hidden"); setTimeout(() => toast.classList.add("hidden"), 2200); }
  function setAuthor(author) { selectedAuthor = author; localStorage.setItem("calendar-author", author); authorButtons.forEach(b => b.classList.toggle("selected", b.dataset.author === author)); }
  authorButtons.forEach(b => b.addEventListener("click", () => setAuthor(b.dataset.author)));

  async function api(path = "", options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (accessCode) headers["X-Calendar-Code"] = accessCode;
    const res = await fetch(`/.netlify/functions/memories${path}`, { ...options, headers });
    let body = null; try { body = await res.json(); } catch {}
    if (!res.ok) { const err = new Error(body?.error || `Request failed (${res.status})`); err.status = res.status; throw err; }
    return body;
  }

  async function loadMemories() {
    try {
      const body = await api();
      memories = body.memories || [];
      accessBackdrop.classList.add("hidden");
      render();
    } catch (err) {
      if (err.status === 401) {
        accessBackdrop.classList.remove("hidden");
        accessCodeInput.focus();
        return;
      }
      console.error(err); render(); showToast("Couldn't reach the calendar right now.");
    }
  }

  function render() {
    const y = view.getFullYear(), m = view.getMonth();
    monthTitle.textContent = view.toLocaleString(undefined, { month:"long", year:"numeric" });
    grid.innerHTML = "";
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    for (let i = 0; i < first; i++) { const empty = document.createElement("div"); empty.className = "day empty"; grid.appendChild(empty); }
    const todayKey = toKey(new Date());
    for (let d = 1; d <= days; d++) {
      const key = dateKey(y, m, d);
      const dayEntries = memories.filter(x => x.memory_date === key);
      const button = document.createElement("button"); button.type = "button"; button.className = "day";
      if (key === todayKey) button.classList.add("today");
      const previews = dayEntries.slice(0, 3).map(mem => `<div class="memory-preview ${mem.author}"><b>${mem.author === "caleb" ? "C" : "C"}:</b> ${escapeHtml(mem.text)}</div>`).join("");
      const more = dayEntries.length > 3 ? `<div class="more">+ ${dayEntries.length - 3} more</div>` : "";
      button.innerHTML = `<div class="day-number">${d}${dayEntries.length ? `<span class="dot-count">♥</span>` : ""}</div><div class="memory-list">${previews}${more}</div>`;
      button.addEventListener("click", () => openModal(key)); grid.appendChild(button);
    }
  }

  function renderDayMemories() {
    const entries = memories.filter(m => m.memory_date === selectedDate);
    if (!entries.length) { dayMemories.innerHTML = `<div class="empty-memory">No memories yet. Add the first one. 💕</div>`; return; }
    dayMemories.innerHTML = entries.map(mem => `<div class="saved-memory ${mem.author}"><div><strong>${mem.author === "caleb" ? "Caleb" : "Cassie"}</strong><p>${escapeHtml(mem.text)}</p></div><button type="button" class="edit-memory" data-id="${mem.id}">Edit</button></div>`).join("");
    dayMemories.querySelectorAll(".edit-memory").forEach(btn => btn.addEventListener("click", () => startEditing(btn.dataset.id)));
  }

  function openModal(key) {
    selectedDate = key; editingId = null; modalDate.textContent = prettyDate(key); document.getElementById("modalTitle").textContent = "Add a memory"; memoryText.value = ""; modalStatus.textContent = ""; deleteButton.classList.add("hidden"); setAuthor(selectedAuthor); renderDayMemories(); updateCount(); modalBackdrop.classList.remove("hidden"); setTimeout(() => memoryText.focus(), 50);
  }
  function startEditing(id) {
    const mem = memories.find(m => String(m.id) === String(id)); if (!mem) return;
    editingId = mem.id; setAuthor(mem.author); memoryText.value = mem.text; document.getElementById("modalTitle").textContent = "Edit this memory"; deleteButton.classList.remove("hidden"); modalStatus.textContent = ""; updateCount(); memoryText.focus();
  }
  function closeModal() { modalBackdrop.classList.add("hidden"); selectedDate = null; editingId = null; }
  function updateCount() { charCount.textContent = memoryText.value.length; }
  memoryText.addEventListener("input", updateCount);
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("cancelModal").addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", e => { if (e.target === modalBackdrop) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !modalBackdrop.classList.contains("hidden")) closeModal(); });

  async function saveMemory() {
    const text = memoryText.value.trim(); if (!text || !selectedDate) { modalStatus.textContent = "Write a little something first ❤️"; return; }
    const button = document.getElementById("saveMemory"); button.disabled = true;
    try {
      if (editingId) await api(`/${encodeURIComponent(editingId)}`, { method:"PUT", body: JSON.stringify({ memory_date:selectedDate, author:selectedAuthor, text }) });
      else await api("", { method:"POST", body: JSON.stringify({ memory_date:selectedDate, author:selectedAuthor, text }) });
      await loadMemories(); renderDayMemories(); showToast("Memory saved ❤️");
      if (!editingId) { memoryText.value = ""; updateCount(); }
      editingId = null; document.getElementById("modalTitle").textContent = "Add another memory"; deleteButton.classList.add("hidden");
    } catch (err) { modalStatus.textContent = err.message; }
    finally { button.disabled = false; }
  }
  document.getElementById("saveMemory").addEventListener("click", saveMemory);

  async function deleteMemory() {
    if (!editingId || !confirm("Delete this memory?")) return;
    try { await api(`/${encodeURIComponent(editingId)}`, { method:"DELETE" }); await loadMemories(); editingId = null; memoryText.value = ""; updateCount(); deleteButton.classList.add("hidden"); document.getElementById("modalTitle").textContent = "Add a memory"; renderDayMemories(); showToast("Memory deleted."); }
    catch (err) { modalStatus.textContent = err.message; }
  }
  deleteButton.addEventListener("click", deleteMemory);

  document.getElementById("prevMonth").addEventListener("click", () => { view.setMonth(view.getMonth() - 1); render(); });
  document.getElementById("nextMonth").addEventListener("click", () => { view.setMonth(view.getMonth() + 1); render(); });
  document.getElementById("todayButton").addEventListener("click", () => { view = new Date(); view.setDate(1); render(); });

  document.getElementById("unlockButton").addEventListener("click", async () => {
    const code = accessCodeInput.value.trim(); if (!code) { accessStatus.textContent = "Enter your shared code."; return; }
    accessCode = code; accessStatus.textContent = "Checking...";
    try { const body = await api(); localStorage.setItem("our-calendar-code", code); sessionStorage.setItem("our-calendar-code", code); memories = body.memories || []; accessBackdrop.classList.add("hidden"); accessStatus.textContent = ""; render(); }
    catch (err) { accessStatus.textContent = err.status === 401 ? "That code isn't right. Try again." : err.message; }
  });
  accessCodeInput.addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("unlockButton").click(); });

  setAuthor(selectedAuthor); loadMemories();
})();
