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

const ARITHMETIC_TOPICS = [
  { key: "percentage", label: "Percentage", description: "Percentage change, comparison and applications" },
  { key: "profit-loss", label: "Profit & Loss", description: "Profit, loss, discount, marked price and selling price" },
  { key: "si-ci", label: "SI & CI", description: "Simple interest and compound interest" },
  { key: "ratio-proportion", label: "Ratio Proportion", description: "Ratio, proportion, variation and partnership" },
  { key: "average", label: "Average", description: "Average, weighted average and mean-based questions" },
  { key: "mixture-alligation", label: "Mixture Alligation", description: "Mixtures, replacement and alligation rule" },
  { key: "time-work", label: "Time & Work", description: "Work efficiency, pipes and cisterns" },
  { key: "time-speed-distance", label: "Time Speed Distance", description: "Speed, distance, trains, boats and races" }
];

const ROUTES = {
  topic: {
    label: "Topic Test",
    type: "Topic Wise Test",
    description: "Choose RC, VA-VR, LR, DI or QA topic practice."
  },
  area: {
    label: "Area Wise Test",
    type: null,
    description: "Choose a subject area and see every available test from that area."
  },
  sectional: {
    label: "Sectional Test",
    type: "Sectional Test",
    description: "Section-level practice grouped by subject."
  },
  full: {
    label: "Full Length Test",
    type: "Full Test",
    description: "Complete test papers and SIMCAT-style practice."
  }
};

const state = {
  tests: [],
  route: "home",
  activeRoute: null,
  subject: null,
  qaTopic: null,
  arithmeticTopic: null,
  search: ""
};

const els = {
  totalTests: document.getElementById("totalTests"),
  topicCount: document.getElementById("topicCount"),
  areaCount: document.getElementById("areaCount"),
  sectionalCount: document.getElementById("sectionalCount"),
  fullCount: document.getElementById("fullCount"),
  homeView: document.getElementById("homeView"),
  subjectView: document.getElementById("subjectView"),
  qaTopicView: document.getElementById("qaTopicView"),
  listView: document.getElementById("listView"),
  subjectEyebrow: document.getElementById("subjectEyebrow"),
  subjectTitle: document.getElementById("subjectTitle"),
  subjectGrid: document.getElementById("subjectGrid"),
  qaTopicGrid: document.getElementById("qaTopicGrid"),
  qaTopicBackButton: document.getElementById("qaTopicBackButton"),
  listEyebrow: document.getElementById("listEyebrow"),
  listTitle: document.getElementById("listTitle"),
  listCount: document.getElementById("listCount"),
  listBackButton: document.getElementById("listBackButton"),
  searchInput: document.getElementById("searchInput"),
  testGrid: document.getElementById("testGrid"),
  homeButton: document.getElementById("homeButton")
};

function normalize(value) {
  return String(value || "").toLowerCase();
}

function slugText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function subjectFor(test) {
  const area = normalize(test.area);
  const topic = normalize(test.topic);
  const title = normalize(test.title);
  const text = `${area} ${topic} ${title}`;

  if (area.includes("quant") || area === "qa") return "QA";
  if (area.includes("varc")) {
    if (text.includes("rc") || text.includes("reading")) return "RC";
    return "VA-VR";
  }
  if (
    text.includes("graph") ||
    text.includes("table") ||
    text.includes("pie") ||
    text.includes("bar") ||
    text.includes("line graph") ||
    text.includes("data interpretation") ||
    /\bdi\b/.test(text)
  ) {
    return "DI";
  }
  if (
    area.includes("lrdi") ||
    text.includes("reasoning") ||
    text.includes("puzzle") ||
    text.includes("games") ||
    text.includes("seating")
  ) {
    return "LR";
  }
  return "QA";
}

