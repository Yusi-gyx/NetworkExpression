import { experimentOptions, getExperimentLesson } from './experiments.js';
import { layers } from './curriculum.js';
import { renderTopology, renderDetail } from './visuals.js';
import { clampStep, getLesson, lessons } from './lessons.js';
import { checkpoints, concepts, filterLessons, lessonGroups, loadProgress, recordProgress, saveProgress } from './learning.js';

const app = document.querySelector('#app');
const initialId = new URLSearchParams(location.search).get('lesson');
let storage = null;
try { storage = window.localStorage; } catch { /* Storage may be unavailable. */ }
const state = {
  lessonId: getLesson(initialId).id,
  stepIndex: 0,
  playing: false,
  timer: null,
  search: '',
  selectedNode: null,
  experiment: 'default',
  fit: false,
  speed: 6000,
  conceptQuery: '',
  group: '全部',
  answers: {},
  visited: { [`${getLesson(initialId).id}:default`]: new Set([0]) },
  progress: loadProgress(storage, lessons.map((lesson) => lesson.id)),
};

const iconPaths = {
  layers: '<rect x="4" y="5" width="16" height="4" rx="1"/><rect x="4" y="10" width="16" height="4" rx="1"/><rect x="4" y="15" width="16" height="4" rx="1"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-3 3-4 6-4 9s1 6 4 9M12 3c3 3 4 6 4 9s-1 6-4 9"/>',
  arrows: '<path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4"/>',
  window: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  reset: '<path d="M3 12a9 9 0 1 0 2.5-6.2M3 4v5h5"/>',
  spark: '<path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2ZM19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 12 18.5 5.5"/>',
  address: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h5M7 13h10M16 9h1"/>',
  route: '<circle cx="5" cy="18" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="m6 16 5-8m2 0 5 8"/>',
  pulse: '<path d="M2 12h4l2-5 4 10 3-7 2 2h5"/>',
};

function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function renderLessonCard(lesson) {
  const active = lesson.id === state.lessonId;
  const mastered = state.progress.mastered.includes(lesson.id);
  const completed = state.progress.completed.includes(lesson.id);
  return `<button class="lesson-card ${active ? 'is-active' : ''}" type="button" data-action="lesson" data-id="${lesson.id}" aria-pressed="${active}">
    <span class="lesson-card-icon">${icon(lesson.icon)}</span>
    <span class="lesson-card-copy"><span class="lesson-card-category">${lesson.category} <span class="lesson-card-number">${lesson.number}</span></span><strong>${lesson.shortTitle}</strong><small>${lesson.subtitle}</small></span>
    <span class="lesson-card-chevron ${mastered ? 'is-mastered' : ''}">${mastered ? icon('check') : completed ? '●' : icon('right')}<span class="sr-only">${mastered ? '自测通过' : completed ? '演示已完成' : '未完成'}</span></span>
  </button>`;
}

function renderLessonList() {
  const matching = filterLessons(lessons, state.search, state.group);
  return matching.length ? matching.map(renderLessonCard).join('') : '<p class="catalog-empty">没有找到相关场景。试试其他关键词或分类。</p>';
}

function renderCatalogTools() {
  return `<div class="catalog-tools"><label class="catalog-search" for="lesson-search">${icon('search')}<input id="lesson-search" type="search" placeholder="搜索协议、概念…" autocomplete="off" value="${escapeHtml(state.search)}" aria-label="搜索学习场景"></label>
    <label class="catalog-select-label" for="lesson-group">按层级筛选</label><select id="lesson-group" aria-label="按层级筛选场景">${lessonGroups.map((group) => `<option value="${group}" ${state.group === group ? 'selected' : ''}>${group === '全部' ? '全部主题' : group}</option>`).join('')}</select></div>`;
}

