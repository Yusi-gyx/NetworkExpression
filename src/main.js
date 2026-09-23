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
  group: '全部',
  answers: {},
  visited: { [getLesson(initialId).id]: new Set([0]) },
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
  return concepts.map((concept) => `<article class="concept-card"><span class="concept-group">${escapeHtml(concept.group)}</span><h3>${escapeHtml(concept.term)}</h3><p>${escapeHtml(concept.definition)}</p><button type="button" data-action="related" data-id="${concept.related}">查看相关演示 ${icon('arrow')}</button></article>`).join('');
}

function renderStage(lesson, step) {
  const source = lesson.nodes.find((node) => node.id === step.from);
  const target = lesson.nodes.find((node) => node.id === step.to);
  const hasMessage = Boolean(source && target);
  const nodeCards = lesson.nodes.map((node, index) => {
    const active = node.id === step.from || node.id === step.to;
    return `<div class="network-node ${active ? 'is-active' : ''} ${node.id === step.from ? 'is-source' : ''}" style="--node-order:${index}">
      <span class="network-node-orbit"><span class="network-node-core">${String(index + 1).padStart(2, '0')}</span></span>
      <strong>${escapeHtml(node.label)}</strong><small>${escapeHtml(node.detail)}</small>
    </div>`;
  }).join('');
  const packet = step.segments.map((segment) => `<span class="packet-segment type-${segment.type}">${escapeHtml(segment.label)}</span>`).join('');

  return `<div class="stage">
    <div class="stage-topline"><span><span class="live-dot"></span> LIVE SIMULATION</span><span>NE / ${lesson.number} &nbsp;·&nbsp; ${String(state.stepIndex + 1).padStart(2, '0')}</span></div>
    <div class="stage-main">
      <div class="stage-caption"><span class="stage-caption-rule"></span> 网络路径 <span class="stage-caption-en">NETWORK PATH</span></div>
      <div class="node-scroll"><div class="node-track" style="--node-count:${lesson.nodes.length};--track-width:${lesson.nodes.length * 88}px">${nodeCards}</div></div>
      <div class="transmission ${hasMessage ? 'is-moving' : ''}">
        <div class="transmission-top"><span>当前事件</span><span class="transmission-state">${escapeHtml(step.state)}</span></div>
        <div class="transmission-flow">
          <span class="endpoint">${escapeHtml(source?.label ?? '当前状态')}</span>
          <span class="flow-arrow">${hasMessage ? icon('arrow') : '<span class="flow-dashes">•••</span>'}</span>
          <span class="endpoint endpoint-target">${escapeHtml(target?.label ?? '观察中')}</span>
        </div>
        <div class="message-label">${escapeHtml(step.message)}</div>
      </div>
      <div class="packet-area"><span class="packet-area-label">${lesson.id === 'encapsulation' ? '数据单位结构' : '报文 / 状态'}</span><div class="packet-row">${packet}</div></div>
    </div>
    <div class="stage-footer"><span>STEP ${String(state.stepIndex + 1).padStart(2, '0')} / ${String(lesson.steps.length).padStart(2, '0')}</span><span class="stage-progress-track"><span style="width:${((state.stepIndex + 1) / lesson.steps.length) * 100}%"></span></span><span>${Math.round(((state.stepIndex + 1) / lesson.steps.length) * 100)}%</span></div>
  </div>`;
}

function renderTimeline(lesson) {
  return `<div class="timeline" role="group" aria-label="步骤导航">${lesson.steps.map((step, index) => {
    const active = index === state.stepIndex;
    const completed = index < state.stepIndex;
    return `<button type="button" class="timeline-step ${active ? 'is-active' : ''} ${completed ? 'is-complete' : ''}" data-action="step" data-step="${index}" aria-label="第 ${index + 1} 步：${escapeHtml(step.title)}" ${active ? 'aria-current="step"' : ''}><span>${completed ? icon('check') : String(index + 1).padStart(2, '0')}</span></button>`;
  }).join('')}</div>`;
}

