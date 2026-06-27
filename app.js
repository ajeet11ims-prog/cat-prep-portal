const SUBJECTS = [
  { key: "RC", label: "RC", description: "Reading Comprehension practice" },
  { key: "VA-VR", label: "VA - VR", description: "Verbal Ability and Verbal Reasoning" },
  { key: "LR", label: "LR", description: "Logical Reasoning sets and puzzles" },
  { key: "DI", label: "DI", description: "Data Interpretation sets" },
  { key: "QA", label: "QA", description: "Quantitative Aptitude practice" }
];

const QA_TOPICS = [
  { key: "number-system", label: "Number System", description: "Numbers, divisibility, remainders and properties" },
  { key: "arithmetic", label: "Arithmetic", description: "Percentage, profit loss, ratio, average, SI-CI and mixtures" },
  { key: "algebra", label: "Algebra", description: "Equations, inequalities, functions and expressions" },
  { key: "geometry", label: "Geometry", description: "Geometry, mensuration and coordinate geometry" },
  { key: "modern-math", label: "Modern Math", description: "Permutation, probability, set theory and sequences" }
];

const ROUTES = {
  topic: { label: "Topic Test", type: "Topic Wise Test", description: "Choose RC, VA-VR, LR, DI or QA topic practice." },
  area: { label: "Area Wise Test", type: "Area Wise Test", description: "Choose a subject area and see every available test from that area." },
  sectional: { label: "Sectional Test", type: "Sectional Test", description: "Section-level practice grouped by subject." },
  full: { label: "Full Length Test", type: "Full Test", description: "Complete test papers and CAT-style practice." }
};

const state = { tests: [], folders: [], route: "home", activeRoute: null, subject: null, qaTopic: null, search: "" };
const els = {
  totalTests: document.getElementById("totalTests"), topicCount: document.getElementById("topicCount"), areaCount: document.getElementById("areaCount"), sectionalCount: document.getElementById("sectionalCount"), fullCount: document.getElementById("fullCount"), homeView: document.getElementById("homeView"), subjectView: document.getElementById("subjectView"), qaTopicView: document.getElementById("qaTopicView"), listView: document.getElementById("listView"), subjectEyebrow: document.getElementById("subjectEyebrow"), subjectTitle: document.getElementById("subjectTitle"), subjectGrid: document.getElementById("subjectGrid"), qaTopicGrid: document.getElementById("qaTopicGrid"), qaTopicBackButton: document.getElementById("qaTopicBackButton"), listEyebrow: document.getElementById("listEyebrow"), listTitle: document.getElementById("listTitle"), listCount: document.getElementById("listCount"), listBackButton: document.getElementById("listBackButton"), searchInput: document.getElementById("searchInput"), testGrid: document.getElementById("testGrid"), homeButton: document.getElementById("homeButton")
};

