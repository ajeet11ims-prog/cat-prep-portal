(function(){
  const folder = ["Topic Test", "QA", "Arithmetic", "3.Profit & Loss"];
  const base = "tests/Topic Test/QA/Arithmetic/3.Profit & Loss";
  const minutes = [40,90,90,30,95,60,60,60,60,60,60,60,60];
  const entries = Array.from({length:13}, (_,i)=>({
    title: `Profit Loss Test ${i+1}`,
    file: `${base}/Profit Loss Test -${i+1}.html`,
    original: `Profit Loss Test -${i+1}.html`,
    folders: folder,
    minutes: minutes[i]
  }));
  window.CAT_TESTS = Array.isArray(window.CAT_TESTS) ? window.CAT_TESTS : [];
  window.CAT_TESTS = window.CAT_TESTS.filter(test => {
    const path = Array.isArray(test.folders) ? test.folders.join(" / ") : "";
    const title = String(test.title || "").toLowerCase();
    const file = String(test.file || "").toLowerCase();
    const isProfitLossPath = path === folder.join(" / ");
    const isProfitLossFile = file.includes("3.profit") && file.includes("profit loss test");
    const isProfitLossTitle = title.startsWith("profit loss test");
    return !(isProfitLossPath && (isProfitLossFile || isProfitLossTitle));
  });
  window.CAT_TESTS.push(...entries);
})();
