(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const sourcePath = params.get("src") || "";
  const title = params.get("title") || "CAT Test";
  const totalMinutes = Math.max(1, Number(params.get("minutes") || 40) || 40);

  const els = {
    title: document.getElementById("testTitle"),
    meta: document.getElementById("testMeta"),
    timer: document.getElementById("timeLeft"),
    qNumber: document.getElementById("qNumber"),
    qStatus: document.getElementById("qStatus"),
    area: document.getElementById("questionArea"),
    qbar: document.getElementById("qbar"),
    markBtn: document.getElementById("markBtn"),
    clearBtn: document.getElementById("clearBtn"),
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn"),
    submitBtn: document.getElementById("submitBtn")
  };

  let questions = [];
  let current = 0;
  let submitted = false;
  let secondsLeft = totalMinutes * 60;
  let timerId = null;
  const labels = ["A", "B", "C", "D", "E"];
  const responses = [];
  const marked = [];

  els.title.textContent = title;
  document.title = `${title} | CAT Prep`;
  setTimerText();

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function isBlank(value) {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    return !text || text.toLowerCase() === "undefined" || text.toLowerCase() === "null";
  }

  function pick() {
    for (const value of arguments) {
      if (!isBlank(value)) return value;
    }
    return "";
  }

  function stripHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = String(html ?? "");
    return div.textContent.replace(/\s+/g, " ").trim();
  }

  function safeHtml(html) {
    if (isBlank(html)) return "";
    const template = document.createElement("template");
    template.innerHTML = String(html);
    template.content.querySelectorAll("script, iframe, object, embed, style, link, meta").forEach(node => node.remove());
    template.content.querySelectorAll("*").forEach(node => {
      [...node.attributes].forEach(attr => {
        const name = attr.name.toLowerCase();
        const value = String(attr.value || "").trim().toLowerCase();
        if (name.startsWith("on") || value.startsWith("javascript:")) node.removeAttribute(attr.name);
      });
    });
    return template.innerHTML.trim();
  }

  function normalizeText(value) {
    return stripHtml(value).toLowerCase().replace(/[,₹ rs.%]/g, "").replace(/\s+/g, "").trim();
  }

  function showNotice(headline, lines, isError) {
    els.qNumber.textContent = isError ? "Test content missing" : "Loading";
    els.qStatus.textContent = isError ? "Action required" : "Please wait";
    els.area.innerHTML = `
      <div class="notice">
        <h2>${escapeHtml(headline)}</h2>
        ${(Array.isArray(lines) ? lines : [lines]).map(line => `<p>${line}</p>`).join("")}
      </div>`;
    els.qbar.innerHTML = "";
    [els.markBtn, els.clearBtn, els.prevBtn, els.nextBtn, els.submitBtn].forEach(btn => btn.disabled = true);
  }

  function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function findMatchingBracket(text, startIndex) {
    const open = text[startIndex];
    const close = open === "[" ? "]" : "}";
    let depth = 0;
    let quote = null;
    let escaped = false;
    let lineComment = false;
    let blockComment = false;

    for (let i = startIndex; i < text.length; i += 1) {
      const ch = text[i];
      const next = text[i + 1];
      if (lineComment) { if (ch === "\n") lineComment = false; continue; }
      if (blockComment) { if (ch === "*" && next === "/") { blockComment = false; i += 1; } continue; }
      if (quote) {
        if (escaped) { escaped = false; continue; }
        if (ch === "\\") { escaped = true; continue; }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === "/" && next === "/") { lineComment = true; i += 1; continue; }
      if (ch === "/" && next === "*") { blockComment = true; i += 1; continue; }
      if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
      if (ch === open) depth += 1;
      else if (ch === close) {
        depth -= 1;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  function evaluateLiteral(source) {
    try { return JSON.parse(source); } catch (_) { /* continue */ }
    return Function(`"use strict"; return (${source});`)();
  }

  function parseArraySource(source) {
    try {
      const value = evaluateLiteral(source);
      return Array.isArray(value) ? value : null;
    } catch (_) {
      return null;
    }
  }

  const questionKeys = [
    "question", "questionText", "question_text", "questionHtml", "questionHTML", "question_content", "questionContent",
    "text", "prompt", "stem", "stemText", "stem_html", "body", "content", "statement", "problem", "ques", "q"
  ];
  const passageKeys = ["passage", "caselet", "set", "context", "paragraph", "stimulus", "directions", "direction", "instruction", "instructions", "dir"];
  const optionKeys = ["options", "choices", "answers", "optionList", "answerOptions", "opts", "opt", "o"];
  const answerKeys = ["typedAnswer", "correctAnswer", "correct_answer", "answer", "correct", "correctOption", "correct_option", "correctIndex", "correct_index", "key", "ans"];

  function hasAnyKey(obj, keys) {
    return keys.some(key => Object.prototype.hasOwnProperty.call(obj, key));
  }

  function arrayLooksLikeQuestions(arr) {
    if (!Array.isArray(arr) || !arr.length) return false;
    return arr.some(item => {
      if (Array.isArray(item)) return item.some(v => typeof v === "string" && stripHtml(v).length > 10);
      if (!item || typeof item !== "object") return false;
      return hasAnyKey(item, questionKeys) || hasAnyKey(item, passageKeys) || hasAnyKey(item, optionKeys) || hasAnyKey(item, answerKeys) ||
        Object.keys(item).some(k => /^(option|opt)[a-e1-5]$|^[a-e]$/i.test(k));
    });
  }

  function extractScripts(html) {
    const scripts = [];
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      doc.querySelectorAll("script").forEach(script => scripts.push(script.textContent || ""));
    } catch (_) { /* ignore */ }
    scripts.push(html);
    return scripts;
  }

  function extractQuestionArrayFromObjects(text, candidates) {
    const patterns = [
      /(?:const|let|var)?\s*(?:window\.)?(?:testData|quizData|data|paper|exam|test|CAT_TEST)\s*=\s*\{/gi,
      /\{\s*["']?(?:questions|questionBank|items|data)["']?\s*:/gi
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text))) {
        const start = text.indexOf("{", match.index);
        const end = findMatchingBracket(text, start);
        if (start >= 0 && end > start) {
          try {
            const obj = evaluateLiteral(text.slice(start, end + 1));
            const possible = obj && (obj.questions || obj.questionBank || obj.items || obj.data || obj.quizQuestions);
            if (Array.isArray(possible)) candidates.push(JSON.stringify(possible));
          } catch (_) { /* ignore */ }
        }
      }
    }
  }

  function extractQuestionsFromScript(html) {
    const names = ["questions", "testQuestions", "quizQuestions", "questionBank", "quizData", "QUESTIONS", "QuestionData", "items", "testItems", "data"];
    const candidates = [];
    const texts = extractScripts(html);

    for (const text of texts) {
      extractQuestionArrayFromObjects(text, candidates);
      for (const name of names) {
        const pattern = new RegExp(`(?:const|let|var)?\\s*(?:window\\.)?${escapeRegExp(name)}\\s*=\\s*\\[`, "gi");
        let match;
        while ((match = pattern.exec(text))) {
          const start = text.indexOf("[", match.index);
          const end = findMatchingBracket(text, start);
          if (start >= 0 && end > start) candidates.push(text.slice(start, end + 1));
        }
      }
    }

    for (const text of texts) {
      let searchFrom = 0;
      while (searchFrom < text.length) {
        const start = text.indexOf("[", searchFrom);
        if (start === -1) break;
        const preview = text.slice(start, Math.min(text.length, start + 4000));
        if (/question|ques|q\s*:|options|opts|choices|typedAnswer|correct|answer|passage|direction|solution/i.test(preview)) {
          const end = findMatchingBracket(text, start);
          if (end > start) candidates.push(text.slice(start, end + 1));
        }
        searchFrom = start + 1;
      }
    }

    for (const candidate of candidates) {
      const arr = parseArraySource(candidate);
      if (arrayLooksLikeQuestions(arr)) return arr;
    }
    return [];
  }

  function cleanDomQuestionText(text) {
    return String(text || "")
      .replace(/\bQuestion\s+\d+\s*(of\s+\d+)?\b/ig, "")
      .replace(/\b(Time Left|Question Bar|Current|Answered|Marked|Submit|Save & Next|Previous|Clear Response|Mark for Review).*/ig, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractQuestionsFromDom(html) {
    let doc;
    try { doc = new DOMParser().parseFromString(html, "text/html"); } catch (_) { return []; }
    doc.querySelectorAll("script, style, nav, header, footer, .qbar, .question-bar, .timer, .navrow, .legend, button").forEach(el => el.remove());
    const selectors = [
      ".question", ".question-card", ".question-block", ".quiz-question", ".q-item", ".qblock", ".problem", ".question-container", "[data-question]"
    ];
    const blocks = [];
    selectors.forEach(sel => doc.querySelectorAll(sel).forEach(el => blocks.push(el)));
    const unique = [...new Set(blocks)].filter(el => cleanDomQuestionText(el.textContent).length > 25 && !/^undefined$/i.test(cleanDomQuestionText(el.textContent)));

    const parsed = unique.map((el, index) => {
      const optionNodes = [...el.querySelectorAll("label, .option, .choice, li")].filter(node => cleanDomQuestionText(node.textContent).length > 0);
      const options = optionNodes.map(node => node.innerHTML).filter(Boolean);
      optionNodes.forEach(node => node.remove());
      const questionNode = el.querySelector(".question-text, .qtext, .stem, .prompt, .statement, .question-title") || el;
      const questionText = safeHtml(questionNode.innerHTML);
      const answer = el.getAttribute("data-answer") || el.getAttribute("data-correct") || "";
      return { no: index + 1, question: questionText, options, answer, type: options.length ? "mcq" : "text" };
    }).filter(q => cleanDomQuestionText(q.question).length > 20 && !/^undefined$/i.test(cleanDomQuestionText(q.question)));

    if (parsed.length) return parsed;

    // Last-resort plain text splitter for simple HTML handouts.
    const bodyText = cleanDomQuestionText(doc.body ? doc.body.textContent : "");
    const parts = bodyText.split(/(?=\b(?:Q\.?|Question)\s*\d+[).:-])/i).filter(p => p.trim().length > 30);
    return parts.map((part, i) => ({ no: i + 1, question: escapeHtml(part.trim()), type: "text", options: [] })).filter(q => stripHtml(q.question).length > 30);
  }

  function extractQuestions(html) {
    const scriptQuestions = extractQuestionsFromScript(html);
    if (scriptQuestions.length) return scriptQuestions;
    return extractQuestionsFromDom(html);
  }

  function valueByKeys(obj, keys) {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && !isBlank(obj[key])) return obj[key];
    }
    return "";
  }

  function normalizeOptions(q) {
    let value = valueByKeys(q, optionKeys);
    let options = [];
    if (Array.isArray(value)) options = value.map(v => String(v ?? "")).filter(v => !isBlank(v));
    else if (value && typeof value === "object") options = Object.values(value).map(v => String(v ?? "")).filter(v => !isBlank(v));

    if (!options.length) {
      const collected = [];
      ["A", "B", "C", "D", "E", "a", "b", "c", "d", "e"].forEach(k => { if (!isBlank(q[k])) collected.push(q[k]); });
      ["optionA", "optionB", "optionC", "optionD", "optionE", "optA", "optB", "optC", "optD", "optE", "option1", "option2", "option3", "option4", "option5", "opt1", "opt2", "opt3", "opt4", "opt5"].forEach(k => { if (!isBlank(q[k])) collected.push(q[k]); });
      options = collected.map(v => String(v ?? "")).filter(v => !isBlank(v));
    }
    return options;
  }

  function normalizeAnswer(q, type, options) {
    if (type === "text") return pick(valueByKeys(q, answerKeys), q.typedAnswer, q.correctAnswer, q.answer, q.correct, q.key);
    const raw = valueByKeys(q, answerKeys);
    if (raw === undefined || raw === null || raw === "") return null;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      if (raw >= 0 && raw < options.length) return raw;
      if (raw >= 1 && raw <= options.length) return raw - 1;
    }
    const text = String(raw).trim();
    const letterIndex = labels.findIndex(l => l.toLowerCase() === text.toLowerCase().replace(/[^a-z]/g, ""));
    if (letterIndex >= 0 && letterIndex < options.length) return letterIndex;
    const numeric = Number(text);
    if (Number.isFinite(numeric)) {
      if (numeric >= 0 && numeric < options.length) return numeric;
      if (numeric >= 1 && numeric <= options.length) return numeric - 1;
    }
    const byText = options.findIndex(option => normalizeText(option) === normalizeText(text));
    return byText >= 0 ? byText : null;
  }

  function normalizeArrayQuestion(row, index) {
    const strings = row.filter(v => typeof v === "string" && !isBlank(v));
    if (!strings.length) return null;
    const longest = strings.slice().sort((a, b) => stripHtml(b).length - stripHtml(a).length)[0];
    const options = row.find(v => Array.isArray(v)) || strings.filter(v => v !== longest && stripHtml(v).length < 200).slice(0, 5);
    const ans = row.find(v => typeof v === "number") ?? "";
    return normalizeQuestion({ no: index + 1, question: longest, options, answer: ans }, index);
  }

  function normalizeQuestion(q, index) {
    if (Array.isArray(q)) return normalizeArrayQuestion(q, index);
    if (!q || typeof q !== "object") return null;

    let options = normalizeOptions(q);
    let rawType = String(q.type || q.questionType || q.qtype || "").toLowerCase();
    let questionRaw = valueByKeys(q, questionKeys);
    let directionRaw = valueByKeys(q, ["direction", "directions", "instructions", "instruction", "dir"]);
    let passageRaw = valueByKeys(q, ["passage", "caselet", "set", "context", "paragraph", "stimulus"]);

    if (isBlank(questionRaw)) {
      const stringValues = Object.entries(q)
        .filter(([key, value]) => typeof value === "string" && !isBlank(value) && !answerKeys.includes(key))
        .map(([, value]) => value)
        .sort((a, b) => stripHtml(b).length - stripHtml(a).length);
      questionRaw = stringValues.find(v => stripHtml(v).length > 15) || "";
    }

    if (!options.length) {
      const textValues = Object.entries(q)
        .filter(([key, value]) => typeof value === "string" && value !== questionRaw && !questionKeys.includes(key) && !passageKeys.includes(key) && !answerKeys.includes(key))
        .map(([, value]) => value)
        .filter(value => stripHtml(value).length > 0 && stripHtml(value).length < 200)
        .slice(0, 5);
      if (textValues.length >= 2) options = textValues;
    }

    const type = /text|tita|numeric|integer|input|blank/.test(rawType) || !options.length ? "text" : "mcq";
    const direction = safeHtml(directionRaw);
    const passage = safeHtml(passageRaw);
    const question = safeHtml(questionRaw);
    const textCheck = stripHtml(`${direction} ${passage} ${question}`).trim();
    if (isBlank(textCheck) || /^undefined$/i.test(textCheck)) return null;

    return {
      no: Number(q.no || q.qno || q.number || q.id || index + 1),
      source: stripHtml(pick(q.source, q.topic, q.chapter, q.tag, q.level)),
      type,
      direction,
      passage,
      question: question || "<p>Question text is not available in this uploaded file.</p>",
      options: options.map(option => safeHtml(option)),
      answer: normalizeAnswer(q, type, options),
      typedAnswer: pick(valueByKeys(q, answerKeys), q.typedAnswer, q.correctAnswer, q.answer, q.correct, q.key),
      solution: safeHtml(pick(q.solution, q.explanation, q.sol, q.answerExplanation, q.reason))
    };
  }

  function correctText(q) {
    if (q.type === "mcq") {
      if (q.answer === null || q.answer === undefined) return "Not provided";
      return `(${labels[q.answer] || q.answer + 1}) ${stripHtml(q.options[q.answer] || "")}`;
    }
    return isBlank(q.typedAnswer) ? "Not provided" : stripHtml(q.typedAnswer);
  }

  function bindAnswerControls() {
    els.area.querySelectorAll("[name='answer']").forEach(input => {
      input.addEventListener("input", () => { responses[current] = input.type === "radio" ? input.value : input.value.trim(); renderBar(); });
      input.addEventListener("change", () => { responses[current] = input.type === "radio" ? input.value : input.value.trim(); renderBar(); });
    });
  }

  function saveCurrent() {
    if (submitted || !questions.length) return;
    const radio = els.area.querySelector("input[name='answer']:checked");
    const typed = els.area.querySelector("input.typed-answer");
    if (radio) responses[current] = radio.value;
    else if (typed) responses[current] = typed.value.trim();
  }

  function renderBar() {
    els.qbar.innerHTML = questions.map((_, index) => {
      const classes = ["qbtn"];
      if (index === current) classes.push("current");
      if (!isBlank(responses[index])) classes.push("answered");
      if (marked[index]) classes.push("marked");
      return `<button class="${classes.join(" ")}" type="button" data-go="${index}">${index + 1}</button>`;
    }).join("");
    els.qbar.querySelectorAll("[data-go]").forEach(btn => btn.addEventListener("click", () => goTo(Number(btn.dataset.go))));
  }

  function controlFor(q) {
    if (q.type === "mcq") {
      return `<div class="options">${q.options.map((option, index) => `
        <label class="option">
          <input type="radio" name="answer" value="${index}" ${responses[current] === String(index) ? "checked" : ""} ${submitted ? "disabled" : ""}>
          <span class="label">${labels[index] || index + 1}.</span>
          <span>${option}</span>
        </label>`).join("")}</div>`;
    }
    return `<input class="typed-answer" name="answer" type="text" autocomplete="off" placeholder="Type your answer" value="${escapeHtml(responses[current] || "")}" ${submitted ? "disabled" : ""}>`;
  }

  function renderQuestion() {
    const q = questions[current];
    els.qNumber.textContent = `Question ${current + 1} of ${questions.length}`;
    els.qStatus.textContent = q.source || (q.type === "text" ? "Numeric entry" : "MCQ");
    els.area.innerHTML = `
      ${q.direction ? `<div class="block">${q.direction}</div>` : ""}
      ${q.passage ? `<div class="block">${q.passage}</div>` : ""}
      <div class="question-text">${q.question}</div>
      ${controlFor(q)}
      <div id="answerNote" class="answer-note"></div>
      <div id="solutionBox" class="solution"><h3>Solution</h3><p><strong>Correct Answer:</strong> ${escapeHtml(correctText(q))}</p><div>${q.solution || "Solution not provided in this file."}</div></div>`;
    els.prevBtn.disabled = current === 0;
    els.nextBtn.textContent = current === questions.length - 1 ? "Save" : "Save & Next";
    if (submitted) showCurrentReview();
    bindAnswerControls();
    renderBar();
  }

  function goTo(index) {
    if (index < 0 || index >= questions.length) return;
    saveCurrent();
    current = index;
    renderQuestion();
  }

  function clearResponse() { if (!submitted) { responses[current] = ""; renderQuestion(); } }
  function markForReviewNext() { if (!submitted) { saveCurrent(); marked[current] = true; if (current < questions.length - 1) current += 1; renderQuestion(); } }

  function isCorrect(q, answer) {
    if (isBlank(answer)) return null;
    if (q.type === "mcq") return q.answer !== null && q.answer !== undefined && Number(answer) === Number(q.answer);
    if (isBlank(q.typedAnswer)) return false;
    return normalizeText(answer) === normalizeText(q.typedAnswer);
  }

  function showCurrentReview() {
    const q = questions[current];
    const note = document.getElementById("answerNote");
    const solution = document.getElementById("solutionBox");
    const result = isCorrect(q, responses[current]);
    solution.style.display = "block";
    if (result === null) { note.className = "answer-note muted"; note.textContent = `Unattempted. Correct answer: ${correctText(q)}`; }
    else if (result) { note.className = "answer-note ok"; note.textContent = "Correct."; }
    else { note.className = "answer-note bad"; note.textContent = `Wrong. Correct answer: ${correctText(q)}`; }
  }

  function submitTest() {
    if (submitted || !questions.length) return;
    saveCurrent();
    submitted = true;
    clearInterval(timerId);
    let correct = 0, wrong = 0, unattempted = 0;
    questions.forEach((q, i) => { const result = isCorrect(q, responses[i]); if (result === null) unattempted += 1; else if (result) correct += 1; else wrong += 1; });
    const score = correct * 3 - wrong;
    els.area.insertAdjacentHTML("afterbegin", `
      <div class="result">
        <h2>Test Submitted</h2>
        <div class="score-grid">
          <div class="score-card"><small>Score</small><strong>${score}</strong></div>
          <div class="score-card"><small>Correct</small><strong>${correct}</strong></div>
          <div class="score-card"><small>Wrong</small><strong>${wrong}</strong></div>
          <div class="score-card"><small>Attempted</small><strong>${correct + wrong}</strong></div>
          <div class="score-card"><small>Unattempted</small><strong>${unattempted}</strong></div>
        </div>
      </div>`);
    showCurrentReview();
    renderBar();
    [els.markBtn, els.clearBtn].forEach(btn => btn.disabled = true);
    els.area.scrollTop = 0;
  }

  function setTimerText() {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    els.timer.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function startTimer() {
    timerId = setInterval(() => {
      secondsLeft -= 1;
      setTimerText();
      if (secondsLeft <= 0) submitTest();
    }, 1000);
  }

  function looksLikePortalShell(html) {
    const text = String(html || "").slice(0, 3000);
    return /CAT Prep\s+with Ajeet Sir|id=["']dashboardView|window\.CAT_TESTS/i.test(text) && !/const\s+questions|questionBank|quizQuestions/i.test(text);
  }

  function uniqueList(items) {
    return [...new Set(items.filter(Boolean).map(item => String(item)))];
  }

  function sourcePathCandidates(path) {
    const raw = String(path || "");
    let decoded = raw;
    try { decoded = decodeURIComponent(raw); } catch (_) { /* keep raw */ }

    const variants = [raw, decoded];
    const add = value => { if (value && !variants.includes(value)) variants.push(value); };

    for (const base of [raw, decoded]) {
      if (!base) continue;
      add(base.replace(/\/(\d+)\.(?=[A-Za-z])/g, "/$1. "));
      add(base.replace(/\/(\d+)\.\s+(?=[A-Za-z])/g, "/$1."));
      add(base.replace(/2\.Ratio Proportion/gi, "2. Ratio Proportion"));
      add(base.replace(/2\.\s+Ratio Proportion/gi, "2.Ratio Proportion"));
      add(base.replace(/Ratio\s+Proportion\s+Variation\s+Partnership\s+Test\s*-\s*/gi, "Ratio Proportion Variation Partnership Test -"));
      add(base.replace(/\s+-\s+(\d+)(\.html?)$/i, " -$1$2"));
      add(base.replace(/\s+Test\s+-([0-9])/i, " Test - $1"));
      add(base.replace(/\s+Test\s+-\s+([0-9])/i, " Test -$1"));
      add(base.replace(/\s+/g, " ").trim());
    }

    return uniqueList(variants);
  }

  async function fetchHtmlCandidate(path) {
    const url = new URL(path, window.location.href);
    const response = await fetch(url.href, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { path, url: url.href, html: await response.text() };
  }

  async function init() {
    if (!sourcePath) {
      showNotice("Test file path missing", ["This test card does not contain a file path in <code>tests-data.js</code>.", "Please check the entry for this test and add the correct HTML path."], true);
      return;
    }

    const tried = [];
    let lastError = null;
    let lastLoaded = null;

    for (const candidate of sourcePathCandidates(sourcePath)) {
      tried.push(candidate);
      try {
        const loaded = await fetchHtmlCandidate(candidate);
        const parsed = extractQuestions(loaded.html).map(normalizeQuestion).filter(Boolean);
        if (parsed.length) {
          lastLoaded = loaded;
          questions = parsed;
          break;
        }
        lastLoaded = loaded;
      } catch (error) {
        lastError = error;
      }
    }

    if (!questions.length) {
      if (lastLoaded) {
        const shellMessage = looksLikePortalShell(lastLoaded.html)
          ? "This path is returning the portal home page, so the test HTML file is probably missing at this exact folder/filename."
          : "This HTML file opened, but it does not contain question data in a readable format.";
        showNotice("No readable questions found in this test file", [
          `File checked: <code>${escapeHtml(lastLoaded.path || sourcePath)}</code>`,
          shellMessage,
          `Also tried: <code>${escapeHtml(tried.slice(0, 6).join(" | "))}</code>`,
          "Most likely this specific HTML file is not the original question file, or the folder/filename in <code>tests-data.js</code> does not exactly match the file present in GitHub."
        ], true);
        els.meta.textContent = `0 Questions | ${totalMinutes} Minutes | Source file has no readable question content`;
        return;
      }

      showNotice("Unable to load this test file", [
        `File path: <code>${escapeHtml(sourcePath)}</code>`,
        `Reason: <code>${escapeHtml(lastError ? lastError.message : "File not found")}</code>`,
        `Also tried: <code>${escapeHtml(tried.slice(0, 6).join(" | "))}</code>`,
        "Check that the file is present in the same path inside the GitHub <code>tests</code> folder and the filename spelling is exactly the same."
      ], true);
      els.meta.textContent = `0 Questions | ${totalMinutes} Minutes | File not loaded`;
      return;
    }

    questions.forEach(() => { responses.push(""); marked.push(false); });
    els.meta.textContent = `${questions.length} Questions | ${totalMinutes} Minutes | +3 correct, -1 wrong | MCQ and numeric entry`;
    [els.markBtn, els.clearBtn, els.prevBtn, els.nextBtn, els.submitBtn].forEach(btn => btn.disabled = false);
    renderQuestion();
    startTimer();
  }

  els.prevBtn.addEventListener("click", () => goTo(current - 1));
  els.nextBtn.addEventListener("click", () => { saveCurrent(); if (current < questions.length - 1) goTo(current + 1); else renderQuestion(); });
  els.clearBtn.addEventListener("click", clearResponse);
  els.markBtn.addEventListener("click", markForReviewNext);
  els.submitBtn.addEventListener("click", submitTest);

  init();
})();