function qaTopicFor(test) {
  const topic = normalize(test.topic);
  const title = normalize(test.title);
  const text = `${topic} ${title}`;

  if (text.includes("number")) return "number-system";
  if (
    text.includes("linear") ||
    text.includes("algebra") ||
    text.includes("equation") ||
    text.includes("function") ||
    text.includes("inequal")
  ) {
    return "algebra";
  }
  if (
    text.includes("geometry") ||
    text.includes("mensuration") ||
    text.includes("triangle") ||
    text.includes("circle") ||
    text.includes("coordinate")
  ) {
    return "geometry";
  }
  if (
    text.includes("permutation") ||
    text.includes("combination") ||
    text.includes("probability") ||
    text.includes("set theory") ||
    text.includes("sequence") ||
    text.includes("modern")
  ) {
    return "modern-math";
  }
  return "arithmetic";
}

function arithmeticTopicFor(test) {
  const topic = normalize(test.topic);
  const title = normalize(test.title);
  const text = `${topic} ${title} ${slugText(topic)} ${slugText(title)}`;

  if (text.includes("percentage") || text.includes("percent") || text.includes("%-")) return "percentage";
  if (text.includes("profit") || text.includes("loss") || text.includes("discount") || text.includes("marked price") || text.includes("selling price")) return "profit-loss";
  if (text.includes("simple interest") || text.includes("compound interest") || /\bsi\b/.test(text) || /\bci\b/.test(text) || text.includes("si-ci") || text.includes("interest")) return "si-ci";
  if (text.includes("ratio") || text.includes("proportion") || text.includes("variation") || text.includes("partnership")) return "ratio-proportion";
  if (text.includes("average") || text.includes("weighted average") || text.includes("mean")) return "average";
  if (text.includes("mixture") || text.includes("alligation") || text.includes("allegation") || text.includes("replacement")) return "mixture-alligation";
  if (text.includes("time and work") || text.includes("time-work") || text.includes("work") || text.includes("pipe") || text.includes("cistern") || text.includes("efficiency")) return "time-work";
  if (text.includes("time speed") || text.includes("time-speed") || text.includes("speed") || text.includes("distance") || text.includes("train") || text.includes("boat") || text.includes("race")) return "time-speed-distance";

  const exact = ARITHMETIC_TOPICS.find(item => slugText(item.label) === slugText(topic));
  return exact ? exact.key : null;
}

function testsForRoute(routeKey) {
  const route = ROUTES[routeKey];
  if (!route || !route.type) return state.tests;
  return state.tests.filter(test => test.type === route.type);
}

function testsForList() {
  const term = normalize(state.search.trim());

  return testsForRoute(state.activeRoute).filter(test => {
    const subjectOk = !state.subject || subjectFor(test) === state.subject;
    const qaTopicOk = !state.qaTopic || qaTopicFor(test) === state.qaTopic;
    const arithmeticTopicOk = !state.arithmeticTopic || arithmeticTopicFor(test) === state.arithmeticTopic;
    const text = normalize(`${test.title} ${test.area} ${test.topic} ${test.type}`);
    const searchOk = !term || text.includes(term);

    return subjectOk && qaTopicOk && arithmeticTopicOk && searchOk;
  });
}

function countByType(type) {
  return state.tests.filter(test => test.type === type).length;
}

function showView(view) {
  [els.homeView, els.subjectView, els.qaTopicView, els.listView].forEach(node => node.classList.remove("active-view"));
  view.classList.add("active-view");
}

function resetSearch() {
  state.search = "";
  els.searchInput.value = "";
}

function goHome() {
  state.route = "home";
  state.activeRoute = null;
  state.subject = null;
  state.qaTopic = null;
  state.arithmeticTopic = null;
  resetSearch();
  showView(els.homeView);
  history.replaceState(null, "", "#home");
}

function openRoute(routeKey) {
  const route = ROUTES[routeKey];
  if (!route) return;

  state.route = "subjects";
  state.activeRoute = routeKey;
  state.subject = null;
  state.qaTopic = null;
  state.arithmeticTopic = null;
  resetSearch();

  if (routeKey === "full") {
    openList(null);
    return;
  }

  els.subjectEyebrow.textContent = route.label;
  els.subjectTitle.textContent = route.description;
  renderSubjectCards(routeKey);
  showView(els.subjectView);
  history.replaceState(null, "", `#${routeKey}`);
}

