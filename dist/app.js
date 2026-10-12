import {labels, score, rank, filterCases, reviewMessage} from './logic.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const pageNames = {overview:'Overview', library:'Use-case library', shortlist:'Starter prototypes', evidence:'Source map', demo:'Inbox demo'};
const reviewText = {Low:'Staff review before any action.', Medium:'A person checks accuracy and approves the output.', High:'Specialist review and approval before use.'};
const caseIcons = {records:'file', redaction:'shield', intake:'inbox', guidance:'search', translation:'file'};
const areaIcons = {'Clinical administration':'file', 'Patient services':'user', 'Quality and operations':'chart', 'Public health':'layers', 'Patient safety':'shield', 'Health data':'layers'};
const compared = new Set();
let data, weights, byId, examples;
let currentPage = 'overview';
let menuOpen = false;
let navigationReturnFocus;

async function loadCatalogue() {
  try {
    const response = await fetch('./catalogue.json');
    if (!response.ok) throw new Error('Catalogue unavailable');
    data = await response.json();
    weights = {...data.weights};
    byId = new Map(data.cases.map(c => [c.id, c]));
    examples = new Map(data.examples.map(e => [e.id, e]));
    initialize();
    $('#loadingState').hidden = true;
  } catch (error) {
    $('#loadingState').hidden = true;
    $('#overview').innerHTML = `<div class="loading-error" role="alert"><h2>The library couldn’t load.</h2><p>Check your connection and try again. Your workspace needs its catalogue to show use cases and sources.</p><button class="button primary" id="retryLoad">Try again</button></div>`;
    $('#retryLoad').onclick = () => location.reload();
    console.error(error);
  }
}

function reviewBadge(c) {
  return `<span class="badge review-${c.risk.toLowerCase()}">${icon('shield')}${esc(c.risk)} review burden</span>`;
}

