const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('app.js','utf8');
const modules = fs.readFileSync('modules.js','utf8');
const c1Source = fs.readFileSync('c1-data.js','utf8');
const amazonLoader = fs.readFileSync('amazon-data.js','utf8');
const amazonParts = Array.from({length:18}, (_,i) => fs.readFileSync('amazon-data-part' + (i+1) + '.js','utf8'));
const amazonModule = fs.readFileSync('amazon-module.js','utf8');

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
  assert.match(modules, /marcus-aurelius\.webp/);
  assert.match(modules, /epictetus\.webp/);
  assert.match(modules, /seneca\.webp/);
  assert.match(modules, /onSelect\('amazon'\)/);
  assert.match(modules, /StayStoicAmazonApp/);
  assert.match(modules, /Volver a módulos/);
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
    assert.ok(Array.isArray(d.questions) && d.questions.length >= 1);
    assert.equal(d.readingAnswers.length, d.questions.length);
    for (const { answer, evidence } of d.readingAnswers) {
      assert.ok(answer?.trim() && evidence?.trim());
    }
    assert.ok(!d.reading.includes('Read the passage as a connected situation:'));
    assert.ok(d.oralChallenge);
  }
});


test('Amazon v2.2 curriculum and situations load without changing stable lesson IDs', () => {
  const context = { window: {}, console };
  for (const part of amazonParts) vm.runInNewContext(part, context);
  vm.runInNewContext(amazonLoader, context);
  const course = context.window.AMAZON_COURSE;
  assert.equal(course.content_version, '2.2');
  assert.equal(course.id, 'amazon-operations-c1');
  assert.equal(course.lessons.length, 60);
  assert.equal(course.sources.length, 146);
  assert.equal(course.vocabulary.length, 161);
  assert.equal(course.situations.categories.length, 7);
  assert.equal(course.situations.entries.length, 73);
  assert.equal(Array.from(course.feedback_actions).join('|'), 'accept|suggest_correction|exclude_from_practice|mark_pending');
  let models = 0, activities = 0, variants = 0;
  for (let i = 0; i < 60; i++) {
    const d = course.lessons[i];
    assert.equal(d.day, i + 1);
    assert.equal(d.id, 'D' + String(i + 1).padStart(2, '0'));
    assert.ok(d.title && d.objective && d.scenario);
    assert.ok(Array.isArray(d.models) && d.models.length >= 5);
    assert.ok(Array.isArray(d.activities) && d.activities.length >= 10);
    assert.ok(Array.isArray(d.dialogue_variants) && d.dialogue_variants.length >= 3);
    assert.ok(d.short_application?.prompt);
    assert.ok(d.short_application?.model);
    models += d.models.length;
    activities += d.activities.length;
    variants += d.dialogue_variants.length;
  }
  assert.equal(models, 313);
  assert.equal(activities, 613);
  assert.equal(variants, 193);
});

test('Amazon module keeps independent progress and return navigation', () => {
  assert.match(amazonModule, /staystoic_amazon_meta_v1/);
  assert.match(amazonModule, /staystoic_amazon_progress_v1/);
  assert.match(amazonModule, /Accept|Aceptar/);
  assert.match(amazonModule, /Corregir/);
  assert.match(amazonModule, /Excluir/);
  assert.match(amazonModule, /Pendiente/);
  assert.match(amazonModule, /Situations/);
  assert.match(amazonModule, /TEXT CONSULTATION/);
  assert.match(amazonModule, /StoicAudio\?\.speak\(text,r,status,lookup\)/);
  assert.match(amazonModule, /amazon-audio:/);
  assert.doesNotMatch(amazonModule, /AndroidTTS|speechSynthesis/);
  assert.match(modules, /Volver a módulos/);
});

test('the fixed module header sits outside the scroll area and navigation resets it', () => {
  const scroll = { scrollTop: 180 };
  const effects = [];
  const h = (type, props, ...children) => ({type, props, children});
  const window = { React: { createElement: h, useEffect: effect => effects.push(effect), useState: () => ['amazon', () => {}] }, StayStoicAmazonApp: () => null };
  const vm = require('node:vm');
  vm.runInNewContext(modules, { window, document: {getElementById: id => id === 'module-scroll' ? scroll : null} });
  const shell = window.StayStoicShell();
  const header = shell.children[1];
  const content = shell.children[2];
  assert.equal(header.type(header.props).props.className, 'module-banner');
  assert.equal(content.props.id, 'module-scroll');
  assert.equal(content.children[0].type, window.StayStoicAmazonApp);
  effects[0]();
  assert.equal(scroll.scrollTop, 0);
});
