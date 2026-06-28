(function(){
  const tests = Array.isArray(window.CAT_TESTS) ? window.CAT_TESTS : [];
  const foldersSeed = Array.isArray(window.CAT_FOLDERS) ? window.CAT_FOLDERS : [];

  const els = {
    homePanel: document.getElementById('homePanel'),
    folderPanel: document.getElementById('folderPanel'),
    pageTitle: document.getElementById('pageTitle'),
    pageSubtitle: document.getElementById('pageSubtitle'),
    pathLabel: document.getElementById('pathLabel'),
    crumbTrail: document.getElementById('crumbTrail'),
    sectionTitle: document.getElementById('sectionTitle'),
    sectionMeta: document.getElementById('sectionMeta'),
    folderGrid: document.getElementById('folderGrid'),
    testGrid: document.getElementById('testGrid'),
    searchInput: document.getElementById('searchInput'),
    backButton: document.getElementById('backButton'),
    homeModules: document.getElementById('homeModules'),
    totalTests: document.getElementById('totalTests'),
    topicTests: document.getElementById('topicTests'),
    areaTests: document.getElementById('areaTests'),
    pyqTests: document.getElementById('pyqTests'),
    sectionalTests: document.getElementById('sectionalTests'),
    fullTests: document.getElementById('fullTests'),
    countTopic: document.getElementById('countTopic'),
    countArea: document.getElementById('countArea'),
    countPyq: document.getElementById('countPyq'),
    countSectional: document.getElementById('countSectional'),
    countFull: document.getElementById('countFull'),
  };

  let currentPath = [];
  let searchTerm = '';

  function slug(value){
    return String(value || '').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }
  function norm(value){ return slug(value); }
  function samePath(a,b){ return a.length === b.length && a.every((x,i)=>x===b[i]); }
  function escapeHtml(value){
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function displayName(name){ return String(name || '').replace(/^\d+\s*\.\s*/,'').trim() || String(name || 'Folder'); }
  function iconFor(name){
    const clean = displayName(name).trim();
    if (/qa/i.test(clean)) return '∑';
    if (/lrdi/i.test(clean)) return '▦';
    if (/varc/i.test(clean)) return 'A';
    if (/profit/i.test(clean)) return '₹';
    if (/percentage/i.test(clean)) return '%';
    return (clean[0] || 'F').toUpperCase();
  }

  function folderPaths(){
    const map = new Map();
    foldersSeed.forEach(f=>{
      const path = Array.isArray(f.path) ? f.path : [];
      if(path.length) map.set(path.join(' / '), {name:f.name || path[path.length-1], path});
    });
    tests.forEach(t=>{
      const path = Array.isArray(t.folders) ? t.folders : [];
      path.forEach((_,i)=>{
        const partial = path.slice(0,i+1);
        const key = partial.join(' / ');
        if(!map.has(key)) map.set(key,{name:partial[partial.length-1], path:partial});
      });
    });
    return Array.from(map.values());
  }

  function countUnder(path){
    return tests.filter(t=>samePath((t.folders || []).slice(0,path.length), path)).length;
  }
  function findFolderPathBySlug(hashSlug){
    const all = folderPaths();
    return (all.find(f=>slug(f.path.join(' / ')) === hashSlug) || {}).path || [];
  }
  function pathFromHash(){
    const raw = decodeURIComponent(location.hash.replace(/^#/,''));
    if(!raw || raw === 'home') return [];
    if(!raw.startsWith('folder/')) return [];
    return findFolderPathBySlug(raw.replace('folder/',''));
  }
  function setHash(path){
    const next = path.length ? '#folder/' + slug(path.join(' / ')) : '#home';
    if(location.hash !== next) history.replaceState(null,'',next);
  }

  function childrenFor(path){
    const folderMap = new Map();
    folderPaths().forEach(f=>{
      if(!samePath(f.path.slice(0,path.length), path)) return;
      if(f.path.length !== path.length + 1) return;
      const key = f.path.join(' / ');
      folderMap.set(key,{name:f.name, path:f.path, count:countUnder(f.path)});
    });
    const directTests = tests.filter(t=>samePath(t.folders || [], path));
    const folderList = Array.from(folderMap.values()).sort((a,b)=>displayName(a.name).localeCompare(displayName(b.name),undefined,{numeric:true}));
    const testList = directTests.sort((a,b)=>String(a.title).localeCompare(String(b.title),undefined,{numeric:true}));
    return {folders: folderList, tests: testList};
  }

  function firstPathFor(target){
    const targetSlug = slug(target);
    const all = folderPaths();
    const found = all.find(f=>slug(f.path[f.path.length-1]) === targetSlug || slug(f.name) === targetSlug || slug(f.path.join(' / ')) === targetSlug);
    return found ? found.path : [];
  }
  function hashForPath(path){ return path.length ? '#folder/' + slug(path.join(' / ')) : '#home'; }

  function setMetrics(){
    const topic = firstPathFor('Topic Test');
    const area = firstPathFor('Area Wise Test');
    const pyq = firstPathFor('PYQ');
    const sectional = firstPathFor('Sectionals');
    const full = firstPathFor('Full Length');
    const counts = {
      total: tests.length,
      topic: topic.length ? countUnder(topic) : 0,
      area: area.length ? countUnder(area) : 0,
      pyq: pyq.length ? countUnder(pyq) : 0,
      sectional: sectional.length ? countUnder(sectional) : 0,
      full: full.length ? countUnder(full) : 0
    };
    els.totalTests.textContent = counts.total;
    els.topicTests.textContent = counts.topic;
    els.areaTests.textContent = counts.area;
    els.pyqTests.textContent = counts.pyq;
    els.sectionalTests.textContent = counts.sectional;
    els.fullTests.textContent = counts.full;
    els.countTopic.textContent = counts.topic;
    els.countArea.textContent = counts.area;
    els.countPyq.textContent = counts.pyq;
    els.countSectional.textContent = counts.sectional;
    els.countFull.textContent = counts.full;
  }

  function renderHomeModules(){
    const roots = [
      {label:'QA', path:firstPathFor('QA'), icon:'∑'},
      {label:'LRDI', path:firstPathFor('LRDI'), icon:'▦'},
      {label:'VARC', path:firstPathFor('VARC'), icon:'A'},
    ].filter(x=>x.path.length);

    if(!roots.length){
      const {folders} = childrenFor([]);
      roots.push(...folders.slice(0,3).map(f=>({label:displayName(f.name), path:f.path, icon:iconFor(f.name)})));
    }

    els.homeModules.innerHTML = roots.map(item=>`<button class="module-card" type="button" data-route="${escapeHtml(hashForPath(item.path))}">
      <span><span class="module-icon">${escapeHtml(item.icon)}</span><strong>${escapeHtml(item.label)}</strong><span>${countUnder(item.path)} tests</span></span>
    </button>`).join('');
    els.homeModules.querySelectorAll('[data-route]').forEach(btn=>{
      btn.addEventListener('click',()=>{ location.hash = btn.dataset.route; });
    });
  }

  function updateActiveNav(){
    document.querySelectorAll('.side-link,.brand').forEach(a=>a.classList.remove('active'));
    const key = currentPath[0] || 'home';
    document.querySelectorAll('[data-path]').forEach(a=>{
      if(a.dataset.path === key || (!currentPath.length && a.dataset.path === 'home')) a.classList.add('active');
    });
  }

  function renderFolder(){
    const {folders, tests: directTests} = childrenFor(currentPath);
    const term = searchTerm.trim().toLowerCase();
    const visibleTests = directTests.filter(t=>{
      const hay = `${t.title || ''} ${t.original || ''} ${t.file || ''}`.toLowerCase();
      return !term || hay.includes(term);
    });
    const visibleFolders = folders.filter(f=>!term || displayName(f.name).toLowerCase().includes(term));
    const currentName = currentPath.length ? displayName(currentPath[currentPath.length-1]) : 'Browse Tests';

    document.body.classList.toggle('subject-level', currentPath.length === 1 && /topic/i.test(currentPath[0]));
    els.pathLabel.textContent = currentPath.length ? 'Course Content' : 'Dashboard';
    els.pageTitle.textContent = currentName;
    els.pageSubtitle.textContent = currentPath.length ? 'Choose a folder or start a test.' : 'Topic-wise practice arranged folder by folder.';
    els.crumbTrail.textContent = currentPath.length ? currentPath.map(displayName).join(' / ') : 'Course Content';
    els.sectionTitle.textContent = currentName;
    els.sectionMeta.textContent = directTests.length ? `${visibleTests.length} of ${directTests.length} tests shown.` : `${visibleFolders.length} folders available.`;
    els.searchInput.value = searchTerm;
    els.searchInput.placeholder = directTests.length ? 'Search Percentage, Ratio, CAT 2023...' : 'Search folder...';
    els.backButton.style.display = currentPath.length ? 'inline-flex' : 'none';

    els.folderGrid.innerHTML = visibleFolders.map(f=>`<button class="folder-card" type="button" data-path="${escapeHtml(f.path.join('||'))}">
      <div><span class="folder-icon">${escapeHtml(iconFor(f.name))}</span><h3>${escapeHtml(displayName(f.name))}</h3><p>${f.count} test${f.count===1?'':'s'} available</p><span class="open-text">Open →</span></div>
    </button>`).join('');
    els.folderGrid.querySelectorAll('[data-path]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        currentPath = btn.dataset.path.split('||');
        searchTerm = '';
        setHash(currentPath);
        render();
      });
    });

    els.testGrid.innerHTML = visibleTests.map(t=>{
      const tags = [currentPath[0], currentPath[1], currentPath[currentPath.length-1]].filter(Boolean).map(displayName);
      const minutes = t.minutes ? `${t.minutes} min` : '';
      return `<article class="test-card"><div><h3>${escapeHtml(t.title || 'Untitled Test')}</h3><div class="meta-row">
        ${tags.slice(0,3).map(x=>`<span class="pill">${escapeHtml(x)}</span>`).join('')}${minutes?`<span class="pill">${escapeHtml(minutes)}</span>`:''}
      </div></div><a class="start-btn" href="${escapeHtml(t.file || '#')}" target="_blank" rel="noopener">Start Test →</a></article>`;
    }).join('');

    if(!visibleFolders.length && !visibleTests.length){
      els.testGrid.innerHTML = `<div class="empty">${term ? 'No matching folder or test found.' : 'No tests available in this folder.'}</div>`;
    }
  }

  function render(){
    setMetrics();
    updateActiveNav();
    if(!currentPath.length){
      document.body.classList.remove('subject-level');
      els.homePanel.hidden = false;
      els.folderPanel.hidden = true;
      els.pathLabel.textContent = 'Course Content';
      els.pageTitle.textContent = 'CAT Prep Dashboard';
      els.pageSubtitle.textContent = 'Topic-wise practice arranged folder by folder.';
      renderHomeModules();
      return;
    }
    els.homePanel.hidden = true;
    els.folderPanel.hidden = false;
    renderFolder();
  }

  els.backButton.addEventListener('click',()=>{
    currentPath = currentPath.slice(0,-1);
    searchTerm = '';
    setHash(currentPath);
    render();
  });
  els.searchInput.addEventListener('input',e=>{ searchTerm = e.target.value; render(); });
  window.addEventListener('hashchange',()=>{ currentPath = pathFromHash(); searchTerm=''; render(); });

  currentPath = pathFromHash();
  if(!location.hash) setHash([]);
  render();
})();
