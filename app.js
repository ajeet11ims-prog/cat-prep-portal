(function () {
  const ROOT = "CAT PREP with Ajeet sir";
  const tests = Array.isArray(window.CAT_TESTS) ? window.CAT_TESTS : [];
  const declaredFolders = Array.isArray(window.CAT_FOLDERS) ? window.CAT_FOLDERS : [];

  const els = {
    totalTests: document.getElementById("totalTests"),
    folderBoxCount: document.getElementById("folderBoxCount"),
    folderPathLabel: document.getElementById("folderPathLabel"),
    currentFolderTitle: document.getElementById("currentFolderTitle"),
    folderCountLine: document.getElementById("folderCountLine"),
    folderGrid: document.getElementById("folderGrid"),
    testGrid: document.getElementById("testGrid"),
    searchInput: document.getElementById("searchInput"),
    backButton: document.getElementById("backButton"),
    homeButton: document.getElementById("homeButton")
  };

  function safe(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }
  function normalize(value) { return safe(value).toLowerCase(); }
  function cleanPath(value) { return safe(value).replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, ""); }
  function slugify(value) { return cleanPath(value).toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""); }
  function titleFromPath(path) { const parts = cleanPath(path).split("/").filter(Boolean); return parts[parts.length - 1] || ROOT; }
  function parentPath(path) { const parts = cleanPath(path).split("/").filter(Boolean); parts.pop(); return parts.join("/"); }
  function ensureRoot(path) {
    path = cleanPath(path);
    if (!path) return ROOT;
    if (path === ROOT || path.startsWith(ROOT + "/")) return path;
    return cleanPath(ROOT + "/" + path);
  }
  function testFile(test) { return cleanPath(test.file || test.path || test.href || ""); }
  function testFolder(test) { const file = testFile(test); return parentPath(file); }
  function getType(item) { return safe(item.type, "Folder"); }
  function getSubject(item) { return safe(item.subject, ""); }
  function getTopic(item) { return safe(item.topic || item.area, ""); }
  function getTitle(item) { return safe(item.title || item.name || item.original, titleFromPath(item.path || item.file)); }

  const folderMap = new Map();
  function addFolder(path, source = {}) {
    path = ensureRoot(path);
    if (!path) return;
    const existing = folderMap.get(path) || {};
    folderMap.set(path, {
      ...existing,
      ...source,
      path,
      title: safe(source.title || existing.title, titleFromPath(path)),
      type: safe(source.type || existing.type, "Folder"),
      status: safe(source.status || existing.status, "Ready")
    });
    const parent = parentPath(path);
    if (parent && parent !== path) addFolder(parent, { title: titleFromPath(parent), type: "Folder", status: "Ready" });
  }

  addFolder(ROOT, { title: ROOT, type: "Root", status: "Ready" });
  declaredFolders.forEach(folder => addFolder(folder.path, folder));
  tests.forEach(test => {
    const folder = testFolder(test);
    if (folder) addFolder(folder, { title: titleFromPath(folder), type: getType(test), subject: getSubject(test), topic: getTopic(test), status: "Ready" });
  });

  const folders = Array.from(folderMap.values()).sort((a, b) => cleanPath(a.path).localeCompare(cleanPath(b.path)));
  const pathBySlug = new Map();
  folders.forEach(folder => pathBySlug.set(slugify(folder.path), folder.path));
  pathBySlug.set("home", ROOT);
  pathBySlug.set(slugify(ROOT), ROOT);

  function directChildFolders(path) {
    path = cleanPath(path);
    return folders.filter(folder => {
      const p = cleanPath(folder.path);
      return p !== path && parentPath(p) === path;
    });
  }
  function directTests(path) { return tests.filter(test => testFolder(test) === cleanPath(path)); }
  function recursiveTestCount(path) {
    const prefix = cleanPath(path) + "/";
    return tests.filter(test => {
      const folder = testFolder(test);
      return folder === cleanPath(path) || folder.startsWith(prefix);
    }).length;
  }
  function folderStatus(folder) { return recursiveTestCount(folder.path) > 0 ? "Ready" : "Upload Pending"; }
  function setHashForPath(path) { history.replaceState(null, "", cleanPath(path) === ROOT ? "#home" : `#folder/${slugify(path)}`); }
  function pathFromHash() {
    const hash = location.hash.replace(/^#/, "");
    if (!hash || hash === "home") return ROOT;
    if (hash.startsWith("folder/")) {
      const key = decodeURIComponent(hash.replace("folder/", ""));
      if (pathBySlug.has(key)) return pathBySlug.get(key);
      const asPath = cleanPath(key.replace(/-/g, " "));
      return pathBySlug.get(slugify(asPath)) || ROOT;
    }
    return pathBySlug.get(hash) || ROOT;
  }
  function crumb(path) {
    const parts = cleanPath(path).split("/").filter(Boolean);
    return parts.length <= 1 ? "Home" : parts.join(" › ");
  }
  function matchesSearch(item, term) {
    if (!term) return true;
    return normalize(`${item.title} ${item.path} ${item.type} ${item.subject} ${item.topic} ${item.area}`).includes(term);
  }

  let currentPath = ROOT;
  function render() {
    const term = normalize(els.searchInput?.value || "");
    currentPath = pathFromHash();
    const currentFolder = folderMap.get(currentPath) || { title: titleFromPath(currentPath), path: currentPath };
    const children = directChildFolders(currentPath).filter(folder => matchesSearch(folder, term));
    const folderTests = directTests(currentPath).filter(test => matchesSearch({ ...test, path: testFile(test) }, term));
    const recursiveCount = recursiveTestCount(currentPath);

    if (els.totalTests) els.totalTests.textContent = tests.length;
    if (els.folderBoxCount) els.folderBoxCount.textContent = Math.max(0, folders.length - 1);
    if (els.folderPathLabel) els.folderPathLabel.textContent = crumb(currentPath);
    if (els.currentFolderTitle) els.currentFolderTitle.textContent = getTitle(currentFolder);
    if (els.folderCountLine) {
      els.folderCountLine.textContent = `${recursiveCount} test${recursiveCount === 1 ? "" : "s"} • ${children.length} folder${children.length === 1 ? "" : "s"}`;
    }
    if (els.backButton) els.backButton.classList.toggle("hidden", currentPath === ROOT);

    els.folderGrid.innerHTML = "";
    children.forEach(folder => {
      const count = recursiveTestCount(folder.path);
      const status = folderStatus(folder);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "folder-card";
      btn.innerHTML = `
        <div class="card-top">
          <div class="folder-icon">📁</div>
          <div>
            <h3>${escapeHtml(getTitle(folder))}</h3>
            <p>${escapeHtml(cleanPath(folder.path).replace(ROOT + "/", ""))}</p>
          </div>
        </div>
        <div class="meta-row">
          <span class="pill">${count} test${count === 1 ? "" : "s"}</span>
          <span class="pill ${status === "Ready" ? "ready" : "pending"}">${status}</span>
        </div>`;
      btn.addEventListener("click", () => { currentPath = folder.path; setHashForPath(folder.path); render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
      els.folderGrid.appendChild(btn);
    });

    els.testGrid.innerHTML = "";
    if (!children.length && !folderTests.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.innerHTML = `No tests uploaded here yet. This folder is indexed and ready.<br><span class="danger-note">Later upload HTML files inside: ${escapeHtml(currentPath)}</span>`;
      els.testGrid.appendChild(empty);
    }
    folderTests.forEach(test => {
      const href = testFile(test);
      const card = document.createElement("article");
      card.className = "test-card";
      const title = getTitle(test);
      const meta = [getType(test), getSubject(test), getTopic(test), test.minutes ? `${test.minutes} min` : "", test.questions ? `${test.questions} questions` : ""].filter(Boolean);
      card.innerHTML = `
        <div>
          <h3>${escapeHtml(title)}</h3>
          <div class="meta-row">${meta.map(x => `<span class="pill">${escapeHtml(x)}</span>`).join("")}</div>
          <small>${escapeHtml(href || "File path pending")}</small>
        </div>
        ${href ? `<a class="start-btn" href="${encodeURI(href)}" target="_blank" rel="noopener">Start Test</a>` : `<span class="start-btn">Upload Pending</span>`}`;
      els.testGrid.appendChild(card);
    });
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
  }

  if (els.homeButton) els.homeButton.addEventListener("click", () => { location.hash = "home"; });
  if (els.backButton) els.backButton.addEventListener("click", () => {
    const parent = parentPath(currentPath);
    currentPath = parent && parent.startsWith(ROOT) ? parent : ROOT;
    setHashForPath(currentPath);
    render();
  });
  if (els.searchInput) els.searchInput.addEventListener("input", render);
  window.addEventListener("hashchange", render);
  render();
})();