function render() {
  const lesson = getLesson(state.lessonId);
  state.stepIndex = clampStep(lesson, state.stepIndex);
  const step = lesson.steps[state.stepIndex];
  const atStart = state.stepIndex === 0;
  const atEnd = state.stepIndex === lesson.steps.length - 1;
  app.innerHTML = `<div class="site-shell">
    <header class="site-header"><div class="container header-inner">
      <a class="brand" href="#top" aria-label="NetworkExpression 首页"><span class="brand-mark"><span></span><span></span><span></span></span><span>network<span class="brand-light">expression</span><small>网络原理可视化实验室</small></span></a>
      <nav class="header-nav" aria-label="主导航"><a href="#learning">交互实验</a><a href="#concepts">概念速查</a><a href="#about">关于项目</a></nav>
      <a class="header-cta" href="#learning">开始探索 ${icon('arrow')}</a>
    </div></header>

    <main id="top">
      <section class="hero container" aria-labelledby="hero-title"><div class="hero-copy">
        <div class="eyebrow"><span class="eyebrow-line"></span> LEARN BY SEEING <span class="eyebrow-dot">·</span> 计算机网络原理</div>
        <h1 id="hero-title">把网络过程，<br><span>看得见。</span></h1>
        <p>从一条请求到一次连接，把抽象协议拆解成看得懂的每一步。跟随数据流动，真正理解网络如何工作。</p>
        <div class="hero-actions"><a class="primary-link" href="#learning">进入交互实验 ${icon('arrow')}</a><span class="hero-meta"><span class="meta-dot"></span> ${lessons.length} 个入门场景 · 自由控制节奏</span></div>
      </div><div class="hero-art" aria-hidden="true"><div class="art-grid"></div><span class="art-cross art-cross-a">+</span><span class="art-cross art-cross-b">+</span>
        <div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div>
        <div class="art-node art-node-a"><span class="art-node-icon">01</span><span>CLIENT<small>发起请求</small></span></div>
        <div class="art-path"><span></span><span class="art-path-pulse"></span></div>
        <div class="art-packet"><span class="art-packet-led"></span><strong>TCP / IP</strong><small>数据正在传输</small></div>
        <div class="art-node art-node-b"><span class="art-node-icon">02</span><span>SERVER<small>返回响应</small></span></div>
        <span class="art-coordinate">40°43′ N &nbsp; 74°00′ W</span>
      </div></section>

      <section id="learning" class="learning-section"><div class="container">
        <div class="section-heading"><div><span class="section-kicker">01 / INTERACTIVE LAB</span><h2>从这里，开始理解网络<span class="heading-period">.</span></h2><p>选择一个主题，亲手推进协议的每一步。</p></div><span class="learning-summary">已完成 ${state.progress.completed.length} / ${lessons.length} 个场景<br>自测通过 ${state.progress.mastered.length} / ${lessons.length} 题</span></div>
        <div id="experience" class="experience-layout"><aside class="lesson-sidebar" aria-label="课程目录"><div class="sidebar-heading"><span>学习路径</span><span id="catalog-count">${filterLessons(lessons, state.search, state.group).length} / ${String(lessons.length).padStart(2, '0')}</span></div>${renderCatalogTools()}<div class="lesson-list">${renderLessonList()}</div><div class="sidebar-footer"><span class="sidebar-footer-icon">${icon('spark')}</span><p>跟着数据走一遍，<br>比背下定义更容易理解。</p></div></aside>
          <div class="lesson-workspace"><div class="lesson-overview"><div><div class="lesson-overline"><span class="lesson-overline-dot"></span> ${lesson.category} <span class="overview-slash">/</span> 场景 ${lesson.number}</div><h3>${lesson.title}</h3><p>${lesson.summary}</p></div><span class="duration">◷ &nbsp;${lesson.duration}</span></div>
            <div class="simulation-grid">${renderStage(lesson, step)}
              <div class="explain-panel"><div class="explain-label"><span class="explain-label-icon">${icon('info')}</span> STEP INSIGHT <span>${String(state.stepIndex + 1).padStart(2, '0')} / ${String(lesson.steps.length).padStart(2, '0')}</span></div>
                <div class="step-explanation" aria-live="polite" aria-atomic="true"><span class="step-eyebrow">${escapeHtml(step.eyebrow)}</span><h4 id="step-title" tabindex="-1">${escapeHtml(step.title)}</h4><p>${escapeHtml(step.description)}</p><div class="insight-box"><span>${icon('spark')} 记住这个点</span><p>${escapeHtml(step.insight)}</p></div><div class="state-box"><span>当前状态</span><strong>${escapeHtml(step.state)}</strong></div></div>
              </div></div>
            <div class="playback-panel"><div class="playback-top"><span>交互进度</span><span>点击节点跳转到对应步骤</span></div>${renderTimeline(lesson)}<div class="playback-controls">
              <button class="control-button control-quiet" type="button" data-action="reset" ${atStart ? 'disabled' : ''} aria-label="重置到第一步">${icon('reset')}<span>重置</span></button>
              <div class="control-main"><button class="control-button" type="button" data-action="prev" ${atStart ? 'disabled' : ''}>${icon('left')} 上一步</button><button class="control-button control-play" type="button" data-action="play">${icon(state.playing ? 'pause' : 'play')} ${state.playing ? '暂停演示' : '自动演示'}</button><button class="control-button control-next" type="button" data-action="next" ${atEnd ? 'disabled' : ''}>下一步 ${icon('right')}</button></div>
            </div></div>
            <div class="principle-strip"><div><span class="principle-icon">${icon('layers')}</span><span><small>核心原理</small><strong>${escapeHtml(lesson.principle)}</strong></span></div><details><summary>演示假设与简化</summary><p>${escapeHtml(lesson.assumption)}</p></details></div>
            ${renderCheckpoint(lesson, state.progress.completed.includes(lesson.id))}
          </div></div>
      </div></section>
      <section id="concepts" class="concepts-section"><div class="container"><div class="section-heading"><div><span class="section-kicker">02 / CONCEPT ATLAS</span><h2>概念速查<span class="heading-period">.</span></h2><p>把常见名词放回具体网络过程里理解。</p></div><span class="concept-count">${String(concepts.length).padStart(2, '0')} TERMS</span></div><div class="concept-grid">${renderConcepts()}</div></div></section>
      <section id="about" class="about-section"><div class="container about-inner"><div><span class="section-kicker">BUILT FOR CURIOSITY</span><h2>学网络，先看见过程。</h2><p>NetworkExpression 是一间不断扩展的网络原理实验室。每个场景都从一个具体问题出发，让你按自己的节奏观察、推演、再回看。</p></div><div class="about-stat"><strong>${String(lessons.length).padStart(2, '0')}</strong><span>个交互场景<br>持续探索中</span></div></div></section>
    </main><footer class="site-footer"><div class="container footer-inner"><span>© 2026 NetworkExpression</span><span>让复杂的网络，变得可以理解。</span></div></footer>
  </div>`;
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
  const lesson = getLesson(state.lessonId);
  const visited = state.visited[lesson.id] ?? new Set([0]);
  visited.add(state.stepIndex);
  state.visited[lesson.id] = visited;
  if (visited.size < lesson.steps.length) return;
  state.progress = recordProgress(state.progress, lesson.id, 'completed');
  saveProgress(storage, state.progress);
}