function renderCheckpoint(lesson, unlocked) {
  const checkpoint = checkpoints[lesson.id];
  if (!unlocked) return `<section class="checkpoint checkpoint-locked" aria-label="知识自测"><div class="checkpoint-heading"><span>QUICK CHECK / 知识自测</span><small>浏览全部步骤后开放</small></div><p>看过本场景的每一步后，用一道题检验是否理解了关键概念。</p></section>`;
  const selected = state.answers[lesson.id];
  const attempted = Number.isInteger(selected);
  const mastered = state.progress.mastered.includes(lesson.id);
  const optionButtons = checkpoint.options.map((option, index) => {
    const status = attempted || mastered ? index === checkpoint.answer ? 'is-correct' : selected === index ? 'is-wrong' : '' : '';
    return `<button type="button" class="quiz-option ${status}" data-action="answer" data-option="${index}" ${mastered ? 'disabled' : ''} aria-pressed="${selected === index}"><span>${String.fromCharCode(65 + index)}</span>${escapeHtml(option)}</button>`;
  }).join('');
  const feedback = attempted || mastered ? `<div class="quiz-feedback ${mastered ? 'is-success' : 'is-error'}" tabindex="-1" data-quiz-feedback role="status"><strong>${mastered ? '回答正确，已掌握！' : '再想一想，可以继续选择。'}</strong><span>${escapeHtml(checkpoint.explanation)}</span></div>` : '';
  return `<section class="checkpoint" aria-labelledby="quiz-title"><div class="checkpoint-heading"><span>QUICK CHECK / 知识自测</span><small>${mastered ? '已通过' : '选择一个答案'}</small></div><h4 id="quiz-title">${escapeHtml(checkpoint.question)}</h4><div class="quiz-options" role="group" aria-label="自测选项">${optionButtons}</div>${feedback}</section>`;
}

function renderConcepts() {
  const matching=concepts.filter(concept=>[concept.term,concept.definition,concept.group].some(value=>value.toLowerCase().includes(state.conceptQuery.trim().toLowerCase())));
  if(!matching.length) return '<p>没有匹配的概念，请尝试其他关键词。</p>';
  return matching.map((concept) => `<article class="concept-card"><span class="concept-group">${escapeHtml(concept.group)}</span><h3>${escapeHtml(concept.term)}</h3><p>${escapeHtml(concept.definition)}</p><button type="button" data-action="related" data-id="${concept.related}">查看相关演示 ${icon('arrow')}</button></article>`).join('');
}

function renderStage(lesson, step) {
  return `<section class="stage" aria-label="拓扑与协议观察"><div class="stage-topline"><span><span class="live-dot"></span> 教学拓扑 · 可逐步回放</span><span>步骤 ${state.stepIndex + 1} / ${lesson.steps.length}</span></div>
    ${renderTopology(lesson, step, state.selectedNode, state.fit)}
    <div class="packet-area"><span class="packet-area-label">本步报文 / 本地操作</span><strong>${escapeHtml(step.message)}</strong><div class="packet-row">${step.segments.filter(segment=>step.segments.length>1||segment.label!==step.message).map(segment=>`<span class="packet-segment type-${segment.type}">${escapeHtml(segment.label)}</span>`).join('')}</div></div>
    ${renderDetail(lesson, step, state.stepIndex)}
  </section>`;
}

function renderArchitecture() {
  return `<section id="architecture" class="architecture container"><div class="architecture-intro"><span class="eyebrow">先建立地图，再进入细节</span><h1>一条消息，<br>怎样穿过网络？</h1><p>从五层体系结构出发，在真实设备组成的教学拓扑上追踪路径，再打开设备内部，观察协议如何改变状态。</p><div class="hero-actions"><button class="primary-link" type="button" data-action="related" data-id="journey">先看一次网页访问全程 ↗</button><button class="text-link" type="button" data-action="related" data-id="encapsulation">从封装开始 →</button></div><p class="architecture-note">采用五层教学模型：TCP/IP 常把链路与物理合称网络接口层；OSI 的会话、表示功能归入应用侧理解。模型用于分工，不代表五台设备。</p><div class="coverage-stat"><strong>${lessons.length}</strong> 个逐步实验 <span>·</span> ${layers.length} 个层级 <span>·</span> 本地保存进度</div></div><div class="layer-map" aria-label="五层体系结构学习地图">${layers.map(layer=>`<div class="layer-row" style="--layer-color:${{'应用层':'#4079ae','传输层':'#7760ac','网络层':'#208579','链路层':'#b07b31','物理层':'#687d8c'}[layer.id]}"><button class="layer-select" data-action="group" data-group="${layer.id}" aria-label="筛选${layer.id}实验"><span class="layer-number">${layer.number}</span><span><strong>${layer.id}</strong><small>${layer.role}</small></span><span class="layer-unit">${layer.unit}</span></button><div class="layer-topics">${layer.ids.map(id=>`<button type="button" data-action="related" data-id="${id}">${escapeHtml(getLesson(id).shortTitle)}</button>`).join('')}</div></div>`).join('')}<p class="map-caption">端系统运行完整协议栈 · 路由器通常处理到网络层 · 交换机主要处理链路层</p></div></section>`;
}