function openQaTopics() {
  state.route = "qa-topics";
  state.activeRoute = "topic";
  state.subject = "QA";
  state.qaTopic = null;
  state.arithmeticTopic = null;
  resetSearch();
  renderQaTopicCards();
  showView(els.qaTopicView);
  history.replaceState(null, "", "#topic-qa");
}

function openArithmeticTopics() {
  state.route = "arithmetic-topics";
  state.activeRoute = "topic";
  state.subject = "QA";
  state.qaTopic = "arithmetic";
  state.arithmeticTopic = null;
  resetSearch();

  els.listEyebrow.textContent = "Topic Test / QA / Arithmetic";
  els.listTitle.textContent = "Choose an Arithmetic topic";
  els.listCount.textContent = "8 topic boxes";
  els.searchInput.style.display = "none";

  renderArithmeticTopicCards();
  showView(els.listView);
  history.replaceState(null, "", "#topic-qa-arithmetic");
}

function openList(subjectKey, qaTopicKey = null, arithmeticTopicKey = null) {
  const route = ROUTES[state.activeRoute] || ROUTES.topic;

  state.route = "list";
  state.subject = subjectKey;
  state.qaTopic = qaTopicKey;
  state.arithmeticTopic = arithmeticTopicKey;
  resetSearch();

  const subject = SUBJECTS.find(item => item.key === subjectKey);
  const qaTopic = QA_TOPICS.find(item => item.key === qaTopicKey);
  const arithmeticTopic = ARITHMETIC_TOPICS.find(item => item.key === arithmeticTopicKey);

  els.searchInput.style.display = "block";
  els.listEyebrow.textContent = route.label;
  els.listTitle.textContent = arithmeticTopic
    ? arithmeticTopic.label
    : qaTopic
      ? qaTopic.label
      : subject
        ? `${subject.label} ${route.label}`
        : route.label;

  renderTestCards();
  showView(els.listView);

  let hash = `#${state.activeRoute}`;
  if (qaTopicKey && arithmeticTopicKey) hash = `#topic-qa-${qaTopicKey}-${arithmeticTopicKey}`;
  else if (qaTopicKey) hash = `#topic-qa-${qaTopicKey}`;
  else if (subjectKey) hash = `#${state.activeRoute}-${subjectKey.toLowerCase()}`;

  history.replaceState(null, "", hash);
}

function renderSubjectCards(routeKey) {
  const routeTests = testsForRoute(routeKey);
  els.subjectGrid.innerHTML = "";

  SUBJECTS.forEach(subject => {
    const count = routeTests.filter(test => subjectFor(test) === subject.key).length;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "subject-card";
    card.disabled = count === 0 && !(routeKey === "topic" && subject.key === "QA");
    card.innerHTML = `<span>${subject.label}</span><strong>${count}</strong><small>${subject.description}</small>`;
    card.addEventListener("click", () => {
      if (routeKey === "topic" && subject.key === "QA") {
        openQaTopics();
      } else {
        openList(subject.key);
      }
    });
    els.subjectGrid.appendChild(card);
  });
}

function renderQaTopicCards() {
  const qaTests = testsForRoute("topic").filter(test => subjectFor(test) === "QA");
  els.qaTopicGrid.innerHTML = "";

  QA_TOPICS.forEach(topic => {
    const count = qaTests.filter(test => qaTopicFor(test) === topic.key).length;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "subject-card";
    card.disabled = count === 0 && topic.key !== "arithmetic";
    card.innerHTML = `<span>${topic.label}</span><strong>${count}</strong><small>${topic.description}</small>`;
    card.addEventListener("click", () => {
      if (topic.key === "arithmetic") {
        openArithmeticTopics();
      } else {
        openList("QA", topic.key);
      }
    });
    els.qaTopicGrid.appendChild(card);
  });
}