function goPage(target, {focus = true, updateHash = true} = {}) {
  if (!pageNames[target]) target = 'overview';
  currentPage = target;
  for (const section of $$('.page')) {
    const active = section.id === target;
    section.hidden = !active;
    section.classList.toggle('active', active);
  }
  for (const button of $$('.nav-item')) {
    const active = button.dataset.page === target;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  $('#breadcrumb').textContent = pageNames[target];
  document.title = `${pageNames[target]} · Healthcare Strategy Agent`;
  setMenu(false, false);
  if (updateHash && location.hash !== '#'+target) history.pushState(null, '', '#'+target);
  if (focus) {
    const heading = $('#'+target+' h1');
    heading?.focus({preventScroll:true});
    window.scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  }
}

function bindOpen(container) {
  container.querySelectorAll('[data-open]').forEach(button => {
    button.onclick = () => openDetail(button.dataset.open);
  });
}

function starterCard(c, index, featured = false, showScore = false) {
  return `<article class="starter-card ${featured ? 'featured' : ''}">
    <div class="card-heading"><span class="icon-tile">${icon(caseIcons[c.id] || areaIcons[c.sub_category] || 'file')}</span><span class="${showScore ? 'rank-number' : 'recommendation'}">${showScore ? `Priority ${index+1} · ${score(c,weights)}/100` : (index === 0 ? 'Start here' : `Starter ${index+1}`)}</span></div>
    <h3>${esc(c.title)}</h3><p>${esc(c.workflow)}</p>
    <div class="role-line">${icon('user')}<span>${esc(c.user)}</span></div>
    <div class="card-actions">${reviewBadge(c)}<button class="text-button" data-open="${c.id}">View use case${icon('arrow')}</button></div>
  </article>`;
}

function renderDashboard() {
  const top = rank(data, weights).slice(0,5);
  $('#dashboardStats').innerHTML = [[data.cases.length,'Healthcare workflows'],[data.examples.length,'Selected source records'],[top.length,'Starter prototypes'],[1,'Working fictional demo']].map(([n,label]) => `<div class="metric"><strong>${n}</strong><p>${label}</p></div>`).join('');
  $('#starterCards').innerHTML = top.map((c,i) => starterCard(c,i,i===0)).join('');
  bindOpen($('#starterCards'));
  const areas = [...new Set(data.cases.map(c => c.sub_category))];
  const counts = areas.map(area => data.cases.filter(c => c.sub_category === area).length);
  const max = Math.max(...counts);
  $('#workflowChart').innerHTML = areas.map((area,i) => `<div class="mix-row"><span>${esc(area)}</span><strong>${counts[i]} <span class="sr-only">workflows</span></strong><div class="mix-track" aria-hidden="true"><span style="width:${counts[i]/max*100}%"></span></div></div>`).join('') + `<p class="chart-scale">Number of workflows · scale 0–${max} · ${data.cases.length} in total</p>`;
  $('#shortlistRows').innerHTML = top.map((c,i) => starterCard(c,i,false,true)).join('');
  bindOpen($('#shortlistRows'));
}

function filters() {
  return {scope:'Healthcare', query:$('#search').value.trim(), area:$('#area').value, level:$('#level').value, source:$('#source').value};
}

function resetFilters() {
  ['search','area','level','source'].forEach(id => $('#'+id).value = '');
  renderLibrary();
  $('#search').focus();
}

function renderLibrary() {
  const cases = filterCases(data, weights, filters());
  $('#resultCount').textContent = `${cases.length} of ${data.cases.length} use cases`;
  $('#opportunities').innerHTML = cases.map(c => `<article class="use-case-card">
    <div class="card-area"><span>${esc(c.sub_category)}</span><span class="score-note">Suitability ${score(c,weights)}/100</span></div>
    <h3>${esc(c.title)}</h3><p>${esc(c.workflow)}</p>
    <div class="role-line">${icon('user')}<span>${esc(c.user)}</span></div>
    <div class="review-description">${icon('shield')}<span><strong>${esc(c.risk)} review burden.</strong> ${reviewText[c.risk]}</span></div>
    <div class="case-footer"><label class="compare-toggle"><input type="checkbox" data-compare="${c.id}" ${compared.has(c.id) ? 'checked' : ''} aria-label="Compare ${esc(c.title)}">Compare</label><button class="button secondary" data-open="${c.id}" aria-label="View use case: ${esc(c.title)}">View use case${icon('arrow')}</button></div>
  </article>`).join('') || `<div class="empty-state"><span class="icon-tile">${icon('search')}</span><h3>No matching workflows.</h3><p>Try another phrase, broaden the review level or reset the filters to see the full library.</p><button class="button secondary" id="emptyReset">Reset filters</button></div>`;
  bindOpen($('#opportunities'));
  $('#emptyReset')?.addEventListener('click', resetFilters);
  $('#opportunities').querySelectorAll('[data-compare]').forEach(input => {
    input.onchange = () => {
      if (input.checked && compared.size >= 3) {
        input.checked = false;
        $('#compareCount').textContent = 'Three selected. Remove one to add another.';
        $('#announcer').textContent = 'You can compare three use cases. Remove one before adding another.';
        return;
      }
      input.checked ? compared.add(input.dataset.compare) : compared.delete(input.dataset.compare);
      renderComparison();
    };
  });
  renderComparison();
}

function renderComparison() {
  const cases = [...compared].map(id => byId.get(id));
  $('#compareCount').textContent = cases.length ? `${cases.length} selected · up to 3` : 'Select up to 3 to compare';
  $('#comparison').hidden = !cases.length;
  if (!cases.length) { $('#comparison').innerHTML = ''; return; }
  const rows = [['Intended user', c=>c.user],['Proposed workflow', c=>c.workflow],['Reviewable output', c=>c.demo_output],['Human review', c=>c.risk+' burden. '+reviewText[c.risk]],['Success measure', c=>c.metric],['Analyst suitability', c=>score(c,weights)+'/100']];
  $('#comparison').innerHTML = `<section class="comparison-panel" aria-labelledby="comparisonTitle"><div class="comparison-heading"><h2 id="comparisonTitle">Compare use cases</h2><button class="text-button" id="clearCompare">Clear selection</button></div><div class="comparison-chips">${cases.map(c=>`<span class="comparison-chip"><span>${esc(c.title)}</span><button data-remove="${c.id}" aria-label="Remove ${esc(c.title)} from comparison">${icon('close')}</button></span>`).join('')}</div><div class="table-scroll" role="region" tabindex="0" aria-label="Use-case comparison, scroll horizontally on small screens"><table class="comparison-table"><caption class="sr-only">Selected healthcare use cases compared by workflow, review and success measure</caption><thead><tr><th scope="col"><span class="sr-only">Criteria</span></th>${cases.map(c=>`<th scope="col">${esc(c.title)}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,value])=>`<tr><th scope="row">${label}</th>${cases.map(c=>`<td>${esc(value(c))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
  $('#clearCompare').onclick = () => { compared.clear(); renderLibrary(); $('#search').focus(); };
  $('#comparison').querySelectorAll('[data-remove]').forEach(button => button.onclick = () => {
    compared.delete(button.dataset.remove);
    const checkbox = $('#opportunities').querySelector(`[data-compare="${button.dataset.remove}"]`);
    if (checkbox) checkbox.checked = false;
    renderComparison();
    if (compared.size) $('#comparison').querySelector('[data-remove]')?.focus();
    else $('#search').focus();
  });
}