function setStep(index) {
  stopPlayback();
  state.stepIndex = clampStep(getLesson(state.lessonId), index);
  recordCompletion();
  render();
}

function selectLesson(id, updateHistory = true) {
  stopPlayback();
  state.lessonId = getLesson(id).id;
  state.stepIndex = 0;
  state.visited[state.lessonId] ??= new Set([0]);
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
  const lesson = getLesson(state.lessonId);
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
  }, 2600);
}

app.addEventListener('click', (event) => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const { action } = control.dataset;
  const focusSelector = action === 'lesson' || action === 'related' ? `[data-action="lesson"][data-id="${control.dataset.id}"]` : action === 'step' ? `[data-action="step"][data-step="${control.dataset.step}"]` : action === 'answer' ? `[data-action="answer"][data-option="${control.dataset.option}"]` : `[data-action="${action}"]`;

  if (action === 'lesson') selectLesson(control.dataset.id);
  if (action === 'related') selectLesson(control.dataset.id);
  if (action === 'step') setStep(Number(control.dataset.step));
  if (action === 'prev') setStep(state.stepIndex - 1);
  if (action === 'next') setStep(state.stepIndex + 1);
  if (action === 'reset') setStep(0);
  if (action === 'play') togglePlayback();
  if (action === 'answer') {
    const lesson = getLesson(state.lessonId);
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
  if (event.target.id !== 'lesson-search') return;
  state.search = event.target.value;
  updateCatalog();
});

app.addEventListener('change', (event) => {
  if (event.target.id !== 'lesson-group') return;
  state.group = event.target.value;
  updateCatalog();
});

window.addEventListener('popstate', () => selectLesson(new URLSearchParams(location.search).get('lesson'), false));
render();