function renderTimeline(lesson) {
  return `<div class="timeline" role="group" aria-label="步骤导航">${lesson.steps.map((step, index) => {
    const active = index === state.stepIndex;
    const completed = state.visited[`${lesson.id}:${state.experiment}`]?.has(index) ?? false;
    return `<button type="button" class="timeline-step ${active ? 'is-active' : ''} ${completed ? 'is-complete' : ''}" data-action="step" data-step="${index}" aria-label="第 ${index + 1} 步：${escapeHtml(step.title)}" ${active ? 'aria-current="step"' : ''}><span>${completed ? icon('check') : String(index + 1).padStart(2, '0')}</span></button>`;
  }).join('')}</div>`;
}

function render() {
  const focused = document.activeElement?.dataset;
  const lesson = getExperimentLesson(state.lessonId,state.experiment);
  state.stepIndex = clampStep(lesson, state.stepIndex);
  const step = lesson.steps[state.stepIndex];
  const atStart = state.stepIndex === 0;
  const atEnd = state.stepIndex === lesson.steps.length - 1;
  app.innerHTML = `<div class="site-shell"><a class="skip-link" href="#learning">跳到交互实验</a><header class="site-header"><div class="container header-inner"><a class="brand" href="#architecture"><span class="brand-mark">N<span>↗</span></span><span>NetworkExpression<small>计算机网络 · 可视化实验室</small></span></a><nav aria-label="主导航"><a href="#architecture">体系结构</a><a href="#learning">拓扑实验</a><a href="#concepts">概念索引</a></nav><span class="offline-badge">● 无需联网运行</span></div></header><main>
    ${renderArchitecture()}
    <section id="learning" class="learning-section"><div class="container"><div class="section-heading"><div><span class="eyebrow">交互实验 / OBSERVE & EXPLAIN</span><h2>看路径，也看每一步为什么发生。</h2><p>选择实验 → 先读起点 → 逐步观察 → 用自测验证理解</p></div><span class="learning-summary">已完成 ${state.progress.completed.length} / ${lessons.length}<br>自测通过 ${state.progress.mastered.length} / ${lessons.length}</span></div>
    <div class="experience-layout"><aside class="lesson-sidebar" aria-label="课程目录"><div class="sidebar-heading"><strong>按体系结构探索</strong><span id="catalog-count">${filterLessons(lessons,state.search,state.group).length} / ${lessons.length}</span></div>${renderCatalogTools()}<div class="lesson-list">${renderLessonList()}</div></aside><div class="lesson-workspace">
    <div class="lesson-overview"><div><span class="lesson-overline">${lesson.group} / 实验 ${lesson.number}</span><h3>${lesson.title}</h3><p>${lesson.summary}</p></div><span class="duration">${lesson.duration}</span></div>
    ${experimentOptions[lesson.id]?`<div class="experiment-controls"><label for="experiment-condition">动手改变条件 <select id="experiment-condition">${experimentOptions[lesson.id].map(option=>`<option value="${option.id}" ${option.id===state.experiment?'selected':''}>${option.label}</option>`).join('')}</select></label><span>选择后从起点重放，比较路径与状态变化。</span></div>`:''}<div class="starting-point"><strong>实验起点与边界</strong><p>${escapeHtml(lesson.assumption)}</p></div>
    <div class="playback-panel"><div class="playback-controls"><button class="control-button" type="button" data-action="reset" ${atStart?'disabled':''}>↺ 重置</button><div class="control-main"><button class="control-button" type="button" data-action="prev" ${atStart?'disabled':''}>← 上一步</button><button class="control-button control-play" type="button" data-action="play">${state.playing?'Ⅱ 暂停':'▷ 自动演示'}</button><button class="control-button control-next" type="button" data-action="next" ${atEnd?'disabled':''}>下一步 →</button></div><label class="speed-label">间隔 <select id="playback-speed" aria-label="自动演示间隔">${[4000,6000,10000].map(ms=>`<option value="${ms}" ${state.speed===ms?'selected':''}>${ms/1000} 秒</option>`).join('')}</select></label></div>${renderTimeline(lesson)}<div class="timeline-caption"><span>第 ${state.stepIndex+1} 步 · ${escapeHtml(step.title)}</span><span>可点击步骤跳转 · 逐步阅读后完成自测</span></div></div>
    <div class="simulation-grid">${renderStage(lesson,step)}<section class="explain-panel" aria-labelledby="step-title"><div class="explain-label">本步发生了什么 <span>${state.stepIndex+1} / ${lesson.steps.length}</span></div><div class="step-explanation"><span class="step-eyebrow">${escapeHtml(step.eyebrow)}</span><h4 id="step-title" tabindex="-1">${escapeHtml(step.title)}</h4><p>${escapeHtml(step.description)}</p><div class="insight-box"><strong>为什么这样做？</strong><p>${escapeHtml(step.insight)}</p></div><div class="state-box"><span>结果</span><strong>${escapeHtml(step.state)}</strong></div></div></section></div>
    <div class="principle-strip"><strong>这次实验要带走的理解</strong><p>${escapeHtml(lesson.principle)}</p><details><summary>原始标准与相关学习</summary><p class="source-links">${lesson.sources.map(source=>`<a href="${source.url}" target="_blank" rel="noreferrer">${source.label} ↗</a>`).join('')}</p><p>标准链接需要联网；全部演示内容已保存在本地。这里展示协议的教学过程，不是抓包结果、实测时延或完整协议实现。</p><div class="related-topics">${lessons.filter(item=>item.group===lesson.group&&item.id!==lesson.id).map(item=>`<button type="button" data-action="related" data-id="${item.id}">${escapeHtml(item.shortTitle)} →</button>`).join('')}</div></details></div>
    ${renderCheckpoint(lesson,state.progress.completed.includes(lesson.id))}
    <div class="learning-next"><span>建立联系</span><button type="button" data-action="related" data-id="${nextLesson(lesson.id)}">下一个：${escapeHtml(getLesson(nextLesson(lesson.id)).shortTitle)} →</button><a href="#architecture">回到五层地图 ↑</a></div>
    </div></div></div></section>
    <section id="concepts" class="concepts-section"><div class="container"><div class="section-heading"><div><span class="eyebrow">概念索引 / CONNECT THE IDEAS</span><h2>定义之后，还有可以观察的过程。</h2><p>每个概念都能回到对应实验。专题包含协议过程，索引补充分工、边界与相邻概念。</p></div><label class="concept-search-label">查找概念<input type="search" id="concept-search" placeholder="例如：窗口、子网、复用" value="${escapeHtml(state.conceptQuery)}"></label></div><div class="concept-grid">${renderConcepts()}</div></div></section>
    <section id="about" class="about-section container"><h2>覆盖范围与学习方式</h2><p>当前覆盖五层的入门主线，以及交换、寻址、路由控制、可靠传输、安全与常见应用协议。每个实验提供可观察状态和自测；路由策略、无线标准、密码学与性能算法仍有更深入的细节，不能用几步演示替代完整课程。</p><p>播放一步后，试着回答：谁在处理？报文在哪里？哪些字段改变了？为什么下一步会发生？本地完成记录仅说明你浏览了演示；自测通过也不等于已经掌握所有实际网络情况。</p></section>
    </main><footer class="site-footer container"><span>NetworkExpression · 从一条链路，理解整个网络</span><span>离线内容 · 浏览器本地进度 · 无账号</span></footer></div>`;
  const live = document.getElementById?.('player-announcement');
  if(live) live.textContent = `${lesson.shortTitle}，第 ${state.stepIndex+1} 步，共 ${lesson.steps.length} 步。${step.title}。${step.description}。当前状态：${step.state}`;
  if(focused?.action) {
    const selector = focused.action==='inspect' ? `[data-action="inspect"][data-node="${focused.node}"]` : focused.action==='step' ? `[data-action="step"][data-step="${focused.step}"]` : `[data-action="${focused.action}"]`;
    app.querySelector(selector)?.focus({preventScroll:true});
  }
}

