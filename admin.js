const REPO_OWNER = "ajeet11ims-prog";
const REPO_NAME = "cat-prep-portal";
const BRANCH = "main";
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;

const $ = (id) => document.getElementById(id);
const statusBox = $("status");
const uploadBtn = $("uploadBtn");

function setStatus(message, type = "normal") {
  statusBox.textContent = message;
  statusBox.className = `status ${type === "success" ? "success" : type === "error" ? "error" : ""}`;
}

function slugify(value) {
  return String(value || "test")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || `test-${Date.now()}`;
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToUtf8(base64) {
  const clean = String(base64 || "").replace(/\n/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes).replace(/^\uFEFF/, "");
}

async function githubFetch(path, token, options = {}) {
  const res = await fetch(`${API_BASE}/${path}?ref=${BRANCH}`, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });

  if (res.status === 404) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = data && data.message ? data.message : `${res.status} ${res.statusText}`;
    throw new Error(details);
  }
  return data;
}

async function putGithubFile(path, content, message, token, existingSha = undefined) {
  const body = {
    message,
    content: utf8ToBase64(content),
    branch: BRANCH
  };
  if (existingSha) body.sha = existingSha;

  const res = await fetch(`${API_BASE}/${path}`, {
    method: "PUT",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = data && data.message ? data.message : `${res.status} ${res.statusText}`;
    throw new Error(details);
  }
  return data;
}

function parseTestsData(jsText) {
  const cleaned = String(jsText || "").replace(/^\uFEFF/, "").trim();
  if (!cleaned) return [];

  const withoutPrefix = cleaned.replace(/^window\.CAT_TESTS\s*=\s*/, "");
  const jsonText = withoutPrefix.replace(/;\s*$/, "").trim();
  return JSON.parse(jsonText);
}

function buildTestsData(tests) {
  return `window.CAT_TESTS = ${JSON.stringify(tests, null, 2)};\n`;
}

function validateForm() {
  const token = $("token").value.trim();
  const title = $("title").value.trim();
  const file = $("htmlFile").files[0];

  if (!token) throw new Error("Please paste GitHub token.");
  if (!title) throw new Error("Please enter test title.");
  if (!file) throw new Error("Please select an HTML file.");
  if (!file.name.toLowerCase().endsWith(".html")) throw new Error("Only .html files are allowed.");

  return { token, title, file };
}

async function publishTest() {
  try {
    uploadBtn.disabled = true;
    setStatus("Checking form details...");

    const { token, title, file } = validateForm();
    const type = $("type").value;
    const area = $("area").value;
    const topic = $("topic").value.trim() || "Mixed Practice";
    const minutes = Number($("minutes").value || 0) || null;
    const questionValue = $("questions").value.trim();
    const questions = questionValue === "" ? null : Number(questionValue);

    const slug = slugify(title);
    const filePath = `tests/${slug}.html`;
    const html = await file.text();

    setStatus("Reading existing tests-data.js from GitHub...");
    const testsDataFile = await githubFetch("tests-data.js", token);
    const existingTests = testsDataFile && testsDataFile.content
      ? parseTestsData(base64ToUtf8(testsDataFile.content))
      : [];

    const testMeta = {
      title,
      file: filePath,
      original: file.name,
      area,
      topic,
      type,
      minutes,
      questions: Number.isFinite(questions) ? questions : null
    };

    const updatedTests = existingTests.filter((test) => test.file !== filePath);
    updatedTests.push(testMeta);

    setStatus("Uploading HTML test file to /tests folder...");
    const existingHtml = await githubFetch(filePath, token);
    await putGithubFile(
      filePath,
      html,
      `Add/update test HTML: ${title}`,
      token,
      existingHtml ? existingHtml.sha : undefined
    );

    setStatus("Updating tests-data.js so test appears in portal...");
    await putGithubFile(
      "tests-data.js",
      buildTestsData(updatedTests),
      `Update test list: ${title}`,
      token,
      testsDataFile ? testsDataFile.sha : undefined
    );

    setStatus("Updating tests.json backup...");
    const testsJsonFile = await githubFetch("tests.json", token);
    await putGithubFile(
      "tests.json",
      `${JSON.stringify(updatedTests, null, 2)}\n`,
      `Update tests.json: ${title}`,
      token,
      testsJsonFile ? testsJsonFile.sha : undefined
    );

    setStatus(
      `Success! Test published to GitHub.\n\nFile: ${filePath}\nCategory: ${type}\nSubject: ${area}\nTopic: ${topic}\n\nAfter Vercel redeploys, it will show in the student portal.`,
      "success"
    );
  } catch (error) {
    setStatus(`Upload failed: ${error.message}`, "error");
  } finally {
    uploadBtn.disabled = false;
  }
}

uploadBtn.addEventListener("click", publishTest);

$("htmlFile").addEventListener("change", () => {
  const file = $("htmlFile").files[0];
  if (!file) return;
  if (!$("title").value.trim()) {
    const cleanName = file.name.replace(/\.html$/i, "").replace(/[-_]+/g, " ");
    $("title").value = cleanName.replace(/\b\w/g, (char) => char.toUpperCase());
  }
});
