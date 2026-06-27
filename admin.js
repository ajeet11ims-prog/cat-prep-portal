(function () {
  const ROOT = "CAT PREP with Ajeet sir";
  let tests = Array.isArray(window.CAT_TESTS) ? JSON.parse(JSON.stringify(window.CAT_TESTS)) : [];
  let folders = Array.isArray(window.CAT_FOLDERS) ? JSON.parse(JSON.stringify(window.CAT_FOLDERS)) : [];
  let selectedFolder = null;
  let selectedHtmlFile = null;

  const els = {
    total: document.getElementById("adminTotalTests"),
    folderCount: document.getElementById("adminFolderBoxes"),
    folderSearch: document.getElementById("folderSearch"),
    folderList: document.getElementById("folderAdminList"),
    selectedTitle: document.getElementById("selectedFolderTitle"),
    selectedPath: document.getElementById("selectedFolderPath"),
    selectedMeta: document.getElementById("selectedFolderMeta"),
    htmlFile: document.getElementById("htmlFile"),
    testTitle: document.getElementById("testTitle"),
    testType: document.getElementById("testType"),
    subject: document.getElementById("subject"),
    area: document.getElementById("area"),
    topic: document.getElementById("topic"),
    qaTopic: document.getElementById("qaTopic"),
    minutes: document.getElementById("minutes"),
    questions: document.getElementById("questions"),
    prepare: document.getElementById("prepareUpload"),
    copyPath: document.getElementById("copyPath"),
    outputBox: document.getElementById("outputBox"),
    downloadHtml: document.getElementById("downloadHtml"),
    downloadData: document.getElementById("downloadData"),
    finalUploadPath: document.getElementById("finalUploadPath"),
    newEntryPreview: document.getElementById("newEntryPreview"),
    emptyParent: document.getElementById("emptyParent"),
    emptyName: document.getElementById("emptyName"),
    createEmptyFolder: document.getElementById("createEmptyFolder"),
    downloadCurrentData: document.getElementById("downloadCurrentData"),
    reset: document.getElementById("resetAdmin")
  };

  function safe(value, fallback = "") { const text = String(value ?? "").trim(); return text || fallback; }
  function cleanPath(value) { return safe(value).replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, ""); }
  function titleFromPath(path) { const parts = cleanPath(path).split("/").filter(Boolean); return parts[parts.length - 1] || ROOT; }
  function parentPath(path) { const parts = cleanPath(path).split("/").filter(Boolean); parts.pop(); return parts.join("/"); }
  function normalize(value) { return safe(value).toLowerCase(); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }
  function slugFileName(name) {
    const base = safe(name, "test.html").replace(/\.html?$/i, "");
    return base.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + ".html";
  }
  function readableTitleFromFile(name) {
    return safe(name, "New Test").replace(/\.html?$/i, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }
  function directTestCount(path) { return tests.filter(t => parentPath(cleanPath(t.file || t.path || "")) === cleanPath(path)).length; }
  function recursiveTestCount(path) {
    const p = cleanPath(path); const prefix = p + "/";
    return tests.filter(t => {
      const f = parentPath(cleanPath(t.file || t.path || ""));
      return f === p || f.startsWith(prefix);
    }).length;
  }
  function ensureFolder(path, meta = {}) {
    path = cleanPath(path || ROOT);
    if (!path) path = ROOT;
    if (!folders.some(f => cleanPath(f.path) === path)) {
      folders.push({ title: titleFromPath(path), path, area: meta.area || "", subject: meta.subject || "", topic: meta.topic || "", qaTopic: meta.qaTopic || "", type: meta.type || "Folder", testsCount: 0, status: "Upload Pending" });
    }
    const parent = parentPath(path);
    if (parent && parent !== path) ensureFolder(parent, meta);
  }
  function allFolders() {
    ensureFolder(ROOT, { type: "Root" });
    tests.forEach(t => ensureFolder(parentPath(cleanPath(t.file || t.path || "")), t));
    return folders.slice().sort((a,b) => cleanPath(a.path).localeCompare(cleanPath(b.path)));
  }
  function refreshCounts() {
    folders = allFolders().map(f => {
      const count = recursiveTestCount(f.path);
      return { ...f, title: safe(f.title, titleFromPath(f.path)), testsCount: count, status: count > 0 ? "Ready" : "Upload Pending" };
    });
    if (els.total) els.total.textContent = tests.length;
    if (els.folderCount) els.folderCount.textContent = folders.length;
  }
  function inferFromFolder(folder) {
    const text = normalize(`${folder.path} ${folder.title} ${folder.type} ${folder.subject} ${folder.topic} ${folder.area}`);
    let type = folder.type && folder.type !== "Folder" && folder.type !== "Root" ? folder.type : "Topic Wise Test";
    if (text.includes("area wise")) type = "Area Wise Test";
    if (text.includes("sectional")) type = "Sectional Test";
    if (text.includes("full length") || text.includes("full test") || text.includes("mock")) type = "Full Test";
    if (text.includes("daily")) type = "Daily Dose";
    if (text.includes("pyq")) type = "PYQ Topic Wise";

    let subject = safe(folder.subject, "QA");
    if (text.includes("lrdi") || text.includes("logical") || /\/lr\b/.test(text)) subject = "LR";
    if (text.includes("data interpretation") || /\/di\b/.test(text)) subject = "DI";
    if (text.includes("varc") || text.includes("reading comprehension") || /\/rc\b/.test(text)) subject = "RC";
    if (text.includes("va") || text.includes("verbal")) subject = "VA-VR";
    if (text.includes("quant") || text.includes("qa") || text.includes("arithmetic") || text.includes("number system")) subject = "QA";

    let area = safe(folder.area, subject === "QA" ? "Quant" : (subject === "LR" || subject === "DI" ? "LRDI" : "VARC"));
    let topic = safe(folder.topic, titleFromPath(folder.path));
    let qaTopic = safe(folder.qaTopic, "");
    if (subject === "QA") {
      if (text.includes("number")) qaTopic = "number-system";
      else if (text.includes("algebra")) qaTopic = "algebra";
      else if (text.includes("geometry") || text.includes("mensuration")) qaTopic = "geometry";
      else if (text.includes("modern") || text.includes("probability") || text.includes("permutation")) qaTopic = "modern-math";
      else qaTopic = "arithmetic";
    }
    return { type, subject, area, topic, qaTopic };
  }
  function selectFolder(folder) {
    selectedFolder = folder;
    const inferred = inferFromFolder(folder);
    els.selectedTitle.textContent = safe(folder.title, titleFromPath(folder.path));
    els.selectedPath.textContent = cleanPath(folder.path);
    els.selectedMeta.textContent = `${recursiveTestCount(folder.path)} total tests inside • ${directTestCount(folder.path)} direct tests`;
    els.testType.value = inferred.type;
    els.subject.value = inferred.subject;
    els.area.value = inferred.area;
    els.topic.value = inferred.topic;
    els.qaTopic.value = inferred.qaTopic;
    els.emptyParent.value = cleanPath(folder.path);
    renderFolderList();
  }
  function renderFolderList() {
    refreshCounts();
    const term = normalize(els.folderSearch.value);
    els.folderList.innerHTML = "";
    const list = folders.filter(f => normalize(`${f.title} ${f.path} ${f.type} ${f.subject} ${f.topic} ${f.area}`).includes(term));
    list.forEach(folder => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "folder-pick" + (selectedFolder && cleanPath(selectedFolder.path) === cleanPath(folder.path) ? " active" : "");
      const count = recursiveTestCount(folder.path);
      const status = count > 0 ? "Ready" : "Upload Pending";
      btn.innerHTML = `<strong>${escapeHtml(safe(folder.title, titleFromPath(folder.path)))}</strong><small>${escapeHtml(cleanPath(folder.path))}</small><div class="meta-row"><span class="pill">${count} tests</span><span class="pill ${status === "Ready" ? "ready" : "pending"}">${status}</span></div>`;
      btn.addEventListener("click", () => selectFolder(folder));
      els.folderList.appendChild(btn);
    });
  }
  function makeTestsData() {
    refreshCounts();
    const sortedTests = tests.slice().sort((a,b) => cleanPath(a.file || "").localeCompare(cleanPath(b.file || "")));
    const sortedFolders = folders.slice().sort((a,b) => cleanPath(a.path || "").localeCompare(cleanPath(b.path || "")));
    return `/* Auto-generated by Admin Upload Helper for CAT Prep With Ajeet Sir. */\nwindow.CAT_TESTS = ${JSON.stringify(sortedTests, null, 2)};\n\nwindow.CAT_FOLDERS = ${JSON.stringify(sortedFolders, null, 2)};\n`;
  }
  function downloadBlob(name, content, type = "text/plain") {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    return URL.createObjectURL(blob);
  }
  function setDownloadLink(link, name, content, type) {
    if (link.dataset.url) URL.revokeObjectURL(link.dataset.url);
    const url = downloadBlob(name, content, type);
    link.dataset.url = url;
    link.href = url;
    link.download = name;
  }
  async function prepareUpload() {
    if (!selectedFolder) { toast("Select destination folder first."); return; }
    if (!selectedHtmlFile) { toast("Choose one HTML test file first."); return; }
    const safeName = slugFileName(selectedHtmlFile.name);
    const destination = cleanPath(`${selectedFolder.path}/${safeName}`);
    if (tests.some(t => cleanPath(t.file) === destination)) {
      const ok = confirm("This file path already exists in tests-data.js. Add duplicate entry anyway?");
      if (!ok) return;
    }
    const entry = {
      title: safe(els.testTitle.value, readableTitleFromFile(selectedHtmlFile.name)),
      file: destination,
      original: selectedHtmlFile.name,
      area: safe(els.area.value),
      subject: safe(els.subject.value),
      topic: safe(els.topic.value),
      qaTopic: safe(els.qaTopic.value),
      type: safe(els.testType.value, "Topic Wise Test"),
      minutes: els.minutes.value ? Number(els.minutes.value) : null,
      questions: els.questions.value ? Number(els.questions.value) : null,
      status: "Available"
    };
    tests.push(entry);
    ensureFolder(selectedFolder.path, entry);
    refreshCounts();
    setDownloadLink(els.downloadHtml, safeName, selectedHtmlFile, "text/html");
    setDownloadLink(els.downloadData, "tests-data.js", makeTestsData(), "text/javascript");
    els.finalUploadPath.textContent = destination;
    els.newEntryPreview.textContent = JSON.stringify(entry, null, 2);
    els.outputBox.classList.remove("hidden");
    renderFolderList();
    toast("Upload files generated. Download both files now.");
  }
  function createEmptyFolder() {
    if (!selectedFolder) { toast("Select parent folder first."); return; }
    const name = safe(els.emptyName.value);
    if (!name) { toast("Type new folder name first."); return; }
    const newPath = cleanPath(`${selectedFolder.path}/${name}`);
    const meta = inferFromFolder({ ...selectedFolder, path: newPath, title: name });
    ensureFolder(newPath, { ...meta, title: name, status: "Upload Pending" });
    setDownloadLink(els.downloadData, "tests-data.js", makeTestsData(), "text/javascript");
    els.finalUploadPath.textContent = newPath;
    els.newEntryPreview.textContent = JSON.stringify(folders.find(f => cleanPath(f.path) === newPath), null, 2);
    els.outputBox.classList.remove("hidden");
    els.emptyName.value = "";
    renderFolderList();
    toast("Empty folder index generated. Download updated tests-data.js.");
  }
  function toast(message) {
    const old = document.querySelector(".toast");
    if (old) old.remove();
    const box = document.createElement("div");
    box.className = "toast";
    box.textContent = message;
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2600);
  }

  els.htmlFile.addEventListener("change", () => {
    selectedHtmlFile = els.htmlFile.files && els.htmlFile.files[0] ? els.htmlFile.files[0] : null;
    if (selectedHtmlFile && !els.testTitle.value) els.testTitle.value = readableTitleFromFile(selectedHtmlFile.name);
  });
  els.folderSearch.addEventListener("input", renderFolderList);
  els.prepare.addEventListener("click", prepareUpload);
  els.createEmptyFolder.addEventListener("click", createEmptyFolder);
  els.copyPath.addEventListener("click", async () => {
    if (!selectedFolder) { toast("Select destination folder first."); return; }
    await navigator.clipboard.writeText(cleanPath(selectedFolder.path));
    toast("Folder path copied.");
  });
  els.downloadCurrentData.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = downloadBlob("tests-data-backup.js", makeTestsData(), "text/javascript");
    link.download = "tests-data-backup.js";
    link.click();
  });
  els.reset.addEventListener("click", () => {
    els.htmlFile.value = ""; els.testTitle.value = ""; els.minutes.value = ""; els.questions.value = ""; els.outputBox.classList.add("hidden"); selectedHtmlFile = null;
    toast("Form reset. Folder selection remains active.");
  });

  refreshCounts();
  renderFolderList();
  const root = folders.find(f => cleanPath(f.path) === ROOT) || folders[0];
  if (root) selectFolder(root);
})();