function nextLesson(id) {
  const order=['encapsulation','journey',...[...layers].reverse().flatMap(layer=>layer.ids)];
  return order[(order.indexOf(id)+1)%order.length];
}

function stopPlayback() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
  state.playing = false;
}

function updateCatalog() {
  const matching = filterLessons(lessons, state.search, state.group);
  const list = app.querySelector('.lesson-list');
  const count = app.querySelector('#catalog-count');
  if (list) list.innerHTML = renderLessonList();
  if (count) count.textContent = `${matching.length} / ${String(lessons.length).padStart(2, '0')}`;
}

function recordCompletion() {
  const lesson = getExperimentLesson(state.lessonId,state.experiment);
  const visited = state.visited[`${lesson.id}:${state.experiment}`] ?? new Set([0]);
  visited.add(state.stepIndex);
  state.visited[`${lesson.id}:${state.experiment}`] = visited;
  if (visited.size < lesson.steps.length) return;
  state.progress = recordProgress(state.progress, lesson.id, 'completed');
  saveProgress(storage, state.progress);
}

function setStep(index) {
  stopPlayback();
  state.stepIndex = clampStep(getExperimentLesson(state.lessonId,state.experiment), index);
  recordCompletion();
  render();
}

function selectLesson(id, updateHistory = true) {
  stopPlayback();
  state.lessonId = getLesson(id).id;
  if(!filterLessons(lessons,state.search,state.group).some(lesson=>lesson.id===state.lessonId)){state.search='';state.group='全部';}
  state.stepIndex = 0;
  state.selectedNode = null;
  state.experiment = 'default';
  state.visited[`${state.lessonId}:default`] ??= new Set([0]);
  if (updateHistory) {
    const url = new URL(location.href);
    url.searchParams.set('lesson', state.lessonId);
    url.hash = 'learning';
    history.pushState(null, '', url);
  }
  render();
}

