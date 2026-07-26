const REPO_OWNER = "ajeet11ims-prog";
const REPO_NAME = "cat-prep-portal";
const BRANCH = "main";
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;

const $ = (id) => document.getElementById(id);
const state = {
  tests: Array.isArray(window.CAT_TESTS) ? window.CAT_TESTS : [],
  folders: Array.isArray(window.CAT_FOLDERS) ? window.CAT_FOLDERS : [],
  selectedPath: ["Topic Test", "QA", "Arithmetic", "3.Profit & Loss"],
  selectedFile: null,
  selectedFiles: [],
  userSelectedPath: false,
};

const presetPaths = [
  ["Topic Test", "QA", "Arithmetic", "1.Percentage"],
  ["Topic Test", "QA", "Arithmetic", "2.Ratio Proportion"],
  ["Topic Test", "QA", "Arithmetic", "3.Profit & Loss"],
  ["Topic Test", "QA", "Arithmetic", "4.SI & CI"],
  ["Topic Test", "QA", "Arithmetic", "5. Average"],
  ["Topic Test", "QA", "Arithmetic", "6. Mixture & Alligation"],
  ["Topic Test", "QA", "Arithmetic", "7. Time & Work"],
  ["Topic Test", "QA", "Arithmetic", "8.Time Speed Distance"],
  ["Topic Test", "LRDI", "DI"],
  ["Topic Test", "LRDI", "LR"],
  ["PYQ", "Topic Wise", "QA", "Arithmetic"],
  ["Daily LRDI"],
];

