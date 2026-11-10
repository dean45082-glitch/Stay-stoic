const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('app.js','utf8');
const modules = fs.readFileSync('modules.js','utf8');
const c1Source = fs.readFileSync('c1-data.js','utf8');

test('English My Way keeps the legacy progress keys', () => {
  assert.match(app, /loadJSON\("staystoic_meta_v4"/);
  assert.match(app, /loadJSON\("staystoic_progress_v4"/);
  assert.match(app, /saveJSON\("staystoic_meta_v4"/);
  assert.match(app, /saveJSON\("staystoic_progress_v4"/);
});

test('C1 and Amazon have independent storage namespaces', () => {
  assert.match(modules, /staystoic_c1_meta_v1/);
  assert.match(modules, /staystoic_c1_progress_v1/);
  assert.match(modules, /staystoic_amazon_meta_v1/);
  assert.match(modules, /staystoic_amazon_progress_v1/);
  assert.doesNotMatch(app, /staystoic_c1_meta_v1|staystoic_c1_progress_v1/);
});

test('module shell contains the three requested modules and busts', () => {
  assert.match(modules, /English My Way/);
  assert.match(modules, /My Way to C1/);
  assert.match(modules, /My Way Up at Amazon/);
  assert.match(modules, /app-icon\.webp/);
  assert.match(modules, /epictetus\.webp/);
  assert.match(modules, /seneca\.webp/);
  assert.match(modules, /En preparación/);
  assert.match(modules, /‹ Módulos/);
});

test('C1 curriculum contains 69 complete lesson shells', () => {
  const context = { window: {} };
  vm.runInNewContext(c1Source, context);
  const course = context.window.C1_COURSE;
  assert.equal(course.totalDays, 69);
  assert.equal(course.days.length, 69);
  assert.equal(course.storage.meta, 'staystoic_c1_meta_v1');
  assert.equal(course.storage.progress, 'staystoic_c1_progress_v1');
  assert.ok(course.sourceBankCount >= 250);
  for (let i = 0; i < 69; i++) {
    const d = course.days[i];
    assert.equal(d.day, i + 1);
    assert.ok(d.title);
    assert.ok(d.focus);
    assert.ok(d.working?.goal);
    assert.ok(d.working?.base);
    assert.ok(d.working?.checkPrompt);
    assert.ok(Array.isArray(d.models) && d.models.length >= 3);
    assert.ok(Array.isArray(d.shadowing) && d.shadowing.length >= 3);
    assert.ok(d.reading);
    assert.ok(Array.isArray(d.questions) && d.questions.length >= 3);
    assert.ok(d.oralChallenge);
  }
});