function togglePlayback() {
  if (state.playing) {
    stopPlayback();
    render();
    return;
  }
  const lesson = getExperimentLesson(state.lessonId,state.experiment);
  if (state.stepIndex === lesson.steps.length - 1) {
    state.stepIndex = 0;
    recordCompletion();
  }
  state.playing = true;
  render();
  state.timer = setInterval(() => {
    state.stepIndex += 1;
    recordCompletion();
    if (state.stepIndex === lesson.steps.length - 1) {
      stopPlayback();
    }
    render();
  }, state.speed);
}

app.addEventListener('click', (event) => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const { action } = control.dataset;
  const focusSelector = action === 'inspect' ? `[data-action="inspect"][data-node="${control.dataset.node}"]` : action === 'group' ? '#lesson-group' : action === 'lesson' || action === 'related' ? `[data-action="lesson"][data-id="${control.dataset.id}"]` : action === 'step' ? `[data-action="step"][data-step="${control.dataset.step}"]` : action === 'answer' ? `[data-action="answer"][data-option="${control.dataset.option}"]` : `[data-action="${action}"]`;

  if (action === 'inspect') { state.selectedNode=control.dataset.node; render(); }
  if (action === 'fit') { state.fit=!state.fit; render(); }
  if (action === 'group') { state.group=control.dataset.group; state.search=''; render(); app.querySelector('#learning')?.scrollIntoView(); }
  if (action === 'lesson') selectLesson(control.dataset.id);
  if (action === 'related') selectLesson(control.dataset.id);
  if (action === 'step') setStep(Number(control.dataset.step));
  if (action === 'prev') setStep(state.stepIndex - 1);
  if (action === 'next') setStep(state.stepIndex + 1);
  if (action === 'reset') setStep(0);
  if (action === 'play') togglePlayback();
  if (action === 'answer' && state.progress.completed.includes(state.lessonId)) {
    const lesson = getExperimentLesson(state.lessonId,state.experiment);
    const chosen = Number(control.dataset.option);
    state.answers[lesson.id] = chosen;
    if (chosen === checkpoints[lesson.id].answer) {
      state.progress = recordProgress(state.progress, lesson.id, 'mastered');
      saveProgress(storage, state.progress);
    }
    render();
  }

  const replacement = app.querySelector(focusSelector);
  if (replacement && !replacement.disabled) replacement.focus({ preventScroll: true });
  else (app.querySelector('[data-quiz-feedback]') ?? app.querySelector('#step-title'))?.focus({ preventScroll: true });
  if (action === 'related') app.querySelector('#learning')?.scrollIntoView({ behavior: 'smooth' });
});

app.addEventListener('input', (event) => {
  if (event.target.id === 'concept-search') { state.conceptQuery=event.target.value; const grid=app.querySelector('.concept-grid'); if(grid) grid.innerHTML=renderConcepts(); return; }
  if (event.target.id !== 'lesson-search') return;
  state.search = event.target.value;
  updateCatalog();
});

app.addEventListener('change', (event) => {
  if(event.target.id==='experiment-condition') { stopPlayback(); state.experiment=event.target.value; state.stepIndex=0; state.selectedNode=null; recordCompletion(); render(); app.querySelector('#experiment-condition')?.focus({preventScroll:true}); return; }
  if(event.target.id === 'playback-speed') { const playing=state.playing; stopPlayback(); state.speed=Number(event.target.value); if(playing) togglePlayback(); return; }
  if (event.target.id !== 'lesson-group') return;
  state.group = event.target.value;
  updateCatalog();
});

app.addEventListener('keydown', event => {
  const control=event.target.closest?.('g[data-action]');
  if(control && ['Enter',' '].includes(event.key)) { event.preventDefault(); if(control.dataset.action==='inspect') {state.selectedNode=control.dataset.node; render();} else setStep(Number(control.dataset.step)); }
});
let compactViewport=window.innerWidth<=520;
window.addEventListener('resize',()=>{const compact=window.innerWidth<=520;if(compact!==compactViewport){compactViewport=compact;render();}});
window.addEventListener('popstate', () => selectLesson(new URLSearchParams(location.search).get('lesson'), false));
render();
