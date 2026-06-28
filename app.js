(function () {
  "use strict";

  const tests = Array.isArray(window.CAT_TESTS) ? window.CAT_TESTS : [];
  const declaredFolders = Array.isArray(window.CAT_FOLDERS) ? window.CAT_FOLDERS : [];

  const ROOTS = {
    home: { label: "Dashboard", path: [], icon: "⌂", subtitle: "Search or choose a section. Each test opens in the exam console." },
    "topic-test": { label: "Topic Tests", path: ["Topic Test"], icon: "T", subtitle: "Topic-wise practice arranged folder by folder." },
    "area-wise": { label: "Area Wise Test", path: ["Area Wise Test"], fallbackNames: ["Area Wise", "Area Wise Tests", "Area wise Test", "Area Wise Test Folder", "Area Wise Section"], icon: "A", subtitle: "Focused area-wise practice folders for QA, LRDI and section-level drills." },
    "previous-papers": { label: "Previous Papers", path: ["PYQ"], fallbackNames: ["Previous Papers", "Previous Paper", "Past Papers", "Past Year Papers"], icon: "P", subtitle: "Past-year practice papers arranged for quick access." },
    sectionals: { label: "Sectionals", path: ["Sectional Test"], fallbackNames: ["Sectionals", "Sectional"], icon: "S", subtitle: "Section-wise timed tests for focused practice." },
    "full-length": { label: "Full Length", path: ["Full Length"], fallbackNames: ["Full Test", "Full Length Test", "Mock Test", "Mocks"], icon: "F", subtitle: "Complete mock tests and full-length practice papers." }
  };

  const els = {
    sidebar: document.querySelector(".sidebar"),
    menuToggle: document.getElementById("menuToggle"),
    pageEyebrow: document.getElementById("pageEyebrow"),
    pageTitle: document.getElementById("pageTitle"),
    pageSubtitle: document.getElementById("pageSubtitle"),
    contentTitle: document.getElementById("contentTitle"),
    contentNote: document.getElementById("contentNote"),
    breadcrumb: document.getElementById("breadcrumb"),
    searchWrap: document.getElementById("searchWrap"),
    searchInput: document.getElementById("searchInput"),
    dashboardView: document.getElementById("dashboardView"),
    folderView: document.getElementById("folderView"),
    testView: document.getElementById("testView"),
    totalTests: document.getElementById("totalTests"),
    topicCount: document.getElementById("topicCount"),
    areaCount: document.getElementById("areaCount"),
    pyqCount: document.getElementById("pyqCount"),
    sectionalCount: document.getElementById("sectionalCount"),
    fullCount: document.getElementById("fullCount"),
    topicSideCount: document.getElementById("topicSideCount"),
    areaSideCount: document.getElementById("areaSideCount"),
    pyqSideCount: document.getElementById("pyqSideCount"),
    sectionalSideCount: document.getElementById("sectionalSideCount"),
    fullSideCount: document.getElementById("fullSideCount")
  };

  let currentPath = [];
  let currentRoute = "home";
  let searchTerm = "";

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function slug(value) {
    return normalize(value).replace(/\s+/g, "-");
  }

  function samePath(a, b) {
    return a.length === b.length && a.every((part, i) => part === b[i]);
  }

  function startsWithPath(full, prefix) {
    return prefix.every((part, i) => full[i] === part);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  }

  function folderPath(test) {
    return Array.isArray(test && test.folders) ? test.folders.filter(Boolean) : [];
  }

  function allFolderKeys() {
    const keys = new Set();
    declaredFolders.forEach(folder => {
      const path = folderPath({ folders: folder.path });
      path.forEach((_, i) => keys.add(path.slice(0, i + 1).join(" / ")));
    });
    tests.forEach(test => {
      const path = folderPath(test);
      path.forEach((_, i) => keys.add(path.slice(0, i + 1).join(" / ")));
    });
    return Array.from(keys).filter(Boolean);
  }

  function folderExists(path) {
    const key = path.join(" / ");
    return allFolderKeys().includes(key);
  }

  function routeRootPath(routeKey) {
    const root = ROOTS[routeKey] || ROOTS.home;
    if (!root.path.length) return [];
    const exact = folderExists(root.path) || tests.some(t => startsWithPath(folderPath(t), root.path));
    if (exact) return root.path;
    for (const name of root.fallbackNames || []) {
      const path = [name];
      if (folderExists(path) || tests.some(t => startsWithPath(folderPath(t), path))) return path;
    }
    return root.path;
  }

  function pathSlug(path) {
    return slug(path.join(" / "));
  }

  function pathFromHash() {
    const raw = decodeURIComponent((window.location.hash || "#home").replace(/^#/, ""));
    if (!raw || raw === "home") return { route: "home", path: [] };
    if (ROOTS[raw]) return { route: raw, path: routeRootPath(raw) };

    const wanted = raw.startsWith("folder/") ? raw.replace("folder/", "") : raw;
    const aliasMap = {
      "topic-test": "topic-test",
      "topic-tests": "topic-test",
      "area-wise": "area-wise",
      "area-wise-test": "area-wise",
      "area-wise-tests": "area-wise",
      "area-wise-folder": "area-wise",
      "areawise": "area-wise",
      "areawise-test": "area-wise",
      "previous-papers": "previous-papers",
      "pyq": "previous-papers",
      "sectionals": "sectionals",
      "sectional-test": "sectionals",
      "full-length": "full-length",
      "full-length-test": "full-length"
    };
    if (aliasMap[wanted]) return { route: aliasMap[wanted], path: routeRootPath(aliasMap[wanted]) };

    const keys = allFolderKeys();
    const exact = keys.find(key => slug(key) === wanted);
    if (exact) {
      const path = exact.split(" / ");
      return { route: routeForPath(path), path };
    }

    const routeHit = Object.keys(ROOTS).find(routeKey => routeKey !== "home" && (wanted === routeKey || wanted.startsWith(routeKey + "-")));
    if (routeHit) {
      const rootPath = routeRootPath(routeHit);
      const rootSlug = slug((ROOTS[routeHit].path || [routeHit])[0] || routeHit);
      const possible = keys
        .map(key => key.split(" / "))
        .filter(path => startsWithPath(path, rootPath));
      const stripped = wanted.replace(routeHit + "-", "");
      const best = possible.find(path => wanted === pathSlug(path) || wanted.endsWith(pathSlug(path).replace(rootSlug + "-", "")))
        || possible.find(path => pathSlug(path).includes(stripped));
      if (best) return { route: routeHit, path: best };
      return { route: routeHit, path: rootPath };
    }

    if (wanted.startsWith("topic-qa")) {
      const translated = wanted.replace(/^topic-qa/, "topic-test-qa");
      const match = allFolderKeys().find(key => slug(key).includes(translated.replace("topic-test-", "")));
      if (match) return { route: "topic-test", path: match.split(" / ") };
      return { route: "topic-test", path: ["Topic Test", "QA"] };
    }

    return { route: "home", path: [] };
  }

  function routeForPath(path) {
    if (!path.length) return "home";
    for (const routeKey of Object.keys(ROOTS)) {
      if (routeKey === "home") continue;
      if (startsWithPath(path, routeRootPath(routeKey))) return routeKey;
    }
    return "home";
  }

  function childData(path) {
    const folderMap = new Map();
    const directTests = [];
    tests.forEach(test => {
      const tPath = folderPath(test);
      if (!startsWithPath(tPath, path)) return;
      if (tPath.length > path.length) {
        const childPath = tPath.slice(0, path.length + 1);
        const key = childPath.join(" / ");
        if (!folderMap.has(key)) folderMap.set(key, { name: childPath[childPath.length - 1], path: childPath, count: 0 });
        folderMap.get(key).count += 1;
      } else {
        directTests.push(test);
      }
    });
    declaredFolders.forEach(folder => {
      const fPath = folderPath({ folders: folder.path });
      if (!startsWithPath(fPath, path) || fPath.length !== path.length + 1) return;
      const key = fPath.join(" / ");
      if (!folderMap.has(key)) folderMap.set(key, { name: folder.name || fPath[fPath.length - 1], path: fPath, count: countTestsUnder(fPath) });
    });
    const folders = Array.from(folderMap.values())
      .filter(folder => folder.count > 0 || folderExists(folder.path))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const sortedTests = directTests.sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), undefined, { numeric: true }));
    return { folders, tests: sortedTests };
  }

  function countTestsUnder(path) {
    return tests.filter(test => startsWithPath(folderPath(test), path)).length;
  }

  function setCounts() {
    const topic = countTestsUnder(routeRootPath("topic-test"));
    const area = countTestsUnder(routeRootPath("area-wise"));
    const pyq = countTestsUnder(routeRootPath("previous-papers"));
    const sectional = countTestsUnder(routeRootPath("sectionals"));
    const full = countTestsUnder(routeRootPath("full-length"));
    if (els.totalTests) els.totalTests.textContent = tests.length;
    if (els.topicCount) els.topicCount.textContent = topic;
    if (els.areaCount) els.areaCount.textContent = area;
    if (els.pyqCount) els.pyqCount.textContent = pyq;
    if (els.sectionalCount) els.sectionalCount.textContent = sectional;
    if (els.fullCount) els.fullCount.textContent = full;
    if (els.topicSideCount) els.topicSideCount.textContent = topic;
    if (els.areaSideCount) els.areaSideCount.textContent = area;
    if (els.pyqSideCount) els.pyqSideCount.textContent = pyq;
    if (els.sectionalSideCount) els.sectionalSideCount.textContent = sectional;
    if (els.fullSideCount) els.fullSideCount.textContent = full;
  }

  function setActiveNav(routeKey) {
    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.toggle("active", item.dataset.route === routeKey);
    });
  }

  function showOnly(viewName) {
    els.dashboardView.hidden = viewName !== "dashboard";
    els.folderView.hidden = viewName !== "folder";
    els.testView.hidden = viewName !== "tests";
  }

  function updateHeader(title, subtitle, eyebrow) {
    els.pageEyebrow.textContent = eyebrow || "STUDENT TEST PORTAL";
    els.pageTitle.textContent = title;
    els.pageSubtitle.textContent = subtitle || "Choose a folder and start practice.";
  }

  function setSearchVisible(visible) {
    els.searchWrap.hidden = !visible;
    if (!visible) {
      searchTerm = "";
      els.searchInput.value = "";
    }
  }

  function cleanFolderName(name) {
    return String(name || "Folder").replace(/^\d+\.?\s*/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function nicePath(path) {
    return path.map(cleanFolderName).filter(Boolean).join(" / ");
  }

  function cardIcon(name) {
    const clean = cleanFolderName(name);
    const lower = clean.toLowerCase();
    if (lower.includes("percent")) return "%";
    if (lower.includes("ratio")) return "R";
    if (lower.includes("area")) return "A";
    if (lower.includes("average")) return "AV";
    if (lower.includes("profit")) return "P";
    if (lower.includes("lrdi") || lower.includes("logical")) return "L";
    if (lower.includes("pyq") || lower.includes("paper")) return "Y";
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  }

  function folderCard(folder) {
    return `
      <a class="folder-card" href="#folder/${pathSlug(folder.path)}">
        <div>
          <div class="card-top">
            <span class="card-icon">${escapeHtml(cardIcon(folder.name))}</span>
            <span class="pill">${folder.count} ${folder.count === 1 ? "test" : "tests"}</span>
          </div>
          <h3 class="card-title">${escapeHtml(cleanFolderName(folder.name))}</h3>
          <p class="card-desc">${escapeHtml(nicePath(folder.path.slice(0, -1)) || "Main category")}</p>
        </div>
        <div class="card-footer"><span>Folder</span><span class="open-link">Open →</span></div>
      </a>`;
  }

  function dashboardCard(routeKey) {
    const root = ROOTS[routeKey];
    const count = countTestsUnder(routeRootPath(routeKey));
    return `
      <a class="dashboard-card" href="#folder/${routeKey}">
        <div>
          <div class="card-top">
            <span class="card-icon">${root.icon}</span>
            <span class="pill">${count} ${count === 1 ? "test" : "tests"}</span>
          </div>
          <h3 class="card-title">${root.label}</h3>
          <p class="card-desc">${root.subtitle}</p>
        </div>
        <div class="card-footer"><span>Category</span><span class="open-link">Open →</span></div>
      </a>`;
  }

  function helperStrip() {
    return `
      <div class="helper-strip">
        <div class="helper-card"><strong>1. Choose section</strong><span>Topic Tests, Area Wise, PYQs, Sectionals or Full Length.</span></div>
        <div class="helper-card"><strong>2. Open folder</strong><span>Drill down by subject and topic.</span></div>
        <div class="helper-card"><strong>3. Start test</strong><span>The paper opens in a clean exam console.</span></div>
      </div>`;
  }

  function allMatchingTests(term) {
    const q = normalize(term);
    if (!q) return [];
    return tests.filter(test => {
      const text = normalize([test.title, test.original, test.file, folderPath(test).join(" ")].join(" "));
      return text.includes(q);
    }).slice(0, 40);
  }

  function renderDashboard() {
    currentPath = [];
    currentRoute = "home";
    setActiveNav("home");
    showOnly("dashboard");
    setSearchVisible(true);
    updateHeader("CAT-MBA Prep Zone", "A calm test dashboard for topic tests, area-wise tests, previous papers, sectionals and full-length practice.");
    els.breadcrumb.textContent = "Dashboard";
    els.contentTitle.textContent = searchTerm ? "Search Results" : "Browse Tests";
    els.contentNote.textContent = searchTerm ? "Showing matching tests from all folders." : "Start from a category or type a topic/test name in search.";

    const matches = allMatchingTests(searchTerm);
    if (searchTerm) {
      els.dashboardView.innerHTML = matches.length
        ? `<div class="grid">${matches.map(testCard).join("")}</div>`
        : `<div class="empty-state"><strong>No test found</strong><span>Try a different spelling or open a category from the left.</span></div>`;
      return;
    }

    els.dashboardView.innerHTML = `${helperStrip()}<div class="grid">${["topic-test", "area-wise", "previous-papers", "sectionals", "full-length"].map(dashboardCard).join("")}</div>`;
  }

  function renderPath(path, routeKey) {
    currentPath = path;
    currentRoute = routeKey || routeForPath(path);
    setActiveNav(currentRoute);

    const { folders, tests: directTests } = childData(path);
    const allUnder = countTestsUnder(path);
    const title = path.length ? cleanFolderName(path[path.length - 1]) : "Dashboard";
    const route = ROOTS[currentRoute] || ROOTS.home;

    updateHeader(route.label || title, route.subtitle, "COURSE CONTENT");
    els.breadcrumb.textContent = path.length ? nicePath(path) : "Dashboard";
    els.contentTitle.textContent = title;
    els.contentNote.textContent = `${allUnder} ${allUnder === 1 ? "test" : "tests"} available in this section.`;

    const parent = path.slice(0, -1);
    const backHref = parent.length ? `#folder/${pathSlug(parent)}` : "#home";

    if (folders.length) {
      showOnly("folder");
      setSearchVisible(false);
      els.folderView.innerHTML = `
        <div class="back-row"><a class="back-btn" href="${backHref}">← Back</a></div>
        <div class="grid">${folders.map(folderCard).join("")}</div>`;
      return;
    }

    renderTests(path, directTests, backHref);
  }

  function renderTests(path, directTests, backHref) {
    showOnly("tests");
    setSearchVisible(true);
    const term = normalize(searchTerm);
    const filtered = directTests.filter(test => {
      const text = normalize([test.title, test.original, test.file, folderPath(test).join(" ")].join(" "));
      return !term || text.includes(term);
    });
    els.contentNote.textContent = `${filtered.length} of ${directTests.length} ${directTests.length === 1 ? "test" : "tests"} shown.`;

    if (!filtered.length) {
      els.testView.innerHTML = `
        <div class="back-row"><a class="back-btn" href="${backHref}">← Back</a></div>
        <div class="empty-state"><strong>No test found</strong><span>Try another folder or clear the search box.</span></div>`;
      return;
    }

    els.testView.innerHTML = `
      <div class="back-row"><a class="back-btn" href="${backHref}">← Back</a></div>
      <div class="grid">${filtered.map(testCard).join("")}</div>`;
  }

  function attemptUrl(test) {
    const params = new URLSearchParams();
    params.set("src", test.file || "");
    params.set("title", test.title || test.original || "CAT Test");
    if (test.minutes) params.set("minutes", test.minutes);
    return `attempt.html?${params.toString()}`;
  }

  function testCard(test) {
    const path = folderPath(test);
    const tags = [];
    if (path[0]) tags.push(cleanFolderName(path[0]));
    if (path[1]) tags.push(cleanFolderName(path[1]));
    if (path[path.length - 1]) tags.push(cleanFolderName(path[path.length - 1]));
    if (test.questions) tags.push(`${test.questions} Qs`);
    if (test.minutes) tags.push(`${test.minutes} min`);
    return `
      <article class="test-card">
        <h3>${escapeHtml(test.title || test.original || "Untitled Test")}</h3>
        <div class="pill-row">${tags.slice(0, 4).map(tag => `<span class="pill">${escapeHtml(tag)}</span>`).join("")}</div>
        <a class="start-btn" href="${escapeHtml(attemptUrl(test))}" target="_blank" rel="noopener">Start Test →</a>
      </article>`;
  }

  function renderFromHash() {
    const state = pathFromHash();
    if (els.sidebar) els.sidebar.classList.remove("open");
    if (!state.path.length) renderDashboard();
    else renderPath(state.path, state.route);
  }

  if (els.searchInput) {
    els.searchInput.addEventListener("input", event => {
      searchTerm = event.target.value;
      if (currentRoute === "home" || !currentPath.length) {
        renderDashboard();
        return;
      }
      const { tests: directTests } = childData(currentPath);
      const parent = currentPath.slice(0, -1);
      const backHref = parent.length ? `#folder/${pathSlug(parent)}` : "#home";
      renderTests(currentPath, directTests, backHref);
    });
  }

  if (els.menuToggle) {
    els.menuToggle.addEventListener("click", () => els.sidebar.classList.toggle("open"));
  }

  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
      searchTerm = "";
      if (els.searchInput) els.searchInput.value = "";
    });
  });

  window.addEventListener("hashchange", renderFromHash);

  setCounts();
  renderFromHash();
})();
