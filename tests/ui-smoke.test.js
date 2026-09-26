import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../src/lessons.js';
import { checkpoints, progressKey, filterLessons } from '../src/learning.js';

test('player renders each scenario and records a correct checkpoint answer', async () => {
  const listeners = {};
  const stored = new Map();
  const lessonList = { innerHTML: '' };
  const catalogCount = { textContent: '' };
  const app = {
    innerHTML: '',
    addEventListener(name, handler) { listeners[name] = handler; },
    querySelector(selector) {
      if (selector === '.lesson-list') return lessonList;
      if (selector === '#catalog-count') return catalogCount;
      return null;
    },
  };
  globalThis.document = { querySelector: () => app };
  globalThis.location = { search: '', href: 'http://localhost/' };
  globalThis.history = {
    pushState(_state, _unused, url) {
      location.href = String(url);
      location.search = new URL(url).search;
    },
  };
  globalThis.window = {
    localStorage: {
      getItem(key) { return stored.get(key) ?? null; },
      setItem(key, value) { stored.set(key, value); },
    },
    addEventListener() {},
  };

  await import('../src/main.js');
  const click = (dataset) => listeners.click({ target: { closest: () => ({ dataset }) } });
  for (const lesson of lessons) {
    click({ action: 'lesson', id: lesson.id });
    assert.ok(app.innerHTML.includes(`<h3>${lesson.title}</h3>`), lesson.id);
    assert.ok(!app.innerHTML.includes('undefined'), lesson.id);
  }

  click({ action: 'lesson', id: 'arp' });
  const arpStepCount = lessons.find((lesson) => lesson.id === 'arp').steps.length;
  click({ action: 'step', step: String(arpStepCount - 1) });
  assert.ok(!app.innerHTML.includes(checkpoints.arp.question));
  for (let index = 1; index < arpStepCount; index += 1) click({ action: 'step', step: String(index) });
  assert.ok(app.innerHTML.includes(checkpoints.arp.question));
  click({ action: 'answer', option: '0' });
  assert.ok(app.innerHTML.includes('再想一想'));
  click({ action: 'answer', option: String(checkpoints.arp.answer) });
  assert.ok(app.innerHTML.includes('回答正确，已掌握'));
  assert.deepEqual(JSON.parse(stored.get(progressKey)), { completed: ['arp'], mastered: ['arp'] });

  listeners.input({ target: { id: 'lesson-search', value: 'MAC' } });
  assert.ok(lessonList.innerHTML.includes('ARP 地址解析'));
  assert.ok(!lessonList.innerHTML.includes('DNS 查询'));
  assert.equal(catalogCount.textContent, `${filterLessons(lessons, 'MAC').length} / ${lessons.length}`);
  listeners.change({ target: { id: 'lesson-group', value: '网络层' } });
  assert.equal(catalogCount.textContent, `${filterLessons(lessons, 'MAC', '网络层').length} / ${lessons.length}`);
});