function sourceRecord(e) {
  return `<article class="source-record"><a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.name)}${icon('external')}<span class="sr-only">(opens in a new tab)</span></a><div class="source-record-meta"><span>${esc(e.organization)}</span><span>CSV record ${e.row}</span><span class="stage ${e.stage === 'Deployed' ? 'stage-deployed' : e.stage === 'Pilot' ? 'stage-pilot' : ''}">HHS: ${esc(e.stage)}</span></div></article>`;
}

function openDetail(id) {
  const c = byId.get(id);
  if (!c) return;
  const source = data.sources.find(s => s.id === c.source_id);
  const sections = [['Problem',c.pain],['Proposed workflow',c.workflow],['Example input',c.demo_input],['Reviewable output',c.demo_output],['Success measure',c.metric]];
  $('#detailContent').innerHTML = `<div class="detail-header"><div class="section-label">${esc(c.sub_category)}</div><h2 id="detailTitle">${esc(c.title)}</h2><div class="detail-badges"><span class="badge prototype-status">Proposed prototype</span>${reviewBadge(c)}</div><div class="role-line">${icon('user')}<span>${esc(c.user)}</span></div></div><div class="detail-body"><div class="detail-flow">${sections.map(([heading,text],i)=>`<section class="detail-section ${i===4 ? 'full-width' : ''}"><h3><span class="section-number">0${i+1}</span>${heading}</h3><p>${esc(text)}</p></section>`).join('')}</div><section class="source-detail"><h3><span class="section-number">06</span> Original source and adaptation</h3><p>These are <strong>HHS-reported systems</strong>. Their deployment stages do not describe this proposed prototype.</p><div class="source-records">${c.examples.map(id=>sourceRecord(examples.get(id))).join('')}</div><h3>The local adaptation</h3><p>${esc(c.adaptation)}</p><details><summary>Source context and prototype boundaries</summary><p><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)} (opens in a new tab)</a><br>${esc(c.locator)}</p><p>${esc(source.note)}</p><p>${esc(c.stage)}. ${reviewText[c.risk]} Clinical outputs require a qualified reviewer. HHS outcomes have not been replicated here.</p></details></section><div class="detail-bottom"><p class="score-note">Analyst suitability: ${score(c,weights)}/100.<br>A fictional-data estimate, not validated ROI or clinical effectiveness.</p><button class="button primary" id="downloadBrief">${icon('download')}Download prototype brief</button></div></div>`;
  $('#downloadBrief').onclick = () => downloadBrief(c);
  $('#detailDialog').showModal();
}