function renderArithmeticTopicCards() {
  const qaArithmeticTests = testsForRoute("topic").filter(test => subjectFor(test) === "QA" && qaTopicFor(test) === "arithmetic");
  els.testGrid.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "topic-grid";

  ARITHMETIC_TOPICS.forEach(topic => {
    const count = qaArithmeticTests.filter(test => arithmeticTopicFor(test) === topic.key).length;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "subject-card";
    card.innerHTML = `<span>${topic.label}</span><strong>${count}</strong><small>${topic.description}</small>`;
    card.addEventListener("click", () => openList("QA", "arithmetic", topic.key));
    grid.appendChild(card);
  });

  els.testGrid.appendChild(grid);
}

function renderTestCards() {
  const tests = testsForList();
  els.listCount.textContent = `${tests.length} test${tests.length === 1 ? "" : "s"}`;
  els.testGrid.innerHTML = "";

  if (!tests.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No tests available in this section yet.";
    els.testGrid.appendChild(empty);
    return;
  }

  tests.forEach(test => {
    const card = document.createElement("article");
    card.className = "test-card";

    const copy = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = test.title;
    copy.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "meta-row";
    [
      test.type,
      subjectFor(test),
      test.area,
      test.topic,
      test.minutes ? `${test.minutes} min` : "",
      test.questions ? `${test.questions} questions` : ""
    ].filter(Boolean).forEach(item => {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = item;
      meta.appendChild(pill);
    });
    copy.appendChild(meta);

    const link = document.createElement("a");
    link.className = "start-btn";
    link.href = test.file;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Start Test";

    card.appendChild(copy);
    card.appendChild(link);
    els.testGrid.appendChild(card);
  });
}

function handleHash() {
  const hash = window.location.hash.replace("#", "");

  if (!hash || hash === "home") {
    goHome();
    return;
  }

  if (hash === "topic-qa") {
    openQaTopics();
    return;
  }

  if (hash === "topic-qa-arithmetic") {
    openArithmeticTopics();
    return;
  }

  if (hash.startsWith("topic-qa-arithmetic-")) {
    const arithmeticTopicKey = hash.replace("topic-qa-arithmetic-", "");
    state.activeRoute = "topic";
    openList("QA", "arithmetic", arithmeticTopicKey);
    return;
  }

  if (hash.startsWith("topic-qa-")) {
    state.activeRoute = "topic";
    openList("QA", hash.replace("topic-qa-", ""));
    return;
  }

  if (ROUTES[hash]) {
    openRoute(hash);
  }
}

function init() {
  state.tests = Array.isArray(window.CAT_TESTS) ? window.CAT_TESTS : [];

  els.totalTests.textContent = state.tests.length;
  els.topicCount.textContent = `${countByType("Topic Wise Test")} tests`;
  els.areaCount.textContent = `${state.tests.length} tests`;
  els.sectionalCount.textContent = `${countByType("Sectional Test")} tests`;
  els.fullCount.textContent = `${countByType("Full Test")} tests`;

  document.querySelectorAll("[data-route]").forEach(button => {
    button.addEventListener("click", () => openRoute(button.dataset.route));
  });

  document.querySelectorAll("[data-back='home']").forEach(button => {
    button.addEventListener("click", goHome);
  });

  els.homeButton.addEventListener("click", goHome);
  els.qaTopicBackButton.addEventListener("click", () => openRoute("topic"));
  els.listBackButton.addEventListener("click", () => {
    if (state.arithmeticTopic) {
      openArithmeticTopics();
    } else if (state.qaTopic === "arithmetic") {
      openQaTopics();
    } else if (state.qaTopic) {
      openQaTopics();
    } else if (state.activeRoute === "full") {
      goHome();
    } else {
      openRoute(state.activeRoute);
    }
  });

  els.searchInput.addEventListener("input", event => {
    state.search = event.target.value;
    renderTestCards();
  });

  window.addEventListener("hashchange", handleHash);
  handleHash();
}

init();
