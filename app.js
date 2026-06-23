const state = {
  tests: [],
  type: "all",
  area: "all",
  topic: "all",
  search: ""
};

const els = {
  totalTests: document.getElementById("totalTests"),
  countAll: document.getElementById("countAll"),
  countTopic: document.getElementById("countTopic"),
  countSectional: document.getElementById("countSectional"),
  countFull: document.getElementById("countFull"),
  searchInput: document.getElementById("searchInput"),
  areaFilters: document.getElementById("areaFilters"),
  topicFilters: document.getElementById("topicFilters"),
  resultTitle: document.getElementById("resultTitle"),
  resultCount: document.getElementById("resultCount"),
  testGrid: document.getElementById("testGrid"),
  quickCards: Array.from(document.querySelectorAll(".quick-card"))
};

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function countByType(type) {
  return state.tests.filter(test => test.type === type).length;
}

function makeChip(label, value, key) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `chip ${state[key] === value ? "active" : ""}`;
  btn.textContent = label;
  btn.addEventListener("click", () => {
    state[key] = value;
    render();
  });
  return btn;
}

function renderFilters() {
  els.areaFilters.innerHTML = "";
  els.areaFilters.appendChild(makeChip("All", "all", "area"));
  uniq(state.tests.map(test => test.area)).forEach(area => {
    els.areaFilters.appendChild(makeChip(area, area, "area"));
  });

  els.topicFilters.innerHTML = "";
  els.topicFilters.appendChild(makeChip("All", "all", "topic"));
  uniq(state.tests.map(test => test.topic)).forEach(topic => {
    els.topicFilters.appendChild(makeChip(topic, topic, "topic"));
  });
}

function currentTitle() {
  if (state.type !== "all") return state.type;
  if (state.area !== "all") return `${state.area} Tests`;
  if (state.topic !== "all") return `${state.topic} Tests`;
  return "All Tests";
}

function filteredTests() {
  const term = state.search.trim().toLowerCase();
  return state.tests.filter(test => {
    const typeOk = state.type === "all" || test.type === state.type;
    const areaOk = state.area === "all" || test.area === state.area;
    const topicOk = state.topic === "all" || test.topic === state.topic;
    const text = `${test.title} ${test.area} ${test.topic} ${test.type}`.toLowerCase();
    const searchOk = !term || text.includes(term);
    return typeOk && areaOk && topicOk && searchOk;
  });
}

function renderCards() {
  const tests = filteredTests();
  els.resultTitle.textContent = currentTitle();
  els.resultCount.textContent = `${tests.length} test${tests.length === 1 ? "" : "s"}`;
  els.testGrid.innerHTML = "";

  if (!tests.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No tests match these filters.";
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
    [test.type, test.area, test.topic, test.minutes ? `${test.minutes} min` : "", test.questions ? `${test.questions} questions` : ""]
      .filter(Boolean)
      .forEach(item => {
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

function renderQuickCards() {
  els.quickCards.forEach(card => {
    card.classList.toggle("active", card.dataset.filterType === state.type);
  });
}

function render() {
  renderQuickCards();
  renderFilters();
  renderCards();
}

function init() {
  state.tests = Array.isArray(window.CAT_TESTS) ? window.CAT_TESTS : [];

  els.totalTests.textContent = state.tests.length;
  els.countAll.textContent = state.tests.length;
  els.countTopic.textContent = countByType("Topic Wise Test");
  els.countSectional.textContent = countByType("Sectional Test");
  els.countFull.textContent = countByType("Full Test");

  els.quickCards.forEach(card => {
    card.addEventListener("click", () => {
      state.type = card.dataset.filterType;
      render();
    });
  });

  els.searchInput.addEventListener("input", event => {
    state.search = event.target.value;
    renderCards();
  });

  render();
}

init();
