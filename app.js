(function () {
  "use strict";

  const ICONS = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"></path><path d="M5.5 10.5V20h13v-9.5"></path><path d="M9.5 20v-6h5v6"></path></svg>',
    topic: '<svg viewBox="0 0 24 24"><path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 1 5 16V4.5Z"></path><path d="M8.5 4.5v15"></path><path d="M11 8h5"></path><path d="M11 12h5"></path></svg>',
    target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="4"></circle><path d="M12 2v3"></path><path d="M22 12h-3"></path><path d="M12 22v-3"></path><path d="M2 12h3"></path></svg>',
    files: '<svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7z"></path><path d="M15 3v5h5"></path><path d="M4 7v14h13"></path></svg>',
    puzzle: '<svg viewBox="0 0 24 24"><path d="M8 3h4v4a2 2 0 1 0 4 0V3h5v6h-4a2 2 0 1 0 0 4h4v8h-6v-4a2 2 0 1 0-4 0v4H3v-5h4a2 2 0 1 0 0-4H3V3h5z"></path></svg>',
    rc: '<svg viewBox="0 0 24 24"><path d="M4 5.5h7a3 3 0 0 1 3 3V20a3 3 0 0 0-3-3H4z"></path><path d="M20 5.5h-6a3 3 0 0 0-3 3V20a3 3 0 0 1 3-3h6z"></path></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v6l4 2"></path></svg>',
    flag: '<svg viewBox="0 0 24 24"><path d="M5 21V4"></path><path d="M5 4h12l-2 4 2 4H5"></path></svg>',
    folder: '<svg viewBox="0 0 24 24"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z"></path></svg>',
    test: '<svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7z"></path><path d="M15 3v5h4"></path><path d="M9 12h6"></path><path d="M9 16h4"></path></svg>'
  };

  const MODULES = [
    { key: "Topic Test", label: "Topic Tests", icon: ICONS.topic, description: "Chapter-wise practice folders" },
    { key: "Area Wise Test", label: "Area Wise Test", icon: ICONS.target, description: "Section-level focused drills" },
    { key: "PYQ", label: "PYQ Library", icon: ICONS.files, description: "Previous year question practice" },
    { key: "Daily LRDI", label: "Daily LRDI", icon: ICONS.puzzle, description: "Daily DILR practice sets" },
    { key: "Daily RC", label: "Daily RC", icon: ICONS.rc, description: "Reading comprehension practice" },
    { key: "Sectional Test", label: "Sectionals", icon: ICONS.clock, description: "Timed sectional practice" },
    { key: "Full Length", label: "Full Length", icon: ICONS.flag, description: "Complete mock practice" }
  ];

  const HOME_EMOJI = {
    "Topic Test": "📚",
    "Area Wise Test": "🎯",
    "PYQ": "📁",
    "Daily LRDI": "🧩",
    "Daily RC": "📰",
    "Sectional Test": "⏱️",
    "Full Length": "🏁"
  };

  const state = { tests: [], folders: [], folderKeys: new Set(), path: [], search: "" };
  const $ = (id) => document.getElementById(id);
  const els = {
    sideNav: $("sideNav"), homePanel: $("homePanel"), folderPanel: $("folderPanel"), emptyDataPanel: $("emptyDataPanel"),
    totalTests: $("totalTests"), topicTests: $("topicTests"), areaTests: $("areaTests"), pyqTests: $("pyqTests"), dailyTests: $("dailyTests"), folderTests: $("folderTests"),
    homeModules: $("homeModules"), pathLabel: $("pathLabel"), pageTitle: $("pageTitle"), pageSubtitle: $("pageSubtitle"),
    crumbTrail: $("crumbTrail"), sectionTitle: $("sectionTitle"), sectionMeta: $("sectionMeta"), searchInput: $("searchInput"), backButton: $("backButton"), clearSearchButton: $("clearSearchButton"),
    folderGrid: $("folderGrid"), testGrid: $("testGrid")
  };

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function slug(value) { return String(value || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
  function pathSlug(path) { return slug(path.join(" ")); }
  function samePath(a, b) { return a.length === b.length && a.every((part, index) => part === b[index]); }
  function naturalParts(value) { return String(value || "").split(/(\d+)/).map((x) => /^\d+$/.test(x) ? Number(x) : x.toLowerCase()); }
  function naturalCompare(a, b) {
    const aa = naturalParts(a), bb = naturalParts(b);
    for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
      if (aa[i] === undefined) return -1;
      if (bb[i] === undefined) return 1;
      if (aa[i] < bb[i]) return -1;
      if (aa[i] > bb[i]) return 1;
    }
    return 0;
  }
  function displayTitle(test) {
    let raw = test.original || (test.file || "").split("/").pop() || test.title || "Untitled Test";
    try { raw = decodeURIComponent(raw); } catch(e) {}
    raw = raw.replace(/\.html?$/i, "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
    raw = raw.replace(/\s*-\s*/g, " -").replace(/([A-Za-z])-(\d+)$/g, "$1 -$2");
    raw = raw.replace(/Avrage/g, "Average").replace(/Arithetic/g, "Arithmetic");
    return raw;
  }
  function normalizeTest(test) {
    const folders = Array.isArray(test.folders) ? test.folders.map(String).filter(Boolean).filter(x => x !== "New folder") : ["Uncategorised"];
    return { title: displayTitle(test), file: String(test.file || "#"), original: String(test.original || ""), folders, minutes: test.minutes || "", questions: test.questions || "" };
  }
  function normalizeFolder(folder) {
    const path = Array.isArray(folder.path) ? folder.path.map(String).filter(Boolean).filter(x => x !== "New folder") : [];
    return path.length ? { name: String(folder.name || path[path.length - 1]), path } : null;
  }
  function dedupeTests(tests) {
    const map = new Map();
    tests.map(normalizeTest).forEach((test) => map.set(test.file || `${test.title}-${test.folders.join("/")}`, test));
    return Array.from(map.values());
  }
  function dedupeFolders(folders) {
    const map = new Map();
    folders.map(normalizeFolder).filter(Boolean).forEach((folder) => map.set(folder.path.join(" / "), folder));
    return Array.from(map.values());
  }
  async function loadTests() {
    let tests = Array.isArray(window.CAT_TESTS) ? window.CAT_TESTS : [];
    let folders = Array.isArray(window.CAT_FOLDERS) ? window.CAT_FOLDERS : [];
    if (!tests.length) {
      try {
        const response = await fetch("tests.json?v=" + Date.now(), { cache: "no-store" });
        if (response.ok) tests = await response.json();
      } catch (error) { console.warn("Unable to load tests.json fallback", error); }
    }
    state.tests = dedupeTests(Array.isArray(tests) ? tests : []);
    state.folders = dedupeFolders(Array.isArray(folders) ? folders : []);
    rebuildFolderKeys();
  }
  function rebuildFolderKeys() {
    state.folderKeys = new Set();
    state.tests.forEach((test) => test.folders.forEach((_, index) => state.folderKeys.add(test.folders.slice(0, index + 1).join(" / "))));
    state.folders.forEach((folder) => folder.path.forEach((_, index) => state.folderKeys.add(folder.path.slice(0, index + 1).join(" / "))));
  }
  function countUnder(path) { return state.tests.filter((test) => samePath(test.folders.slice(0, path.length), path)).length; }
  function rootCount(root) { return state.tests.filter((test) => test.folders[0] === root).length; }
  function hasFolder(root) { return Array.from(state.folderKeys).some((key) => key.split(" / ")[0] === root); }
  function childrenFor(path) {
    const folderMap = new Map();
    const directTests = [];
    state.folderKeys.forEach((key) => {
      const folderPath = key.split(" / ");
      if (!samePath(folderPath.slice(0, path.length), path)) return;
      if (folderPath.length !== path.length + 1) return;
      const name = folderPath[folderPath.length - 1];
      folderMap.set(key, { name, path: folderPath, count: countUnder(folderPath) });
    });
    state.tests.forEach((test) => { if (samePath(test.folders, path)) directTests.push(test); });
    return {
      folders: Array.from(folderMap.values()).sort((a, b) => naturalCompare(a.name, b.name)),
      tests: directTests.sort((a, b) => naturalCompare(a.title, b.title))
    };
  }
  function allTestsUnder(path) { return state.tests.filter((test) => samePath(test.folders.slice(0, path.length), path)); }
  function pathFromHash() {
    const hash = decodeURIComponent((location.hash || "#home").replace(/^#/, ""));
    if (!hash || hash === "home") return [];
    const raw = hash.startsWith("folder/") ? hash.slice(7) : hash;
    const direct = Array.from(state.folderKeys).find((key) => pathSlug(key.split(" / ")) === raw);
    if (direct) return direct.split(" / ");
    const module = MODULES.find((item) => slug(item.key) === raw || slug(item.label) === raw);
    return module ? [module.key] : [];
  }
  function setHash(path) {
    const newHash = path.length ? "#folder/" + pathSlug(path) : "#home";
    if (location.hash !== newHash) history.pushState(null, "", newHash);
  }
  function setPath(path, push = true) {
    state.path = path || [];
    state.search = "";
    if (els.searchInput) els.searchInput.value = "";
    if (push) setHash(state.path);
    render();
  }
  function moduleHref(key) { return "#folder/" + slug(key); }

  function renderSideNav() {
    if (!els.sideNav) return;
    els.sideNav.innerHTML = "";
    const dashboard = document.createElement("a");
    dashboard.href = "#home"; dashboard.className = "side-link"; dashboard.dataset.path = "";
    dashboard.innerHTML = `<span class="nav-icon">${ICONS.home}</span><span>Dashboard</span><em>Home</em>`;
    dashboard.addEventListener("click", (event) => { event.preventDefault(); setPath([]); });
    els.sideNav.appendChild(dashboard);
    MODULES.forEach((module) => {
      const count = rootCount(module.key);
      if (!count && !hasFolder(module.key)) return;
      const link = document.createElement("a");
      link.href = moduleHref(module.key); link.className = "side-link"; link.dataset.path = module.key;
      link.innerHTML = `<span class="nav-icon">${module.icon}</span><span>${escapeHtml(module.label)}</span><em>${count}</em>`;
      link.addEventListener("click", (event) => { event.preventDefault(); setPath([module.key]); });
      els.sideNav.appendChild(link);
    });
  }
  function renderHomeModules() {
    if (!els.homeModules) return;
    els.homeModules.innerHTML = "";
    MODULES.forEach((module) => {
      const count = rootCount(module.key);
      if (!count && !hasFolder(module.key)) return;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "module-card old-dashboard-card";
      const countLine = count ? `${count} test${count === 1 ? "" : "s"} →` : "Coming soon →";
      const emoji = HOME_EMOJI[module.key] || "📘";
      card.innerHTML = `
        <span class="old-card-icon" aria-hidden="true">${emoji}</span>
        <span class="old-card-copy">
          <strong>${escapeHtml(module.label)}</strong>
          <small>${escapeHtml(module.description)}</small>
          <em>${escapeHtml(countLine)}</em>
        </span>`;
      card.addEventListener("click", () => setPath([module.key]));
      els.homeModules.appendChild(card);
    });
  }
  function renderMetrics() {
    els.totalTests.textContent = state.tests.length;
    els.topicTests.textContent = rootCount("Topic Test");
    els.areaTests.textContent = rootCount("Area Wise Test");
    els.pyqTests.textContent = rootCount("PYQ");
    els.dailyTests.textContent = rootCount("Daily LRDI");
    els.folderTests.textContent = state.path.length ? countUnder(state.path) : state.tests.length;
  }
  function updateHeader() {
    if (!state.path.length) {
      els.pathLabel.textContent = "Dashboard"; els.pageTitle.textContent = "CAT Practice Portal";
      els.pageSubtitle.textContent = "Topic-wise tests, PYQs, area-wise practice and daily drills in one calm place."; return;
    }
    els.pathLabel.textContent = state.path[0]; els.pageTitle.textContent = state.path[state.path.length - 1]; els.pageSubtitle.textContent = state.path.join(" / ");
  }
  function renderFolderCard(folder) {
    const card = document.createElement("button");
    card.type = "button"; card.className = "folder-card";
    const countText = folder.count ? `${folder.count} test${folder.count === 1 ? "" : "s"}` : "0 tests";
    card.innerHTML = `<span class="folder-icon">${ICONS.folder}</span><h3>${escapeHtml(folder.name)}</h3><p>${escapeHtml(folder.path.join(" / "))}</p><div class="card-meta"><span class="badge ${folder.count ? "" : "muted-badge"}">${countText}</span><span class="badge">Open Folder</span></div>`;
    card.addEventListener("click", () => setPath(folder.path));
    return card;
  }
  function renderTestCard(test) {
    const card = document.createElement("article");
    card.className = "test-card";
    const meta = [test.minutes ? `${test.minutes} min` : "", test.questions ? `${test.questions} questions` : "", test.folders.slice(-1)[0] || ""].filter(Boolean);
    card.innerHTML = `<div class="test-top"><span class="test-icon">${ICONS.test}</span><div><h3>${escapeHtml(test.title)}</h3><p>${escapeHtml(test.folders.join(" / "))}</p><div class="card-meta">${meta.map((item) => `<span class="badge">${escapeHtml(item)}</span>`).join("")}</div></div></div>`;
    const link = document.createElement("a");
    link.className = "start-btn"; link.href = encodeURI(test.file); link.target = "_blank"; link.rel = "noopener"; link.textContent = "Start Test →";
    card.appendChild(link); return card;
  }
  function updateActiveNav() {
    document.querySelectorAll(".side-link").forEach((link) => {
      const path = link.dataset.path || "";
      link.classList.toggle("active", (!state.path.length && !path) || state.path[0] === path);
    });
  }
  function renderFolderView() {
    const { folders, tests } = childrenFor(state.path);
    const term = state.search.trim().toLowerCase();
    const visibleTests = term ? allTestsUnder(state.path).filter((test) => `${test.title} ${test.original} ${test.folders.join(" ")}`.toLowerCase().includes(term)) : tests;
    els.crumbTrail.textContent = state.path.join(" / ") || "Course Content";
    els.sectionTitle.textContent = state.path[state.path.length - 1] || "Browse Tests";
    els.sectionMeta.textContent = "";
    els.clearSearchButton.hidden = !term;
    els.folderGrid.innerHTML = "";
    els.testGrid.innerHTML = "";
    if (!term) folders.forEach((folder) => els.folderGrid.appendChild(renderFolderCard(folder)));
    visibleTests.forEach((test) => els.testGrid.appendChild(renderTestCard(test)));
    if (!folders.length && !visibleTests.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = term ? "No matching tests in this folder." : "This folder is ready but no tests are uploaded yet.";
      els.testGrid.appendChild(empty);
    }
  }
  function render() {
    if (!state.tests.length && !state.folderKeys.size) {
      els.homePanel.hidden = true; els.folderPanel.hidden = true; els.emptyDataPanel.hidden = false; return;
    }
    els.emptyDataPanel.hidden = true;
    renderMetrics(); updateHeader(); updateActiveNav();
    if (!state.path.length) { els.homePanel.hidden = false; els.folderPanel.hidden = true; renderHomeModules(); return; }
    els.homePanel.hidden = true; els.folderPanel.hidden = false; renderFolderView();
  }
  function bindEvents() {
    document.querySelector(".brand")?.addEventListener("click", (event) => { event.preventDefault(); setPath([]); });
    document.querySelector(".home-pill")?.addEventListener("click", (event) => { event.preventDefault(); setPath([]); });
    els.backButton?.addEventListener("click", () => setPath(state.path.slice(0, -1)));
    els.clearSearchButton?.addEventListener("click", () => { state.search = ""; els.searchInput.value = ""; render(); });
    els.searchInput?.addEventListener("input", (event) => { state.search = event.target.value; render(); });
    window.addEventListener("hashchange", () => { state.path = pathFromHash(); state.search = ""; if (els.searchInput) els.searchInput.value = ""; render(); });
  }
  async function init() {
    await loadTests();
    renderSideNav();
    bindEvents();
    state.path = pathFromHash();
    render();
  }
  init();
})();
