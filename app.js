(function () {
  "use strict";

  const MODULES = [
    { key: "Topic Test", label: "Topic Tests", icon: "T", description: "Chapter-wise practice folders" },
    { key: "Area Wise Test", label: "Area Wise Test", icon: "A", description: "Section-level focused drills" },
    { key: "PYQ", label: "PYQ Library", icon: "P", description: "Previous year questions" },
    { key: "Daily LRDI", label: "Daily LRDI", icon: "D", description: "Daily DILR practice sets" },
    { key: "Sectional Test", label: "Sectionals", icon: "S", description: "Timed sectional practice" },
    { key: "Full Length", label: "Full Length", icon: "F", description: "Complete mock practice" }
  ];

  const state = {
    tests: [],
    folderKeys: new Set(),
    path: [],
    search: ""
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    sideNav: $("sideNav"),
    homePanel: $("homePanel"),
    folderPanel: $("folderPanel"),
    emptyDataPanel: $("emptyDataPanel"),
    totalTests: $("totalTests"),
    topicTests: $("topicTests"),
    areaTests: $("areaTests"),
    pyqTests: $("pyqTests"),
    dailyTests: $("dailyTests"),
    folderTests: $("folderTests"),
    homeModules: $("homeModules"),
    pathLabel: $("pathLabel"),
    pageTitle: $("pageTitle"),
    pageSubtitle: $("pageSubtitle"),
    crumbTrail: $("crumbTrail"),
    sectionTitle: $("sectionTitle"),
    sectionMeta: $("sectionMeta"),
    searchInput: $("searchInput"),
    backButton: $("backButton"),
    clearSearchButton: $("clearSearchButton"),
    folderGrid: $("folderGrid"),
    testGrid: $("testGrid")
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function slug(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function pathSlug(path) {
    return slug(path.join(" "));
  }

  function samePath(a, b) {
    return a.length === b.length && a.every((part, index) => part === b[index]);
  }

  function normalizeTest(test) {
    const folders = Array.isArray(test.folders) ? test.folders.map(String) : ["Uncategorised"];
    return {
      title: String(test.title || test.original || "Untitled Test"),
      file: String(test.file || "#"),
      original: String(test.original || ""),
      folders,
      minutes: test.minutes || "",
      questions: test.questions || ""
    };
  }

  function dedupeTests(tests) {
    const map = new Map();
    tests.map(normalizeTest).forEach((test) => {
      const key = test.file || `${test.title}-${test.folders.join("/")}`;
      map.set(key, test);
    });
    return Array.from(map.values());
  }

  async function loadTests() {
    let tests = Array.isArray(window.CAT_TESTS) ? window.CAT_TESTS : [];
    if (!tests.length) {
      try {
        const response = await fetch("tests.json?v=" + Date.now(), { cache: "no-store" });
        if (response.ok) tests = await response.json();
      } catch (error) {
        console.warn("Unable to load tests.json fallback", error);
      }
    }
    state.tests = dedupeTests(Array.isArray(tests) ? tests : []);
    rebuildFolderKeys();
  }

  function rebuildFolderKeys() {
    state.folderKeys = new Set();
    state.tests.forEach((test) => {
      test.folders.forEach((_, index) => {
        state.folderKeys.add(test.folders.slice(0, index + 1).join(" / "));
      });
    });
    if (Array.isArray(window.CAT_FOLDERS)) {
      window.CAT_FOLDERS.forEach((folder) => {
        const path = Array.isArray(folder.path) ? folder.path : [];
        path.forEach((_, index) => state.folderKeys.add(path.slice(0, index + 1).join(" / ")));
      });
    }
  }

  function countUnder(path) {
    return state.tests.filter((test) => samePath(test.folders.slice(0, path.length), path)).length;
  }

  function rootCount(root) {
    return state.tests.filter((test) => test.folders[0] === root).length;
  }

  function childrenFor(path) {
    const folderMap = new Map();
    const directTests = [];

    state.folderKeys.forEach((key) => {
      const folderPath = key.split(" / ");
      if (!samePath(folderPath.slice(0, path.length), path)) return;
      if (folderPath.length !== path.length + 1) return;
      const name = folderPath[folderPath.length - 1];
      folderMap.set(key, {
        name,
        path: folderPath,
        count: countUnder(folderPath)
      });
    });

    state.tests.forEach((test) => {
      if (samePath(test.folders, path)) directTests.push(test);
    });

    return {
      folders: Array.from(folderMap.values())
        .filter((folder) => folder.count > 0 || folder.path.length === 1)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
      tests: directTests.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }))
    };
  }

  function allTestsUnder(path) {
    return state.tests.filter((test) => samePath(test.folders.slice(0, path.length), path));
  }

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

  function renderSideNav() {
    if (!els.sideNav) return;
    els.sideNav.innerHTML = "";
    const dashboard = document.createElement("a");
    dashboard.href = "#home";
    dashboard.className = "side-link";
    dashboard.dataset.path = "";
    dashboard.innerHTML = '<span class="nav-icon">⌂</span><span>Dashboard</span><em>Home</em>';
    dashboard.addEventListener("click", (event) => {
      event.preventDefault();
      setPath([]);
    });
    els.sideNav.appendChild(dashboard);

    MODULES.forEach((module) => {
      const count = rootCount(module.key);
      if (!count && !["Sectional Test", "Full Length"].includes(module.key)) return;
      const link = document.createElement("a");
      link.href = "#folder/" + slug(module.key);
      link.className = "side-link";
      link.dataset.path = module.key;
      link.innerHTML = `<span class="nav-icon">${escapeHtml(module.icon)}</span><span>${escapeHtml(module.label)}</span><em>${count}</em>`;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        setPath([module.key]);
      });
      els.sideNav.appendChild(link);
    });
  }

  function renderHomeModules() {
    if (!els.homeModules) return;
    els.homeModules.innerHTML = "";
    MODULES.forEach((module) => {
      const count = rootCount(module.key);
      if (!count) return;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "module-card";
      card.innerHTML = `
        <div>
          <span class="module-icon">${escapeHtml(module.icon)}</span>
          <strong>${escapeHtml(module.label)}</strong>
          <span>${escapeHtml(module.description)}</span>
        </div>
        <span>${count} test${count === 1 ? "" : "s"} →</span>
      `;
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
      els.pathLabel.textContent = "Dashboard";
      els.pageTitle.textContent = "CAT Practice Portal";
      els.pageSubtitle.textContent = "Topic-wise tests, PYQs, area-wise practice and daily drills in one calm place.";
      return;
    }
    els.pathLabel.textContent = state.path[0];
    els.pageTitle.textContent = state.path[state.path.length - 1];
    els.pageSubtitle.textContent = state.path.join(" / ");
  }

  function renderFolderCard(folder) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "folder-card";
    card.innerHTML = `
      <span class="folder-icon">📁</span>
      <h3>${escapeHtml(folder.name)}</h3>
      <p>${escapeHtml(folder.path.join(" / "))}</p>
      <div class="card-meta">
        <span class="badge">${folder.count} test${folder.count === 1 ? "" : "s"}</span>
        <span class="badge">Open Folder</span>
      </div>
    `;
    card.addEventListener("click", () => setPath(folder.path));
    return card;
  }

  function renderTestCard(test) {
    const card = document.createElement("article");
    card.className = "test-card";
    const meta = [
      test.minutes ? `${test.minutes} min` : "",
      test.questions ? `${test.questions} questions` : "",
      test.folders.slice(-1)[0] || ""
    ].filter(Boolean);

    card.innerHTML = `
      <div>
        <h3>${escapeHtml(test.title)}</h3>
        <p>${escapeHtml(test.folders.join(" / "))}</p>
        <div class="card-meta">
          ${meta.map((item) => `<span class="badge">${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
    `;

    const link = document.createElement("a");
    link.className = "start-btn";
    link.href = encodeURI(test.file);
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Start Test →";
    card.appendChild(link);
    return card;
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
    const visibleTests = term
      ? allTestsUnder(state.path).filter((test) => `${test.title} ${test.original} ${test.folders.join(" ")}`.toLowerCase().includes(term))
      : tests;

    els.crumbTrail.textContent = state.path.join(" / ") || "Course Content";
    els.sectionTitle.textContent = state.path[state.path.length - 1] || "Browse Tests";
    els.sectionMeta.textContent = term
      ? `Search results inside ${state.path.join(" / ")}`
      : `${countUnder(state.path)} test${countUnder(state.path) === 1 ? "" : "s"} available in this path.`;

    els.backButton.hidden = !state.path.length;
    els.clearSearchButton.hidden = !term;
    els.folderGrid.innerHTML = "";
    els.testGrid.innerHTML = "";

    if (!term) folders.forEach((folder) => els.folderGrid.appendChild(renderFolderCard(folder)));
    visibleTests.forEach((test) => els.testGrid.appendChild(renderTestCard(test)));

    if (!folders.length && !visibleTests.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = term ? "No matching tests found in this folder." : "No tests available in this folder yet.";
      els.testGrid.appendChild(empty);
    }
  }

  function render() {
    renderMetrics();
    renderSideNav();
    renderHomeModules();
    updateHeader();
    updateActiveNav();

    const hasTests = state.tests.length > 0;
    els.emptyDataPanel.hidden = hasTests;
    els.homePanel.hidden = !hasTests || state.path.length > 0;
    els.folderPanel.hidden = !hasTests || state.path.length === 0;

    if (state.path.length) renderFolderView();
  }

  function bindEvents() {
    window.addEventListener("hashchange", () => {
      state.path = pathFromHash();
      state.search = "";
      if (els.searchInput) els.searchInput.value = "";
      render();
    });

    if (els.backButton) {
      els.backButton.addEventListener("click", () => {
        if (!state.path.length) return;
        setPath(state.path.slice(0, -1));
      });
    }

    if (els.clearSearchButton) {
      els.clearSearchButton.addEventListener("click", () => {
        state.search = "";
        els.searchInput.value = "";
        render();
      });
    }

    if (els.searchInput) {
      els.searchInput.addEventListener("input", (event) => {
        state.search = event.target.value || "";
        renderFolderView();
      });
    }

    document.querySelectorAll('a[href="#home"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        setPath([]);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await loadTests();
    bindEvents();
    state.path = pathFromHash();
    render();
  });
})();
