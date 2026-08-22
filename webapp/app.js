// NightOwl webapp — vanilla JS + Supabase.
// Real, working auth + watchlist + ratings persistence, styled to match the
// NightOwl design tokens. This is a small standalone app, not a port of
// NightOwl.dc.html (see ../README.md for why).

(() => {
  const cfg = window.NIGHTOWL_SUPABASE_CONFIG;
  if (!cfg || !cfg.url || !cfg.anonKey || cfg.url.includes("YOUR_")) {
    document.getElementById("app").innerHTML = `
      <div class="card">
        <h1>Supabase not configured</h1>
        <p class="subhead">Edit <code>webapp/config.js</code> with your Supabase Project URL and anon key, then reload.</p>
      </div>`;
    return;
  }

  const sb = window.supabase.createClient(cfg.url, cfg.anonKey);

  const appEl = document.getElementById("app");
  const sessionInfoEl = document.getElementById("session-info");
  const toastRoot = document.getElementById("toast-root");

  let state = {
    session: null,
    authMode: "signin", // 'signin' | 'signup'
    authError: "",
    authBusy: false,
    tab: "to_watch", // 'to_watch' | 'watched'
    items: [],        // watchlist_items rows
    ratings: {},      // watchlist_item_id -> ratings row
    loading: false,
    addForm: { title: "", year: "", poster_url: "" },
    hoverStar: {},     // item_id -> hovered star value while picking rating
  };

  function setState(patch) {
    state = { ...state, ...patch };
    render();
  }

  function showToast(message, isError = false) {
    const el = document.createElement("div");
    el.className = "toast" + (isError ? " error" : "");
    el.textContent = message;
    toastRoot.innerHTML = "";
    toastRoot.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 3200);
  }

  // ── Auth ──────────────────────────────────────────────────────────

  async function handleAuthSubmit(email, password) {
    setState({ authBusy: true, authError: "" });
    const fn = state.authMode === "signup"
      ? sb.auth.signUp({ email, password })
      : sb.auth.signInWithPassword({ email, password });
    const { data, error } = await fn;
    if (error) {
      setState({ authBusy: false, authError: error.message });
      return;
    }
    if (state.authMode === "signup" && !data.session) {
      setState({ authBusy: false, authError: "Check your email to confirm your account, then sign in." });
      return;
    }
    setState({ authBusy: false });
  }

  async function handleSignOut() {
    await sb.auth.signOut();
  }

  // ── Data loading ──────────────────────────────────────────────────

  async function loadAll() {
    setState({ loading: true });
    const [{ data: items, error: itemsErr }, { data: ratings, error: ratingsErr }] = await Promise.all([
      sb.from("watchlist_items").select("*").order("created_at", { ascending: false }),
      sb.from("ratings").select("*"),
    ]);
    if (itemsErr) showToast(itemsErr.message, true);
    if (ratingsErr) showToast(ratingsErr.message, true);
    const ratingsMap = {};
    (ratings || []).forEach((r) => { ratingsMap[r.watchlist_item_id] = r; });
    setState({ loading: false, items: items || [], ratings: ratingsMap });
  }

  // ── Watchlist actions ─────────────────────────────────────────────

  async function addItem(e) {
    e.preventDefault();
    const { title, year, poster_url } = state.addForm;
    if (!title.trim()) return;
    const { error } = await sb.from("watchlist_items").insert({
      title: title.trim(),
      year: year ? parseInt(year, 10) : null,
      poster_url: poster_url.trim() || null,
      status: "to_watch",
    });
    if (error) { showToast(error.message, true); return; }
    setState({ addForm: { title: "", year: "", poster_url: "" } });
    showToast("Added to watchlist");
    loadAll();
  }

  async function markWatched(item) {
    const { error } = await sb.from("watchlist_items").update({ status: "watched" }).eq("id", item.id);
    if (error) { showToast(error.message, true); return; }
    showToast(`Marked "${item.title}" as watched`);
    loadAll();
  }

  async function markToWatch(item) {
    const { error } = await sb.from("watchlist_items").update({ status: "to_watch" }).eq("id", item.id);
    if (error) { showToast(error.message, true); return; }
    loadAll();
  }

  async function removeItem(item) {
    const { error } = await sb.from("watchlist_items").delete().eq("id", item.id);
    if (error) { showToast(error.message, true); return; }
    showToast(`Removed "${item.title}"`);
    loadAll();
  }

  // ── Ratings actions ───────────────────────────────────────────────

  async function saveRating(item, rating, note) {
    const { data: userData } = await sb.auth.getUser();
    const payload = {
      watchlist_item_id: item.id,
      rating,
      note: note ?? state.ratings[item.id]?.note ?? null,
      user_id: userData.user.id,
    };
    const { error } = await sb.from("ratings").upsert(payload, { onConflict: "user_id,watchlist_item_id" });
    if (error) { showToast(error.message, true); return; }
    loadAll();
  }

  let noteTimers = {};
  function onNoteInput(item, value) {
    clearTimeout(noteTimers[item.id]);
    noteTimers[item.id] = setTimeout(() => {
      const existing = state.ratings[item.id];
      saveRating(item, existing?.rating ?? 0, value);
    }, 500);
  }

  // ── Rendering ─────────────────────────────────────────────────────

  function starRow(item) {
    const current = state.ratings[item.id]?.rating ?? 0;
    const hover = state.hoverStar[item.id];
    const display = hover ?? current;
    let html = `<div class="stars" data-item="${item.id}">`;
    for (let i = 1; i <= 5; i++) {
      const filled = display >= i;
      html += `<span class="star ${filled ? "filled" : ""}" data-value="${i}">★</span>`;
    }
    html += `</div>`;
    return html;
  }

  function itemRow(item) {
    const poster = item.poster_url
      ? `style="background-image:url('${item.poster_url.replace(/'/g, "%27")}')"`
      : "";
    const rating = state.ratings[item.id];
    const isWatched = item.status === "watched";
    return `
      <div class="item-row" data-row-id="${item.id}">
        <div class="item-poster" ${poster}></div>
        <div class="item-body">
          <p class="item-title">${escapeHtml(item.title)}</p>
          <p class="item-meta">${item.year ?? ""}</p>
          ${isWatched ? `
            <div class="rating-block">
              ${starRow(item)}
              <textarea class="rating-note" placeholder="Notes (optional)" data-note-for="${item.id}">${escapeHtml(rating?.note ?? "")}</textarea>
            </div>
          ` : ""}
        </div>
        <div class="item-actions">
          ${isWatched
            ? `<button class="btn-ghost" data-action="to-watch" data-id="${item.id}">Move to watchlist</button>`
            : `<button class="btn-primary" data-action="watched" data-id="${item.id}">Mark watched</button>`}
          <button class="btn-danger" data-action="remove" data-id="${item.id}">Remove</button>
        </div>
      </div>`;
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderAuth() {
    const isSignup = state.authMode === "signup";
    appEl.innerHTML = `
      <div class="card auth-card">
        <h1>${isSignup ? "Create your account" : "Welcome back"}</h1>
        <p class="subhead">Sign in to save your watchlist and ratings.</p>
        <div class="auth-tabs">
          <button class="auth-tab ${!isSignup ? "active" : ""}" data-mode="signin">Sign in</button>
          <button class="auth-tab ${isSignup ? "active" : ""}" data-mode="signup">Sign up</button>
        </div>
        <form id="auth-form">
          <label>Email</label>
          <input type="email" name="email" required autocomplete="email" />
          <label>Password</label>
          <input type="password" name="password" required autocomplete="${isSignup ? "new-password" : "current-password"}" minlength="6" />
          <div style="margin-top:20px;">
            <button type="submit" class="btn-primary" ${state.authBusy ? "disabled" : ""}>
              ${state.authBusy ? "Please wait…" : (isSignup ? "Sign up" : "Sign in")}
            </button>
          </div>
        </form>
        ${state.authError ? `<p class="error-msg">${escapeHtml(state.authError)}</p>` : ""}
      </div>`;

    appEl.querySelectorAll(".auth-tab").forEach((btn) => {
      btn.addEventListener("click", () => setState({ authMode: btn.dataset.mode, authError: "" }));
    });
    const form = document.getElementById("auth-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      const password = form.password.value;
      handleAuthSubmit(email, password);
    });
  }

  function renderApp() {
    const filtered = state.items.filter((i) => i.status === state.tab);
    appEl.innerHTML = `
      <h1>Your watchlist</h1>
      <p class="subhead">Search a movie, save it, rate it after watching.</p>

      <form class="add-form" id="add-form">
        <div class="field">
          <label>Title</label>
          <input type="text" name="title" placeholder="e.g. Paris, Texas" value="${escapeHtml(state.addForm.title)}" required />
        </div>
        <div class="field" style="max-width:110px;">
          <label>Year</label>
          <input type="number" name="year" placeholder="1984" value="${escapeHtml(state.addForm.year)}" />
        </div>
        <div class="field">
          <label>Poster URL (optional)</label>
          <input type="text" name="poster_url" placeholder="https://…" value="${escapeHtml(state.addForm.poster_url)}" />
        </div>
        <button type="submit" class="btn-primary">Add</button>
      </form>

      <div class="tabs-nav">
        <button data-tab="to_watch" class="${state.tab === "to_watch" ? "active" : ""}">To watch</button>
        <button data-tab="watched" class="${state.tab === "watched" ? "active" : ""}">Watched</button>
      </div>

      <div class="item-list">
        ${state.loading ? `<p class="hint-msg">Loading…</p>` : ""}
        ${!state.loading && filtered.length === 0 ? `<div class="empty-state">Nothing here yet.</div>` : ""}
        ${filtered.map(itemRow).join("")}
      </div>
    `;

    const addForm = document.getElementById("add-form");
    addForm.addEventListener("submit", addItem);
    addForm.title.addEventListener("input", (e) => { state.addForm.title = e.target.value; });
    addForm.year.addEventListener("input", (e) => { state.addForm.year = e.target.value; });
    addForm.poster_url.addEventListener("input", (e) => { state.addForm.poster_url = e.target.value; });

    appEl.querySelectorAll(".tabs-nav button").forEach((btn) => {
      btn.addEventListener("click", () => setState({ tab: btn.dataset.tab }));
    });

    appEl.querySelectorAll("[data-action]").forEach((btn) => {
      const id = btn.dataset.id;
      const item = state.items.find((i) => i.id === id);
      if (!item) return;
      btn.addEventListener("click", () => {
        if (btn.dataset.action === "watched") markWatched(item);
        if (btn.dataset.action === "to-watch") markToWatch(item);
        if (btn.dataset.action === "remove") {
          if (confirm(`Remove "${item.title}" from your watchlist?`)) removeItem(item);
        }
      });
    });

    appEl.querySelectorAll(".stars").forEach((starsEl) => {
      const itemId = starsEl.dataset.item;
      const item = state.items.find((i) => i.id === itemId);
      starsEl.querySelectorAll(".star").forEach((starEl) => {
        const value = Number(starEl.dataset.value);
        starEl.addEventListener("mouseenter", () => {
          setState({ hoverStar: { ...state.hoverStar, [itemId]: value } });
        });
        starEl.addEventListener("mouseleave", () => {
          const hs = { ...state.hoverStar };
          delete hs[itemId];
          setState({ hoverStar: hs });
        });
        starEl.addEventListener("click", () => saveRating(item, value));
      });
    });

    appEl.querySelectorAll("[data-note-for]").forEach((textarea) => {
      const itemId = textarea.dataset.noteFor;
      const item = state.items.find((i) => i.id === itemId);
      textarea.addEventListener("input", (e) => onNoteInput(item, e.target.value));
    });
  }

  function renderSessionInfo() {
    if (!state.session) { sessionInfoEl.innerHTML = ""; return; }
    sessionInfoEl.innerHTML = `
      <span>${escapeHtml(state.session.user.email)}</span>
      <button class="btn-ghost" id="signout-btn">Sign out</button>`;
    document.getElementById("signout-btn").addEventListener("click", handleSignOut);
  }

  function render() {
    renderSessionInfo();
    if (!state.session) {
      renderAuth();
    } else {
      renderApp();
    }
  }

  // ── Boot ──────────────────────────────────────────────────────────

  sb.auth.getSession().then(({ data }) => {
    setState({ session: data.session });
    if (data.session) loadAll();
  });

  sb.auth.onAuthStateChange((_event, session) => {
    const hadSession = !!state.session;
    state.session = session;
    if (session && !hadSession) loadAll();
    if (!session) { state.items = []; state.ratings = {}; }
    render();
  });

  render();
})();
