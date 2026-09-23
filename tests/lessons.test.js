import test from 'node:test';
import assert from 'node:assert/strict';
import { clampStep, getLesson, lessons } from '../src/lessons.js';

test('every lesson has a complete, connected storyboard', () => {
  assert.equal(lessons.length, 4);
  assert.equal(new Set(lessons.map((lesson) => lesson.id)).size, lessons.length);

  for (const lesson of lessons) {
    assert.ok(lesson.title && lesson.principle && lesson.assumption);
    assert.ok(lesson.steps.length >= 4, `${lesson.id} needs enough steps to show a process`);
    const nodeIds = new Set(lesson.nodes.map((node) => node.id));
    assert.equal(nodeIds.size, lesson.nodes.length);
    for (const step of lesson.steps) {
      assert.ok(step.title && step.description && step.insight && step.state);
      assert.ok(step.message && step.segments.length);
      if (step.from) assert.ok(nodeIds.has(step.from), `${lesson.id}: unknown sender ${step.from}`);
      if (step.to) assert.ok(nodeIds.has(step.to), `${lesson.id}: unknown receiver ${step.to}`);
    }
  }
});

test('lesson lookup and step boundaries stay safe', () => {
  assert.equal(getLesson('tcp').id, 'tcp');
  assert.equal(getLesson('missing').id, lessons[0].id);
  assert.equal(clampStep(lessons[0], -5), 0);
  assert.equal(clampStep(lessons[0], 999), lessons[0].steps.length - 1);
});
