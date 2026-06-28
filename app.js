const tests = Array.isArray(window.CAT_TESTS) ? window.CAT_TESTS : [];
const folders = Array.isArray(window.CAT_FOLDERS) ? window.CAT_FOLDERS : [];

const els = {
  totalTests: document.getElementById("totalTests"),
  folderCount: document.getElementById("folderCount"),
  currentCount: document.getElementById("currentCount"),
  crumbTrail: document.getElementById("crumbTrail"),
  pathLabel: document.getElementById("pathLabel"),
  sectionTitle: document.getElementById("sectionTitle"),
  folderGrid: document.getElementById("folderGrid"),
  testGrid: document.getElementById("testGrid"),
  searchInput: document.getElementById("searchInput"),
  backButton: document.getElementById("backButton"),
  homeButton: document.getElementById("homeButton")
};

let currentPath = [];
let search = "";

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function samePath(left, right) {
  return left.length === right.length && left.every((part, index) => part === right[index]);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function childrenFor(path) {
  const folderMap = new Map();
  const directTests = [];

  folders.forEach(folder => {
    const folderPath = Array.isArray(folder.path) ? folder.path : [];
    if (!samePath(folderPath.slice(0, path.length), path)) return;
    if (folderPath.length !== path.length + 1) return;
    const key = folderPath.join(" / ");
    if (!folderMap.has(key)) {
      folderMap.set(key, { name: folder.name || folderPath[folderPath.length - 1], path: folderPath, count: 0 });
    }
  });

  tests.forEach(test => {
    const foldersPath = Array.isArray(test.folders) ? test.folders : [];
    if (!samePath(foldersPath.slice(0, path.length), path)) return;

    if (foldersPath.length > path.length) {
      const name = foldersPath[path.length];
      const key = foldersPath.slice(0, path.length + 1).join(" / ");
      if (!folderMap.has(key)) folderMap.set(key, { name, path: foldersPath.slice(0, path.length + 1), count: 0 });
      folderMap.get(key).count += 1;
      return;
    }

    directTests.push(test);
  });

  return {
    folders: Array.from(folderMap.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    tests: directTests.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }))
  };
}

function allFolderKeys() {
  const keys = new Set();
  folders.forEach(folder => {
    const foldersPath = Array.isArray(folder.path) ? folder.path : [];
    foldersPath.forEach((_, index) => keys.add(foldersPath.slice(0, index + 1).join(" / ")));
  });
  tests.forEach(test => {
    const foldersPath = Array.isArray(test.folders) ? test.folders : [];
    foldersPath.forEach((_, index) => keys.add(foldersPath.slice(0, index + 1).join(" / ")));
  });
  return keys;
}

function pathFromHash() {
  const raw = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (!raw || raw === "home") return [];
  if (!raw.startsWith("folder/")) return [];
  const wanted = raw.replace("folder/", "");
  const match = Array.from(allFolderKeys()).find(key => slug(key) === wanted);
  return match ? match.split(" / ") : [];
}

function setHash(path) {
  if (!path.length) {
    history.replaceState(null, "", "#home");
    return;
  }
  history.replaceState(null, "", `#folder/${slug(path.join(" / "))}`);
}

function countTestsUnder(path) {
  return tests.filter(test => samePath((test.folders || []).slice(0, path.length), path)).length;
}

function render() {
  const { folders, tests: directTests } = childrenFor(currentPath);
  const term = search.trim().toLowerCase();
  const visibleTests = directTests.filter(test => {
    const haystack = `${test.title} ${test.original || ""}`.toLowerCase();
    return !term || haystack.includes(term);
  });
  const totalInView = countTestsUnder(currentPath);
  const pathText = currentPath.length ? currentPath.join(" / ") : "CAT-MBA";

  els.totalTests.textContent = tests.length;
  els.folderCount.textContent = allFolderKeys().size;
  els.currentCount.textContent = totalInView;
  els.crumbTrail.textContent = pathText;
  els.pathLabel.textContent = currentPath.length ? currentPath.slice(0, -1).join(" / ") || "CAT-MBA" : "Course Content";
  els.sectionTitle.textContent = currentPath.length ? currentPath[currentPath.length - 1] : "Browse Tests";
  els.backButton.style.display = currentPath.length ? "inline-flex" : "none";
  els.searchInput.value = search;
  els.searchInput.style.display = directTests.length ? "block" : "none";

  els.folderGrid.innerHTML = "";
  folders.forEach(folder => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "folder-card";
    card.innerHTML = `<span>${escapeHtml(folder.name)}</span><small>${folder.count} test${folder.count === 1 ? "" : "s"}</small>`;
    card.addEventListener("click", () => {
      currentPath = folder.path;
      search = "";
      setHash(currentPath);
      render();
    });
    els.folderGrid.appendChild(card);
  });

  els.testGrid.innerHTML = "";
  if (!folders.length && !visibleTests.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = term ? "No matching tests in this folder." : "No tests available in this folder.";
    els.testGrid.appendChild(empty);
  }

  visibleTests.forEach(test => {
    const card = document.createElement("article");
    card.className = "test-card";
    const meta = [
      test.questions ? `${test.questions} questions` : "",
      test.minutes ? `${test.minutes} min` : ""
    ].filter(Boolean).map(item => `<span class="pill">${escapeHtml(item)}</span>`).join("");
    card.innerHTML = `<div><h3>${escapeHtml(test.title)}</h3><div class="meta-row">${meta || '<span class="pill">Practice set</span>'}</div></div>`;
    const link = document.createElement("a");
    link.className = "start-btn";
    link.href = test.file;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Start Test";
    card.appendChild(link);
    els.testGrid.appendChild(card);
  });
}

function goHome() {
  currentPath = [];
  search = "";
  setHash(currentPath);
  render();
}

els.homeButton.addEventListener("click", goHome);
els.backButton.addEventListener("click", () => {
  currentPath = currentPath.slice(0, -1);
  search = "";
  setHash(currentPath);
  render();
});
els.searchInput.addEventListener("input", event => {
  search = event.target.value;
  render();
});
window.addEventListener("hashchange", () => {
  currentPath = pathFromHash();
  search = "";
  render();
});

currentPath = pathFromHash();
render();
