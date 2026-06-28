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
    template.content.querySelectorAll("script, iframe, object, embed, style").forEach(node => node.remove());
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

      if (lineComment) {
        if (ch === "\n") lineComment = false;
        continue;
      }
      if (blockComment) {
        if (ch === "*" && next === "/") { blockComment = false; i += 1; }
        continue;
      }
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

  function arrayLooksLikeQuestions(arr) {
    if (!Array.isArray(arr) || !arr.length) return false;
    return arr.some(item => {
      if (!item || typeof item !== "object") return false;
      return ["question", "questionText", "text", "prompt", "stem", "body", "passage", "direction", "options", "choices", "typedAnswer"].some(key => Object.prototype.hasOwnProperty.call(item, key));
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

  function extractQuestions(html) {
    const names = ["questions", "testQuestions", "quizQuestions", "questionBank", "quizData", "QUESTIONS", "QuestionData"];
    const candidates = [];
    const texts = extractScripts(html);

    for (const text of texts) {
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
        const preview = text.slice(start, Math.min(text.length, start + 5000));
        if (/question|options|choices|typedAnswer|passage|direction/i.test(preview)) {
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

  function normalizeOptions(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => String(v ?? "")).filter(v => !isBlank(v));
    if (typeof value === "object") return Object.values(value).map(v => String(v ?? "")).filter(v => !isBlank(v));
    return [];
  }

  function normalizeAnswer(q, type, options) {
    if (type === "text") {
      return pick(q.typedAnswer, q.correctAnswer, q.answer, q.correct, q.key);
    }

    const raw = q.answer ?? q.correct ?? q.correctAnswer ?? q.correctOption ?? q.correct_option ?? q.key;
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

  function normalizeQuestion(q, index) {
    if (!q || typeof q !== "object") return null;
    const options = normalizeOptions(q.options || q.choices || q.answers || q.optionList);
    const rawType = String(q.type || q.questionType || "").toLowerCase();
    const type = /text|tita|numeric|integer|input|blank/.test(rawType) || !options.length ? "text" : "mcq";
    const direction = safeHtml(pick(q.direction, q.instructions, q.instruction, q.dir));
    const passage = safeHtml(pick(q.passage, q.caselet, q.set, q.context));
    const question = safeHtml(pick(q.question, q.questionText, q.text, q.prompt, q.stem, q.body, q.content));

    if (isBlank(question) && isBlank(passage) && isBlank(direction)) return null;

    return {
      no: Number(q.no || q.qno || q.number || index + 1),
      source: stripHtml(pick(q.source, q.topic, q.chapter, q.tag)),
      type,
      direction,
      passage,
      question: question || "<p>Question text is not available in this uploaded file.</p>",
      options: options.map(option => safeHtml(option)),
      answer: normalizeAnswer(q, type, options),
      typedAnswer: pick(q.typedAnswer, q.correctAnswer, q.answer, q.correct, q.key),
      solution: safeHtml(pick(q.solution, q.explanation, q.sol, q.answerExplanation))
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
      input.addEventListener("input", () => {
        responses[current] = input.type === "radio" ? input.value : input.value.trim();
        renderBar();
      });
      input.addEventListener("change", () => {
        responses[current] = input.type === "radio" ? input.value : input.value.trim();
        renderBar();
      });
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
    els.qbar.querySelectorAll("[data-go]").forEach(btn => {
      btn.addEventListener("click", () => goTo(Number(btn.dataset.go)));
    });
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

  function clearResponse() {
    if (submitted) return;
    responses[current] = "";
    renderQuestion();
  }

  function markForReviewNext() {
    if (submitted) return;
    saveCurrent();
    marked[current] = true;
    if (current < questions.length - 1) current += 1;
    renderQuestion();
  }

  function isCorrect(q, answer) {
    if (isBlank(answer)) return null;
    if (q.type === "mcq") {
      if (q.answer === null || q.answer === undefined) return false;
      return Number(answer) === Number(q.answer);
    }
    if (isBlank(q.typedAnswer)) return false;
    return normalizeText(answer) === normalizeText(q.typedAnswer);
  }

  function showCurrentReview() {
    const q = questions[current];
    const note = document.getElementById("answerNote");
    const solution = document.getElementById("solutionBox");
    const result = isCorrect(q, responses[current]);
    solution.style.display = "block";
    if (result === null) {
      note.className = "answer-note muted";
      note.textContent = `Unattempted. Correct answer: ${correctText(q)}`;
    } else if (result) {
      note.className = "answer-note ok";
      note.textContent = "Correct.";
    } else {
      note.className = "answer-note bad";
      note.textContent = `Wrong. Correct answer: ${correctText(q)}`;
    }
  }

  function submitTest() {
    if (submitted || !questions.length) return;
    saveCurrent();
    submitted = true;
    clearInterval(timerId);
    let correct = 0, wrong = 0, unattempted = 0;
    questions.forEach((q, i) => {
      const result = isCorrect(q, responses[i]);
      if (result === null) unattempted += 1;
      else if (result) correct += 1;
      else wrong += 1;
    });
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

  async function init() {
    if (!sourcePath) {
      showNotice("Test file path missing", ["This test card does not contain a file path in <code>tests-data.js</code>.", "Please check the entry for this test and add the correct HTML path."], true);
      return;
    }

    try {
      const url = new URL(sourcePath, window.location.href);
      const response = await fetch(url.href, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      questions = extractQuestions(html).map(normalizeQuestion).filter(Boolean);

      if (!questions.length) {
        showNotice("No valid questions found in this HTML file", [
          `File checked: <code>${escapeHtml(sourcePath)}</code>`,
          "The portal entry exists, but this particular HTML file does not expose a usable question array such as <code>const questions = [...]</code>.",
          "Please re-upload the original/correct HTML test file for this test. After that, this console will show the questions automatically."
        ], true);
        els.meta.textContent = `0 Questions | ${totalMinutes} Minutes | Content missing in source HTML`;
        return;
      }

      questions.forEach(() => { responses.push(""); marked.push(false); });
      els.meta.textContent = `${questions.length} Questions | ${totalMinutes} Minutes | +3 correct, -1 wrong | MCQ and numeric entry`;
      [els.markBtn, els.clearBtn, els.prevBtn, els.nextBtn, els.submitBtn].forEach(btn => btn.disabled = false);
      renderQuestion();
      startTimer();
    } catch (error) {
      showNotice("Unable to load this test file", [
        `File path: <code>${escapeHtml(sourcePath)}</code>`,
        `Reason: <code>${escapeHtml(error.message)}</code>`,
        "Check that the file is present in the same path inside the GitHub <code>tests</code> folder and the filename spelling is exactly the same."
      ], true);
      els.meta.textContent = `0 Questions | ${totalMinutes} Minutes | File not loaded`;
    }
  }

  els.prevBtn.addEventListener("click", () => goTo(current - 1));
  els.nextBtn.addEventListener("click", () => {
    saveCurrent();
    if (current < questions.length - 1) goTo(current + 1);
    else renderQuestion();
  });
  els.clearBtn.addEventListener("click", clearResponse);
  els.markBtn.addEventListener("click", markForReviewNext);
  els.submitBtn.addEventListener("click", submitTest);

  init();
})();
