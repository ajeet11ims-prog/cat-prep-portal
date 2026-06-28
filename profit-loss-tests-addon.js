// Profit & Loss tests addon for CAT Prep Portal
// Upload this file to repo root and load it AFTER tests-data.js and BEFORE app.js.
(function () {
  const folder = ["Topic Test", "QA", "Arithmetic", "3.Profit & Loss"];
  const sameFolder = (entry) => Array.isArray(entry.folders) && entry.folders.length === folder.length && entry.folders.every((v, i) => v === folder[i]);

  const profitLossTests = [
    { title: "Profit Loss Test 1", file: "tests/Topic Test/QA/Arithmetic/3.Profit & Loss/Profit Loss Test -1.html", original: "Profit Loss Test -1.html", folders: folder, minutes: 40 },
    { title: "Profit Loss Test 2", file: "tests/Topic Test/QA/Arithmetic/3.Profit & Loss/Profit Loss Test -2.html", original: "Profit Loss Test -2.html", folders: folder, minutes: 90 },
    { title: "Profit Loss Test 3", file: "tests/Topic Test/QA/Arithmetic/3.Profit & Loss/Profit Loss Test -3.html", original: "Profit Loss Test -3.html", folders: folder, minutes: 90 },
    { title: "Profit Loss Test 4", file: "tests/Topic Test/QA/Arithmetic/3.Profit & Loss/Profit Loss Test -4.html", original: "Profit Loss Test -4.html", folders: folder, minutes: 30 },
    { title: "Profit Loss Test 5", file: "tests/Topic Test/QA/Arithmetic/3.Profit & Loss/Profit Loss Test -5.html", original: "Profit Loss Test -5.html", folders: folder, minutes: 95 },
    { title: "Profit Loss Test 6", file: "tests/Topic Test/QA/Arithmetic/3.Profit & Loss/Profit Loss Test -6.html", original: "Profit Loss Test -6.html", folders: folder, minutes: 60 },
    { title: "Profit Loss Test 7", file: "tests/Topic Test/QA/Arithmetic/3.Profit & Loss/Profit Loss Test -7.html", original: "Profit Loss Test -7.html", folders: folder, minutes: 60 },
    { title: "Profit Loss Test 8", file: "tests/Topic Test/QA/Arithmetic/3.Profit & Loss/Profit Loss Test -8.html", original: "Profit Loss Test -8.html", folders: folder, minutes: 60 },
    { title: "Profit Loss Test 9", file: "tests/Topic Test/QA/Arithmetic/3.Profit & Loss/Profit Loss Test -9.html", original: "Profit Loss Test -9.html", folders: folder, minutes: 60 },
    { title: "Profit Loss Test 10", file: "tests/Topic Test/QA/Arithmetic/3.Profit & Loss/Profit Loss Test -10.html", original: "Profit Loss Test -10.html", folders: folder, minutes: 60 },
    { title: "Profit Loss Test 11", file: "tests/Topic Test/QA/Arithmetic/3.Profit & Loss/Profit Loss Test -11.html", original: "Profit Loss Test -11.html", folders: folder, minutes: 60 },
    { title: "Profit Loss Test 12", file: "tests/Topic Test/QA/Arithmetic/3.Profit & Loss/Profit Loss Test -12.html", original: "Profit Loss Test -12.html", folders: folder, minutes: 60 },
    { title: "Profit Loss Test 13", file: "tests/Topic Test/QA/Arithmetic/3.Profit & Loss/Profit Loss Test -13.html", original: "Profit Loss Test -13.html", folders: folder, minutes: 60 }
  ];

  window.CAT_TESTS = (window.CAT_TESTS || []).filter((entry) => !sameFolder(entry)).concat(profitLossTests);

  // Keep folder list stable. If the folder is missing, add it.
  window.CAT_FOLDERS = window.CAT_FOLDERS || [];
  const folderExists = window.CAT_FOLDERS.some((f) => Array.isArray(f.path) && f.path.length === folder.length && f.path.every((v, i) => v === folder[i]));
  if (!folderExists) {
    window.CAT_FOLDERS.push({ name: "3.Profit & Loss", path: folder });
  }
})();