function downloadBrief(c) {
  const source = data.sources.find(s => s.id === c.source_id);
  const text = `# ${c.title}\n\nPrepared by Natasha\n\nGroup: ${c.category} / ${c.sub_category}\nRole: ${c.user}\nPrototype status: ${c.stage}\n\nProblem: ${c.pain}\n\nProposed workflow: ${c.workflow}\n\nExample input: ${c.demo_input}\n\nReviewable output: ${c.demo_output}\n\nSuccess measure: ${c.metric}\n\nHuman review: ${c.risk} burden. ${reviewText[c.risk]} Clinical outputs require qualified review.\n\nSource: ${source.title}, ${c.locator}\n${source.url}\n\nOriginal HHS entries (stages describe HHS systems, not this prototype):\n${c.examples.map(id => {const e=examples.get(id); return `${e.name} — ${e.organization}; CSV record ${e.row}; ${e.stage}; ${e.url}`;}).join('\n')}\n\nLocal adaptation: ${c.adaptation}\n\nAnalyst suitability: ${score(c,weights)}/100. Fictional-data prototype estimate; not measured ROI or clinical effectiveness. Human approval before any live action.\n`;
  const url = URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = c.id+'-brief.md';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url),30000);
  $('#announcer').textContent = `Download started for ${c.title}.`;
}

function renderEvidence() {
  const query = $('#evidenceSearch').value.trim().toLowerCase();
  const source = $('#evidenceSource').value;
  const entries = data.examples.filter(e => (!source || e.source_id===source) && [e.name,e.organization,e.row,e.stage,e.mapping_type,...e.case_ids.map(id=>byId.get(id).title)].join(' ').toLowerCase().includes(query));
  $('#evidenceCount').textContent = `${entries.length} of ${data.examples.length} source records`;
  $('#evidenceRows').innerHTML = entries.map(e=>`<tr><td><a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.name)}<span class="external-icon">${icon('external')}</span><span class="sr-only"> (opens in a new tab)</span></a></td><td>${esc(e.organization)}</td><td>${e.row}</td><td><span class="stage ${e.stage==='Deployed'?'stage-deployed':e.stage==='Pilot'?'stage-pilot':''}">${esc(e.stage)}</span></td><td>${e.case_ids.map(id=>`<button class="workflow-link" data-open="${id}">${esc(byId.get(id).title)}</button>`).join('')}</td></tr>`).join('') || `<tr><td colspan="5"><div class="empty-state"><h3>No matching source records.</h3><p>Try a different agency, original name or workflow.</p><button class="text-button" id="resetSource">Reset source search</button></div></td></tr>`;
  bindOpen($('#evidenceRows'));
  $('#resetSource')?.addEventListener('click',()=>{$('#evidenceSearch').value='';$('#evidenceSource').value='';renderEvidence();$('#evidenceSearch').focus();});
}

function renderWeights() {
  $('#weightControls').innerHTML = Object.keys(weights).map(key=>`<div class="weight-row"><label for="weight-${key}">${labels[key]}</label><output id="output-${key}" for="weight-${key}">${weights[key]}</output><input id="weight-${key}" data-weight="${key}" type="range" min="0" max="50" value="${weights[key]}" aria-describedby="output-${key}"></div>`).join('');
  $$('[data-weight]').forEach(input=>input.oninput=()=>{
    const next=Number(input.value),key=input.dataset.weight;
    if (Object.entries(weights).every(([k,v])=>k===key ? next===0 : v===0)) {
      input.value=weights[key];
      $('#announcer').textContent='Keep at least one ranking priority above zero.';
      return;
    }
    weights[key]=next;
    $('#output-'+key).textContent=next;
    renderLibrary();
    renderDashboard();
  });
}

function setMenu(open, restoreFocus=true) {
  menuOpen=open;
  const mobile=matchMedia('(max-width: 950px)').matches;
  document.body.classList.toggle('menu-open',open && mobile);
  $('#menuToggle').setAttribute('aria-expanded',String(open));
  $('#navBackdrop').hidden=!open || !mobile;
  $('#navigation').inert=mobile && !open;
  $('.app-shell').inert=mobile && open;
  if (open && mobile) {
    navigationReturnFocus=document.activeElement;
    $('#navigation').setAttribute('role','dialog');
    $('#navigation').setAttribute('aria-modal','true');
    $('#closeNavigation').focus();
  } else {
    $('#navigation').removeAttribute('role');
    $('#navigation').removeAttribute('aria-modal');
    if (restoreFocus && navigationReturnFocus) navigationReturnFocus.focus();
  }
}