function safe(value, fallback = "") { const text = String(value ?? "").trim(); return text || fallback; }
function normalize(value) { return safe(value).toLowerCase(); }
function getType(item) { return safe(item.type, "Topic Wise Test"); }
function getTitle(item) { return safe(item.title, "Untitled Test"); }
function getSubject(item) {
  if (item.subject) return item.subject;
  const area = normalize(item.area), topic = normalize(item.topic), title = normalize(item.title), file = normalize(item.file || item.path);
  const text = `${area} ${topic} ${title} ${file}`;
  if (area.includes("quant") || file.includes("/qa/") || text.includes("arithmetic") || text.includes("algebra") || text.includes("number system")) return "QA";
  if (area.includes("varc") || file.includes("/varc/") || file.includes("/rc/")) return (text.includes("rc") || text.includes("reading")) ? "RC" : "VA-VR";
  if (file.includes("/di/") || text.includes("graph") || text.includes("table") || text.includes("data interpretation")) return "DI";
  if (area.includes("lrdi") || file.includes("/lr/") || text.includes("reasoning") || text.includes("puzzle") || text.includes("games")) return "LR";
  return "QA";
}
function getQaTopic(item) {
  if (item.qaTopic) return item.qaTopic;
  const text = normalize(`${item.topic} ${item.title} ${item.file || item.path}`);
  if (text.includes("number")) return "number-system";
  if (text.includes("linear") || text.includes("algebra") || text.includes("equation") || text.includes("function") || text.includes("inequal")) return "algebra";
  if (text.includes("geometry") || text.includes("mensuration") || text.includes("triangle") || text.includes("circle") || text.includes("coordinate")) return "geometry";
  if (text.includes("permutation") || text.includes("combination") || text.includes("probability") || text.includes("set theory") || text.includes("modern")) return "modern-math";
  return "arithmetic";
}
function testsForRoute(routeKey) {
  const route = ROUTES[routeKey];
  if (!route) return [];
  return state.tests.filter(test => getType(test) === route.type);
}
function countByType(type) { return state.tests.filter(test => getType(test) === type).length; }
function subjectCount(routeKey, subjectKey) { return testsForRoute(routeKey).filter(test => getSubject(test) === subjectKey).length; }
function qaTopicCount(topicKey) { return testsForRoute("topic").filter(test => getSubject(test) === "QA" && getQaTopic(test) === topicKey).length; }
function testsForList() {
  const term = normalize(state.search);
  return testsForRoute(state.activeRoute).filter(test => {
    const subjectOk = !state.subject || getSubject(test) === state.subject;
    const qaTopicOk = !state.qaTopic || getQaTopic(test) === state.qaTopic;
    const text = normalize(`${test.title} ${test.area} ${test.topic} ${test.type} ${test.file}`);
    return subjectOk && qaTopicOk && (!term || text.includes(term));
  });
}
function emptyFoldersForList() {
  const route = ROUTES[state.activeRoute];
  if (!route) return [];
  const term = normalize(state.search);
  return state.folders.filter(folder => {
    if (getType(folder) !== route.type) return false;
    if (Number(folder.testsCount || 0) > 0) return false;
    if (state.subject && getSubject(folder) !== state.subject) return false;
    if (state.qaTopic && getQaTopic(folder) !== state.qaTopic) return false;
    const text = normalize(`${folder.title} ${folder.path} ${folder.area} ${folder.topic}`);
    return !term || text.includes(term);
  });
}
function showView(view) {
  [els.homeView, els.subjectView, els.qaTopicView, els.listView].filter(Boolean).forEach(node => node.classList.remove("active-view"));
  if (view) view.classList.add("active-view");
}
function resetSearch() { state.search = ""; if (els.searchInput) els.searchInput.value = ""; }
function goHome() {
  state.route = "home"; state.activeRoute = null; state.subject = null; state.qaTopic = null; resetSearch(); showView(els.homeView); history.replaceState(null, "", "#home");
}
function openRoute(routeKey) {
  const route = ROUTES[routeKey]; if (!route) return goHome();
  state.route = "subjects"; state.activeRoute = routeKey; state.subject = null; state.qaTopic = null; resetSearch();
  if (routeKey === "full") { openList(null); return; }
  els.subjectEyebrow.textContent = route.label;
  els.subjectTitle.textContent = route.description;
  renderSubjectCards(routeKey); showView(els.subjectView); history.replaceState(null, "", `#${routeKey}`);
}
function openQaTopics() { state.route = "qa-topics"; state.subject = "QA"; state.qaTopic = null; resetSearch(); renderQaTopicCards(); showView(els.qaTopicView); history.replaceState(null, "", "#topic-qa"); }
function openList(subjectKey, qaTopicKey = null) {
  const route = ROUTES[state.activeRoute] || ROUTES.topic;
  state.route = "list"; state.subject = subjectKey; state.qaTopic = qaTopicKey; resetSearch();
  const subject = SUBJECTS.find(item => item.key === subjectKey);
  const qaTopic = QA_TOPICS.find(item => item.key === qaTopicKey);
  els.listEyebrow.textContent = route.label;
  els.listTitle.textContent = qaTopic ? qaTopic.label : (subject ? `${subject.label} ${route.label}` : route.label);
  renderTestCards(); showView(els.listView);
  history.replaceState(null, "", qaTopicKey ? `#topic-qa-${qaTopicKey}` : (subjectKey ? `#${state.activeRoute}-${String(subjectKey).toLowerCase()}` : `#${state.activeRoute}`));
}
function renderSubjectCards(routeKey) {
  const routeTests = testsForRoute(routeKey);
  els.subjectGrid.innerHTML = "";
  SUBJECTS.forEach(subject => {
    const count = routeTests.filter(test => getSubject(test) === subject.key).length;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "subject-card";
    card.innerHTML = `<strong>${subject.label}</strong><span>${count} test${count === 1 ? "" : "s"}</span><small>${subject.description}${count ? "" : " • folder ready"}</small>`;
    card.addEventListener("click", () => {
      if (routeKey === "topic" && subject.key === "QA") openQaTopics(); else openList(subject.key);
    });
    els.subjectGrid.appendChild(card);
  });
}
function renderQaTopicCards() {
  els.qaTopicGrid.innerHTML = "";
  QA_TOPICS.forEach(topic => {
    const count = qaTopicCount(topic.key);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "subject-card";
    card.innerHTML = `<strong>${topic.label}</strong><span>${count} test${count === 1 ? "" : "s"}</span><small>${topic.description}${count ? "" : " • folder ready"}</small>`;
    card.addEventListener("click", () => openList("QA", topic.key));
    els.qaTopicGrid.appendChild(card);
  });
}
function renderEmptyFolderCard(folder) {
  const card = document.createElement("article");
  card.className = "test-card";
  const copy = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = `${getTitle(folder)} — Upload Pending`;
  copy.appendChild(title);
  const meta = document.createElement("div"); meta.className = "meta-row";
  [getType(folder), getSubject(folder), safe(folder.topic, "Folder ready"), "0 tests"].forEach(item => {
    const pill = document.createElement("span"); pill.className = "pill"; pill.textContent = item; meta.appendChild(pill);
  });
  copy.appendChild(meta);
  const note = document.createElement("small");
  note.textContent = `Upload future HTML files inside: ${safe(folder.path, "folder path missing")}`;
  copy.appendChild(note);
  const btn = document.createElement("span"); btn.className = "start-btn"; btn.textContent = "Upload Later";
  card.appendChild(copy); card.appendChild(btn); return card;
}
function renderTestCards() {
  const tests = testsForList();
  const folders = emptyFoldersForList();
  const count = tests.length;
  els.listCount.textContent = `${count} test${count === 1 ? "" : "s"}${folders.length ? ` + ${folders.length} empty folder${folders.length === 1 ? "" : "s"}` : ""}`;
  els.testGrid.innerHTML = "";
  folders.forEach(folder => els.testGrid.appendChild(renderEmptyFolderCard(folder)));
  if (!tests.length && !folders.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No tests uploaded here yet. This section is ready; add HTML files and update tests-data.js when you upload.";
    els.testGrid.appendChild(empty); return;
  }
  tests.forEach(test => {
    const card = document.createElement("article"); card.className = "test-card";
    const copy = document.createElement("div");
    const title = document.createElement("h3"); title.textContent = getTitle(test); copy.appendChild(title);
    const meta = document.createElement("div"); meta.className = "meta-row";
    [getType(test), getSubject(test), safe(test.area), safe(test.topic), test.minutes ? `${test.minutes} min` : "", test.questions ? `${test.questions} questions` : ""]
      .filter(Boolean).forEach(item => { const pill = document.createElement("span"); pill.className = "pill"; pill.textContent = item; meta.appendChild(pill); });
    copy.appendChild(meta);
    const file = safe(test.file);
    let action;
    if (file) { action = document.createElement("a"); action.href = file; action.target = "_blank"; action.rel = "noopener"; action.textContent = "Start Test"; }
    else { action = document.createElement("span"); action.textContent = "Upload Pending"; }
    action.className = "start-btn";
    card.appendChild(copy); card.appendChild(action); els.testGrid.appendChild(card);
  });
}
function handleHash() {
  const hash = window.location.hash.replace("#", "");
  if (!hash || hash === "home" || hash.startsWith("folder/")) return goHome();
  if (hash === "topic-qa") { state.activeRoute = "topic"; openQaTopics(); return; }
  if (hash.startsWith("topic-qa-")) { state.activeRoute = "topic"; openList("QA", hash.replace("topic-qa-", "")); return; }
  if (hash.startsWith("topic-")) {
    state.activeRoute = "topic";
    const subjectKey = hash.replace("topic-", "").toUpperCase();
    openList(subjectKey);
    return;
  }
  if (hash.includes("-")) {
    const parts = hash.split("-");
    const routeKey = parts[0];
    if (ROUTES[routeKey] && routeKey !== "topic") { state.activeRoute = routeKey; openList(parts.slice(1).join("-").toUpperCase()); return; }
  }
  if (ROUTES[hash]) return openRoute(hash);
  goHome();
}
function init() {
  state.tests = Array.isArray(window.CAT_TESTS) ? window.CAT_TESTS : [];
  state.folders = Array.isArray(window.CAT_FOLDERS) ? window.CAT_FOLDERS : [];
  els.totalTests.textContent = state.tests.length;
  els.topicCount.textContent = `${countByType("Topic Wise Test")} tests`;
  els.areaCount.textContent = `${countByType("Area Wise Test")} tests`;
  els.sectionalCount.textContent = `${countByType("Sectional Test")} tests`;
  els.fullCount.textContent = `${countByType("Full Test")} tests`;
  document.querySelectorAll("[data-route]").forEach(button => button.addEventListener("click", () => openRoute(button.dataset.route)));
  document.querySelectorAll("[data-back='home']").forEach(button => button.addEventListener("click", goHome));
  if (els.homeButton) els.homeButton.addEventListener("click", goHome);
  if (els.qaTopicBackButton) els.qaTopicBackButton.addEventListener("click", () => openRoute("topic"));
  if (els.listBackButton) els.listBackButton.addEventListener("click", () => { if (state.qaTopic) openQaTopics(); else if (state.activeRoute === "full") goHome(); else openRoute(state.activeRoute); });
  if (els.searchInput) els.searchInput.addEventListener("input", event => { state.search = event.target.value; renderTestCards(); });
  window.addEventListener("hashchange", handleHash);
  handleHash();
}
init();
