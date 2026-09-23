import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../src/lessons.js';
import { checkpoints, concepts, filterLessons, lessonGroups, loadProgress, progressKey, recordProgress, saveProgress } from '../src/learning.js';

test('every scenario has a valid question and concepts link to real scenarios', () => {
  const ids = new Set(lessons.map((lesson) => lesson.id));
  assert.deepEqual(new Set(Object.keys(checkpoints)), ids);
  for (const checkpoint of Object.values(checkpoints)) {
    assert.ok(checkpoint.question && checkpoint.explanation);
    assert.equal(checkpoint.options.length, 3);
    assert.ok(Number.isInteger(checkpoint.answer));
    assert.ok(checkpoint.answer >= 0 && checkpoint.answer < checkpoint.options.length);
    assert.equal(new Set(checkpoint.options).size, checkpoint.options.length);
  }
  for (const concept of concepts) assert.ok(ids.has(concept.related));
});

test('catalog search and layer filter can be combined', () => {
  assert.equal(filterLessons(lessons, 'MAC').some((lesson) => lesson.id === 'arp'), true);
  assert.deepEqual(filterLessons(lessons, 'TTL', '网络层').map((lesson) => lesson.id), ['routing']);
  assert.equal(filterLessons(lessons, '没有这个协议').length, 0);
  for (const lesson of lessons) assert.ok(lessonGroups.includes(lesson.group));
});

test('progress persists, deduplicates, and tolerates unavailable storage', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
  let progress = loadProgress(storage, lessons.map((lesson) => lesson.id));
  progress = recordProgress(progress, 'arp', 'completed');
  progress = recordProgress(progress, 'arp', 'completed');
  progress = recordProgress(progress, 'arp', 'mastered');
  saveProgress(storage, progress);
  assert.deepEqual(loadProgress(storage, lessons.map((lesson) => lesson.id)), { completed: ['arp'], mastered: ['arp'] });
  values.set(progressKey, '{not json');
  assert.deepEqual(loadProgress(storage, lessons.map((lesson) => lesson.id)), { completed: [], mastered: [] });
  assert.doesNotThrow(() => saveProgress({ setItem() { throw new Error('blocked'); } }, progress));
});