function runDemo() {
  const result = reviewMessage($('#message').value);
  if (!result) {
    $('#demoResult').innerHTML=`<div class="demo-empty"><h3>Add a fictional message.</h3><p>Choose a sample or enter a message to see the proposed output.</p></div>`;
    $('#message').focus();
    return;
  }
  const clinical = result.queue==='Qualified care team';
  $('#demoResult').innerHTML=`<div class="${clinical ? 'clinical-output' : ''}"><h3 class="output-category">${esc(result.category)}</h3><div class="queue-box"><span>Proposed queue</span><strong>${esc(result.queue)}</strong></div><h3 class="draft-label">${clinical?'Clinical reply withheld':'Draft response'}</h3><div class="draft-box">${esc(result.draft)}</div><div class="review-required">${icon('user')}<span><strong>Staff review required.</strong> ${clinical?'A qualified care team must review this message.':'A person must check and approve this draft.'} Nothing has been sent.</span></div><p class="rule-reference">${esc(result.reference)}</p></div>`;
}

function initialize() {
  $$('svg.icon').forEach(svg=>svg.setAttribute('aria-hidden','true'));
  $('#healthCount').textContent=data.cases.length;
  $('#area').innerHTML='<option value="">All areas</option>'+[...new Set(data.cases.map(c=>c.sub_category))].sort().map(area=>`<option value="${esc(area)}">${esc(area)}</option>`).join('');
  $$('[data-page]').forEach(button=>button.onclick=()=>goPage(button.dataset.page));
  $('.brand').onclick=event=>{event.preventDefault();goPage('overview');};
  ['search','area','level','source'].forEach(id=>$('#'+id).addEventListener(id==='search'?'input':'change',renderLibrary));
  $('#resetFilters').onclick=resetFilters;
  $('#evidenceSearch').oninput=renderEvidence;
  $('#evidenceSource').onchange=renderEvidence;
  ['priorityButton','shortlistPriorities','libraryMethod'].forEach(id=>$('#'+id).onclick=()=>$('#priorityDialog').showModal());
  $('#resetWeights').onclick=()=>{weights={...data.weights};renderWeights();renderLibrary();renderDashboard();$('#resetWeights').focus();$('#announcer').textContent='Ranking priorities reset.';};
  $('#closeDetail').onclick=()=>$('#detailDialog').close();
  $('#closePriorities').onclick=()=>$('#priorityDialog').close();
  ['detailDialog','priorityDialog'].forEach(id=>$('#'+id).addEventListener('click',event=>{if(event.target===$('#'+id)){const rect=event.target.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)event.target.close();}}));
  $('#menuToggle').onclick=()=>setMenu(!menuOpen);
  $('#closeNavigation').onclick=()=>setMenu(false);
  $('#navBackdrop').onclick=()=>setMenu(false);
  matchMedia('(max-width: 950px)').addEventListener('change',()=>setMenu(false,false));
  document.addEventListener('keydown',event=>{
    if (event.key==='Escape' && menuOpen) setMenu(false);
    if (event.key==='Tab' && menuOpen) {
      const controls=$$('#navigation a, #navigation button').filter(el=>el.getClientRects().length);
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    }
    if(event.key==='/' && currentPage==='library' && !$('#detailDialog').open && !$('#priorityDialog').open && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){event.preventDefault();$('#search').focus();}
  });
  const samples={booking:'Hello, I would like to reschedule my appointment. Can you help?',invoice:'Please send me a copy of my invoice for last week.',clinical:'I have a new symptom and want advice about my medication.'};
  $$('[data-sample]').forEach(button=>button.onclick=()=>{$('#message').value=samples[button.dataset.sample];$$('[data-sample]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
  $('#message').oninput=()=>$$('[data-sample]').forEach(button=>button.setAttribute('aria-pressed','false'));
  $('#runDemo').onclick=runDemo;
  window.addEventListener('popstate',()=>{const page=location.hash.slice(1);if(pageNames[page])goPage(page,{focus:true,updateHash:false});});
  window.addEventListener('hashchange',()=>{const page=location.hash.slice(1);if(pageNames[page])goPage(page,{focus:true,updateHash:false});});
  renderWeights();
  renderDashboard();
  renderLibrary();
  renderEvidence();
  goPage(location.hash.slice(1)||'overview',{focus:false,updateHash:false});
}

loadCatalogue();