function setStatus(message, type = "normal") {
  const el = $("status");
  el.textContent = message;
  el.className = `status-box ${type === "success" ? "success" : type === "error" ? "error" : ""}`;
  $("statMode").textContent = type === "success" ? "Done" : type === "error" ? "Error" : "Ready";
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function encodePath(path) {
  return String(path).split("/").map(encodeURIComponent).join("/");
}

function base64ToUtf8(base64) {
  const clean = String(base64 || "").replace(/\n/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes).replace(/^\uFEFF/, "");
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

async function githubGet(path, token) {
  const res = await fetch(`${API_BASE}/${encodePath(path)}?ref=${BRANCH}`, {
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (res.status === 404) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `${res.status} ${res.statusText}`);
  return data;
}

async function githubPut(path, content, message, token, sha) {
  const body = { message, content: utf8ToBase64(content), branch: BRANCH };
  if (sha) body.sha = sha;
  const res = await fetch(`${API_BASE}/${encodePath(path)}`, {
    method: "PUT",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `${res.status} ${res.statusText}`);
  return data;
}

function extractWindowArray(jsText, name) {
  const marker = `window.${name}`;
  const text = String(jsText || "");
  const startMarker = text.indexOf(marker);
  if (startMarker < 0) return [];
  const start = text.indexOf("[", startMarker);
  if (start < 0) return [];
  let depth = 0, inString = false, esc = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inString = false;
    } else {
      if (ch === '"') inString = true;
      else if (ch === "[") depth += 1;
      else if (ch === "]") {
        depth -= 1;
        if (depth === 0) return JSON.parse(text.slice(start, i + 1));
      }
    }
  }
  return [];
}

function buildTestsData(tests, folders) {
  return `window.CAT_TESTS = ${JSON.stringify(tests, null, 2)};\n\nwindow.CAT_FOLDERS = ${JSON.stringify(folders, null, 2)};\n`;
}

function repairedTest(test) {
  const next = { ...test };
  const file = String(next.file || "");
  if (Array.isArray(next.folders) && file.includes("2.Ratio Proportion/New folder/")) {
    next.folders = next.folders.filter((part) => part !== "New folder");
    next.file = file.replace("2.Ratio Proportion/New folder/", "2.Ratio Proportion/");
  }
  const ratioMatch = file.match(/Ratio Proportion Variation Partnership\s+Test -(\d+)\.html$/i);
  if (ratioMatch && ["10", "11", "12", "13"].includes(ratioMatch[1])) {
    next.title = `Ratio Proportion Variation Partnership Test -${ratioMatch[1]}`;
  }
  return next;
}

function repairTests(tests) {
  const map = new Map();
  (Array.isArray(tests) ? tests : []).map(repairedTest).forEach((test) => {
    if (!test.file || !Array.isArray(test.folders)) return;
    map.set(test.file, test);
  });
  return Array.from(map.values());
}

function buildFoldersFromTests(tests, folders = []) {
  const folderMap = new Map();
  function addFolder(path) {
    if (!Array.isArray(path)) return;
    path.filter(Boolean).forEach((_, i) => {
      const p = path.slice(0, i + 1);
      folderMap.set(folderKey(p), { name: p[p.length - 1], path: p });
    });
  }
  folders.forEach((folder) => addFolder(folder.path));
  tests.forEach((test) => addFolder(test.folders));
  presetPaths.forEach(addFolder);
  return Array.from(folderMap.values()).sort((a, b) => folderKey(a.path).localeCompare(folderKey(b.path), undefined, { numeric: true }));
}

function cleanNameFromFile(fileName) {
  return String(fileName || "Test").replace(/\.html?$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
}

function safeFileName(value) {
  let name = String(value || "").trim();
  if (!name) name = state.selectedFile ? state.selectedFile.name : "test.html";
  name = name.replace(/[\\:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  if (!/\.html?$/i.test(name)) name += ".html";
  return name;
}

function inferMetadata(file, html) {
  const source = String(html || "");
  const title = cleanNameFromFile(file.name);

  let questions = null;
  const questionTextMatch = source.match(/\b(\d+)\s+Questions?\b/i);
  if (questionTextMatch) questions = Number(questionTextMatch[1]);
  if (!Number.isFinite(questions)) {
    const jsonMatch = source.match(/<script[^>]+id=["']questions-data["'][^>]*>([\s\S]*?)<\/script>/i);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed)) questions = parsed.length;
      } catch (error) {}
    }
  }

  let minutes = null;
  const minuteTextMatch = source.match(/\b(\d+)\s+Minutes?\b/i);
  const minuteObjectMatch = source.match(/\bminutes\s*:\s*(\d+)\b/i);
  const timerMatch = source.match(/\bsecondsLeft\s*=\s*(\d+)\s*\*\s*60\b/i);
  if (minuteTextMatch) minutes = Number(minuteTextMatch[1]);
  else if (minuteObjectMatch) minutes = Number(minuteObjectMatch[1]);
  else if (timerMatch) minutes = Number(timerMatch[1]);

  return {
    title: title || cleanNameFromFile(file.name),
    minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : (Number($("minutes").value || 0) || 60),
    questions: Number.isFinite(questions) && questions >= 0 ? questions : null,
  };
}

function renderSelectedFiles() {
  const list = $("selectedFilesList");
  list.innerHTML = "";
  state.selectedFiles.slice(0, 100).forEach((file) => {
    const row = document.createElement("div");
    row.className = "selected-file-row";
    row.innerHTML = `<span>${escapeHtml(file.webkitRelativePath || file.name)}</span><span>${Math.ceil(file.size / 1024)} KB</span>`;
    list.appendChild(row);
  });
  if (state.selectedFiles.length > 100) {
    const row = document.createElement("div");
    row.className = "selected-file-row";
    row.textContent = `+ ${state.selectedFiles.length - 100} more files`;
    list.appendChild(row);
  }
}

function clearSelectedFiles() {
  state.selectedFile = null;
  state.selectedFiles = [];
  $("htmlFile").value = "";
  $("folderFiles").value = "";
  $("title").value = "";
  $("fileName").value = "";
  $("dropTitle").textContent = "Drop HTML tests here";
  $("dropSub").textContent = "or click to select one or more .html files";
  renderSelectedFiles();
  updatePathUI();
  setStatus("Selection cleared. Choose HTML files or a complete folder.");
}

function folderKey(path) { return path.join(" / "); }

function compareKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\.html?$/i, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sameFolder(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((part, index) => part === b[index]);
}

function pathForFileName(fileName) {
  const key = compareKey(fileName);
  const rules = [
    { words: ["ratio", "proportion"], path: ["Topic Test", "QA", "Arithmetic", "2.Ratio Proportion"] },
    { words: ["profit", "loss"], path: ["Topic Test", "QA", "Arithmetic", "3.Profit & Loss"] },
    { words: ["percentage"], path: ["Topic Test", "QA", "Arithmetic", "1.Percentage"] },
    { words: ["si", "ci"], path: ["Topic Test", "QA", "Arithmetic", "4.SI & CI"] },
    { words: ["simple", "interest"], path: ["Topic Test", "QA", "Arithmetic", "4.SI & CI"] },
    { words: ["compound", "interest"], path: ["Topic Test", "QA", "Arithmetic", "4.SI & CI"] },
    { words: ["average"], path: ["Topic Test", "QA", "Arithmetic", "5. Average"] },
  ];
  const match = rules.find((rule) => rule.words.every((word) => key.includes(word)));
  return match ? match.path : null;
}

function findReplacementMatches(filePath, title, original) {
  const titleKey = compareKey(title);
  const originalKey = compareKey(original);
  const fileNameKey = compareKey(String(filePath || "").split("/").pop());
  return repairTests(state.tests).filter((test) => {
    if (!sameFolder(test.folders, state.selectedPath)) return false;
    if (test.file === filePath) return true;
    const keys = [test.title, test.original, String(test.file || "").split("/").pop()].map(compareKey);
    return keys.some((key) => key && (key === titleKey || key === originalKey || key === fileNameKey));
  });
}

function countTests(path) {
  return state.tests.filter((test) => Array.isArray(test.folders) && path.every((p, i) => test.folders[i] === p)).length;
}

function collectFolders() {
  const map = new Map();
  function add(path) {
    if (!Array.isArray(path) || !path.length) return;
    path.forEach((_, i) => {
      const p = path.slice(0, i + 1);
      map.set(folderKey(p), p);
    });
  }
  state.tests.forEach((test) => add(test.folders));
  state.folders.forEach((folder) => add(folder.path));
  presetPaths.forEach(add);
  return Array.from(map.values()).sort((a, b) => folderKey(a).localeCompare(folderKey(b), undefined, { numeric: true }));
}

function selectedUploadPath() {
  if (state.selectedFiles.length > 1) {
    return `tests/${state.selectedPath.join("/")}/ (${state.selectedFiles.length} HTML files)`;
  }
  const fileName = safeFileName($("fileName").value || (state.selectedFile && state.selectedFile.name));
  return `tests/${state.selectedPath.join("/")}/${fileName}`;
}

function updateStats() {
  const folders = collectFolders();
  $("statTests").textContent = state.tests.length;
  $("statFolders").textContent = folders.length;
  $("statSelected").textContent = countTests(state.selectedPath);
  $("folderCountPill").textContent = `${folders.length} folders`;
}

function updatePathUI() {
  const pathText = folderKey(state.selectedPath);
  $("selectedPathText").textContent = pathText;
  $("uploadPathText").textContent = selectedUploadPath();
  $("previewFolder").textContent = pathText;
  if (state.selectedFiles.length > 1) {
    $("previewTitle").textContent = `${state.selectedFiles.length} tests ready`;
    $("previewMinutes").textContent = "Timing auto-detected";
    $("previewQuestions").textContent = "Questions auto-detected";
  } else {
    $("previewTitle").textContent = $("title").value.trim() || cleanNameFromFile($("fileName").value || (state.selectedFile && state.selectedFile.name)) || "New Test";
    $("previewMinutes").textContent = `${Number($("minutes").value || 0) || 60} min`;
    $("previewQuestions").textContent = $("questions").value.trim() ? `${$("questions").value.trim()} questions` : "Questions optional";
  }
  updateStats();
  document.querySelectorAll(".folder-pick").forEach((btn) => btn.classList.toggle("active", btn.dataset.path === pathText));
}

function selectPath(path, userAction = false) {
  state.selectedPath = path.filter(Boolean);
  if (userAction) state.userSelectedPath = true;
  $("rootSelect").value = state.selectedPath[0] || "Topic Test";
  $("level2").value = state.selectedPath[1] || "";
  $("level3").value = state.selectedPath[2] || "";
  $("level4").value = state.selectedPath[3] || "";
  $("level5").value = state.selectedPath[4] || "";
  updatePathUI();
}

function renderPresets() {
  const grid = $("presetGrid");
  grid.innerHTML = "";
  presetPaths.slice(0, 8).forEach((path) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-card";
    btn.innerHTML = `<strong>${escapeHtml(path[path.length - 1])}</strong><span>${escapeHtml(path.slice(0, -1).join(" / ") || path[0])}</span>`;
    btn.addEventListener("click", () => selectPath(path, true));
    grid.appendChild(btn);
  });
}

function renderFolders() {
  const list = $("folderList");
  const term = $("folderSearch").value.trim().toLowerCase();
  const folders = collectFolders().filter((path) => !term || folderKey(path).toLowerCase().includes(term));
  list.innerHTML = "";
  folders.slice(0, 80).forEach((path) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "folder-pick";
    btn.dataset.path = folderKey(path);
    const count = countTests(path);
    btn.innerHTML = `<strong>${escapeHtml(path[path.length - 1])}</strong><small>${escapeHtml(folderKey(path))}</small><span>${count} test${count === 1 ? "" : "s"}</span>`;
    btn.addEventListener("click", () => selectPath(path, true));
    list.appendChild(btn);
  });
  if (!folders.length) list.innerHTML = `<div class="folder-pick"><strong>No folder found</strong><small>Try another search term.</small></div>`;
  updatePathUI();
}

function renderSuggestions() {
  const seen = new Set();
  collectFolders().forEach((path) => path.forEach((part) => seen.add(part)));
  $("folderSuggestions").innerHTML = Array.from(seen).sort().map((item) => `<option value="${escapeHtml(item)}"></option>`).join("");
}

function applyBuilder() {
  const path = [$("rootSelect").value, $("level2").value.trim(), $("level3").value.trim(), $("level4").value.trim(), $("level5").value.trim()].filter(Boolean);
  selectPath(path, true);
  renderFolders();
}

function handleFiles(fileList) {
  const files = Array.from(fileList || []).filter((file) => file.name.toLowerCase().endsWith(".html"));
  if (!files.length) {
    setStatus("No HTML tests were found in that selection.", "error");
    return;
  }

  const names = new Set();
  const duplicates = [];
  files.forEach((file) => {
    const name = safeFileName(file.name).toLowerCase();
    if (names.has(name)) duplicates.push(file.name);
    names.add(name);
  });
  if (duplicates.length) {
    setStatus(`Duplicate HTML file names found:\n${duplicates.join("\n")}\n\nRename them before uploading so one test does not replace another.`, "error");
    return;
  }

  state.selectedFiles = files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  state.selectedFile = state.selectedFiles[0];
  renderSelectedFiles();

  if (state.selectedFiles.length === 1) {
    const file = state.selectedFile;
    $("dropTitle").textContent = file.name;
    $("dropSub").textContent = `${Math.ceil(file.size / 1024)} KB selected`;
    $("title").value = cleanNameFromFile(file.name);
    $("fileName").value = file.name;
    const suggestedPath = !state.userSelectedPath ? pathForFileName(file.name) : null;
    if (suggestedPath) {
      selectPath(suggestedPath);
      setStatus(`Folder auto-selected from file name.\n${folderKey(suggestedPath)}`, "success");
    } else {
      setStatus("One HTML test selected. Review its title and destination folder.");
    }
  } else {
    $("title").value = "";
    $("fileName").value = "";
    $("dropTitle").textContent = `${state.selectedFiles.length} HTML tests selected`;
    const folderName = String(state.selectedFiles[0].webkitRelativePath || "").split("/")[0];
    $("dropSub").textContent = folderName ? `Folder: ${folderName}` : "Multiple files ready";
    setStatus(`${state.selectedFiles.length} HTML tests ready.\nAll will be uploaded to:\n${folderKey(state.selectedPath)}\n\nTitles, durations, and question counts will be detected from each file.`);
  }
  updatePathUI();
}

function handleFile(file) {
  if (file) handleFiles([file]);
}

function validate() {
  const token = $("token").value.trim();
  const title = $("title").value.trim();
  if (!token) throw new Error("Paste GitHub token first.");
  if (!state.selectedFiles.length) throw new Error("Select one or more HTML test files.");
  if (state.selectedFiles.length === 1 && !title) throw new Error("Enter test title.");
  if (!state.selectedPath.length) throw new Error("Select destination folder.");
  return { token, title };
}

function buildUpdatedData() {
  const title = $("title").value.trim();
  const filePath = selectedUploadPath();
  const minutes = Number($("minutes").value || 0) || null;
  const q = $("questions").value.trim();
  const questions = q === "" ? null : Number(q);
  const meta = {
    title,
    file: filePath,
    original: safeFileName($("fileName").value || (state.selectedFile && state.selectedFile.name)),
    folders: state.selectedPath,
    minutes,
  };
  if (Number.isFinite(questions)) meta.questions = questions;

  const replacementFiles = new Set(findReplacementMatches(filePath, title, meta.original).map((test) => test.file));
  replacementFiles.add(filePath);
  const updatedTests = repairTests(state.tests).filter((test) => !replacementFiles.has(test.file));
  updatedTests.push(meta);

  const updatedFolders = buildFoldersFromTests(updatedTests, state.folders);
  return { updatedTests, updatedFolders, meta, replacedCount: replacementFiles.size - (replacementFiles.has(filePath) ? 1 : 0) };
}

async function buildBulkUpdatedData() {
  let updatedTests = repairTests(state.tests);
  const uploads = [];
  let replacedCount = 0;

  for (const file of state.selectedFiles) {
    const html = await file.text();
    const detected = inferMetadata(file, html);
    const original = safeFileName(file.name);
    const filePath = `tests/${state.selectedPath.join("/")}/${original}`;
    const meta = {
      title: detected.title,
      file: filePath,
      original,
      folders: [...state.selectedPath],
      minutes: detected.minutes,
    };
    if (Number.isFinite(detected.questions)) meta.questions = detected.questions;

    const replacementFiles = new Set(findReplacementMatches(filePath, meta.title, meta.original).map((test) => test.file));
    replacementFiles.add(filePath);
    const before = updatedTests.length;
    updatedTests = updatedTests.filter((test) => !replacementFiles.has(test.file));
    replacedCount += before - updatedTests.length;
    updatedTests.push(meta);
    uploads.push({ file, html, meta });
  }

  updatedTests.sort((a, b) => {
    const left = [...(a.folders || []), a.title || ""].join(" / ");
    const right = [...(b.folders || []), b.title || ""].join(" / ");
    return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
  });
  const updatedFolders = buildFoldersFromTests(updatedTests, state.folders);
  return { updatedTests, updatedFolders, uploads, replacedCount };
}

async function loadRemoteData(token) {
  const dataFile = await githubGet("tests-data.js", token);
  let tests = state.tests;
  let folders = state.folders;
  if (dataFile && dataFile.content) {
    const jsText = base64ToUtf8(dataFile.content);
    const remoteTests = extractWindowArray(jsText, "CAT_TESTS");
    const remoteFolders = extractWindowArray(jsText, "CAT_FOLDERS");
    if (remoteTests.length) tests = remoteTests;
    if (remoteFolders.length) folders = remoteFolders;
  }
  state.tests = repairTests(tests);
  state.folders = buildFoldersFromTests(state.tests, folders);
  return { dataFile, tests: state.tests, folders: state.folders };
}

async function publishTest() {
  try {
    const btn = $("publishBtn");
    btn.disabled = true;
    const { token, title } = validate();
    if ($("rememberToken").checked) localStorage.setItem("catAdminToken", token);

    setStatus("Reading latest tests-data.js from GitHub...");
    const { dataFile } = await loadRemoteData(token);

    let updatedTests, updatedFolders, uploads, replacedCount;
    if (state.selectedFiles.length > 1) {
      const bulk = await buildBulkUpdatedData();
      ({ updatedTests, updatedFolders, uploads, replacedCount } = bulk);
    } else {
      const single = buildUpdatedData();
      updatedTests = single.updatedTests;
      updatedFolders = single.updatedFolders;
      replacedCount = single.replacedCount;
      uploads = [{ file: state.selectedFile, html: await state.selectedFile.text(), meta: single.meta }];
    }

    for (let index = 0; index < uploads.length; index += 1) {
      const upload = uploads[index];
      setStatus(`Uploading test ${index + 1} of ${uploads.length}...\n${upload.meta.file}`);
      const oldHtml = await githubGet(upload.meta.file, token);
      await githubPut(
        upload.meta.file,
        upload.html,
        uploads.length > 1 ? `Bulk upload test: ${upload.meta.title}` : `Add/update test: ${title}`,
        token,
        oldHtml ? oldHtml.sha : undefined
      );
    }

    setStatus(`All ${uploads.length} HTML file${uploads.length === 1 ? "" : "s"} uploaded.\nUpdating the student catalog once...`);
    const catalogMessage = uploads.length > 1 ? `Update tests list: bulk upload ${uploads.length} tests` : `Update tests list: ${title}`;
    await githubPut("tests-data.js", buildTestsData(updatedTests, updatedFolders), catalogMessage, token, dataFile ? dataFile.sha : undefined);

    setStatus("Updating tests.json backup...");
    const jsonFile = await githubGet("tests.json", token);
    await githubPut("tests.json", `${JSON.stringify(updatedTests, null, 2)}\n`, catalogMessage, token, jsonFile ? jsonFile.sha : undefined);

    state.tests = updatedTests;
    state.folders = updatedFolders;
    renderFolders();
    const action = replacedCount
      ? `Published ${uploads.length} test${uploads.length === 1 ? "" : "s"} and replaced ${replacedCount} existing card${replacedCount === 1 ? "" : "s"}.`
      : `Published ${uploads.length} new test${uploads.length === 1 ? "" : "s"}.`;
    setStatus(`Success!\n${action}\n\nPortal folder: ${folderKey(state.selectedPath)}\n\nWait for Vercel deployment, then refresh the student portal.`, "success");
  } catch (error) {
    setStatus(`Upload failed: ${error.message}`, "error");
  } finally {
    $("publishBtn").disabled = false;
  }
}

async function repairExistingData() {
  try {
    const btn = $("repairDataBtn");
    btn.disabled = true;
    const token = $("token").value.trim();
    if (!token) throw new Error("Paste GitHub token first.");
    if ($("rememberToken").checked) localStorage.setItem("catAdminToken", token);

    setStatus("Reading latest portal data from GitHub...");
    const { dataFile, tests, folders } = await loadRemoteData(token);
    if (!dataFile) throw new Error("tests-data.js was not found in the GitHub repo root.");

    setStatus("Publishing repaired tests-data.js...");
    await githubPut("tests-data.js", buildTestsData(tests, folders), "Repair test data links and titles", token, dataFile.sha);

    setStatus("Publishing repaired tests.json...");
    const jsonFile = await githubGet("tests.json", token);
    await githubPut("tests.json", `${JSON.stringify(tests, null, 2)}\n`, "Repair tests.json links and titles", token, jsonFile ? jsonFile.sha : undefined);

    renderFolders();
    setStatus(`Success! Existing data repaired.\n\nTests loaded: ${tests.length}\nFolders loaded: ${folders.length}\n\nWait for Vercel deployment, then hard refresh the portal.`, "success");
  } catch (error) {
    setStatus(`Repair failed: ${error.message}`, "error");
  } finally {
    $("repairDataBtn").disabled = false;
  }
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

async function downloadUpdatedData() {
  try {
    let updatedTests;
    if (state.selectedFiles.length > 1) updatedTests = (await buildBulkUpdatedData()).updatedTests;
    else if ($("title").value.trim() && state.selectedFile) updatedTests = buildUpdatedData().updatedTests;
    else updatedTests = repairTests(state.tests);
    const updatedFolders = buildFoldersFromTests(updatedTests, state.folders);
    downloadText("tests-data.js", buildTestsData(updatedTests, updatedFolders));
    setTimeout(() => downloadText("tests.json", `${JSON.stringify(updatedTests, null, 2)}\n`), 350);
    setStatus("Downloaded repaired tests-data.js and tests.json. Upload them manually if you do not want to use token.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function bindEvents() {
  $("applyBuilderBtn").addEventListener("click", () => { applyBuilder(); });
  ["rootSelect", "level2", "level3", "level4", "level5"].forEach((id) => $(id).addEventListener("input", applyBuilder));
  $("folderSearch").addEventListener("input", renderFolders);
  ["title", "minutes", "questions", "fileName"].forEach((id) => $(id).addEventListener("input", updatePathUI));
  $("htmlFile").addEventListener("change", (e) => handleFiles(e.target.files));
  $("folderFiles").addEventListener("change", (e) => handleFiles(e.target.files));
  $("clearFilesBtn").addEventListener("click", clearSelectedFiles);
  $("publishBtn").addEventListener("click", publishTest);
  $("repairDataBtn").addEventListener("click", repairExistingData);
  $("downloadBtn").addEventListener("click", downloadUpdatedData);
  $("copyPathBtn").addEventListener("click", async () => {
    await navigator.clipboard.writeText(selectedUploadPath()).catch(() => {});
    setStatus("Upload path copied.", "success");
  });
  $("scrollFolderBtn").addEventListener("click", () => $("folderPanel").scrollIntoView({ behavior: "smooth" }));
  $("scrollPublishBtn").addEventListener("click", () => $("publishPanel").scrollIntoView({ behavior: "smooth" }));

  const drop = $("dropzone");
  ["dragenter", "dragover"].forEach((eventName) => drop.addEventListener(eventName, (event) => { event.preventDefault(); drop.classList.add("drag"); }));
  ["dragleave", "drop"].forEach((eventName) => drop.addEventListener(eventName, (event) => { event.preventDefault(); drop.classList.remove("drag"); }));
  drop.addEventListener("drop", (event) => handleFiles(event.dataTransfer.files));
}

function init() {
  const saved = localStorage.getItem("catAdminToken");
  if (saved) { $("token").value = saved; $("rememberToken").checked = true; }
  state.tests = repairTests(state.tests);
  state.folders = buildFoldersFromTests(state.tests, state.folders);
  renderPresets();
  renderSuggestions();
  renderFolders();
  selectPath(state.selectedPath);
  bindEvents();
  renderSelectedFiles();
  setStatus("Ready. Select a destination folder, then choose HTML files or a complete folder.");
}

init();
