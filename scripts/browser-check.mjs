// Optional real-browser verification; no runtime dependency is added to the site.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/browser-check.mjs
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { lessons } from '../src/lessons.js';
import { checkpoints } from '../src/learning.js';
import { experimentOptions, getExperimentLesson } from '../src/experiments.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.TEST_URL || 'http://127.0.0.1:4173';
const output=process.env.BROWSER_ARTIFACTS || '/tmp/network-expression-check';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1080},reducedMotion:'reduce'});
const errors=[];
const external=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('request',request=>{if(!request.url().startsWith(base)) external.push(request.url());});
page.on('response',response=>{if(response.status()>=400) errors.push(`${response.status()} ${response.url()}`);});
let stepsChecked=0;
try {
  await page.goto(base);
  await page.screenshot({path:`${output}/desktop-home.png`});
  for(const lesson of lessons) {
    await page.locator('#lesson-search').fill('');
    await page.locator('#lesson-group').selectOption('全部');
    await page.locator(`[data-action="lesson"][data-id="${lesson.id}"]`).click();
    assert.equal(await page.locator('.lesson-overview h3').textContent(),lesson.title);
    for(let i=0;i<lesson.steps.length;i++) {
      await page.locator(`.timeline [data-step="${i}"]`).click();
      assert.equal(await page.locator('#step-title').textContent(),lesson.steps[i].title);
      assert.equal(await page.locator('.active-link').count()===0,!lesson.steps[i].to&&!lesson.steps[i].routes,`${lesson.id}:${i} local vs transmission`);
      assert.equal(await page.locator('[data-action="prev"]').isDisabled(),i===0);
      assert.equal(await page.locator('[data-action="next"]').isDisabled(),i===lesson.steps.length-1);
      assert.doesNotMatch(await page.locator('.stage').textContent(),/undefined|NaN/);
      assert.ok((await page.locator('#player-announcement').textContent()).includes(lesson.steps[i].title));
      stepsChecked++;
    }
    await page.locator(`[data-action="answer"][data-option="${checkpoints[lesson.id].answer}"]`).click();
    assert.ok((await page.locator('.quiz-feedback').textContent()).includes('回答正确'));
    if(['arp','dns','reliability','ospf','tcp','signals'].includes(lesson.id)) {
      await page.locator('.timeline [data-step="1"]').click();
      await page.locator('.simulation-grid').screenshot({path:`${output}/desktop-${lesson.id}.png`});
    }
  }
  console.log(`PASS: ${lessons.length} lessons, ${stepsChecked} steps, ${lessons.length} quizzes`);
  await page.reload();
  assert.match(await page.locator('.learning-summary').textContent(),/已完成 29 \/ 29/);
  for(const [id,options] of Object.entries(experimentOptions)) {
    await page.locator(`[data-action="lesson"][data-id="${id}"]`).click();
    for(const option of options) {
      await page.locator('#experiment-condition').selectOption(option.id);
      const lesson=getExperimentLesson(id,option.id);
      assert.equal(await page.locator('#step-title').textContent(),lesson.steps[0].title);
      for(let i=0;i<lesson.steps.length;i++) {
        await page.locator(`.timeline [data-step="${i}"]`).click();
        assert.equal(await page.locator('#step-title').textContent(),lesson.steps[i].title);
        if(id==='routing'&&option.id==='ttl-one') assert.ok(!(await page.locator('.route-readout').textContent()).includes('服务器'));
      }
    }
  }
  console.log('PASS: condition comparisons and progress after reload');
  await page.locator('[data-action="lesson"][data-id="arp"]').click();
  await page.locator('.timeline [data-step="1"]').click();
  await page.locator('[data-action="inspect"][data-node="sw"]').focus();
  await page.keyboard.press('Enter');
  assert.match(await page.locator('.device-inspector').textContent(),/交换机/);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.node),'sw');
  await page.locator('[data-action="next"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#step-title').textContent(),getExperimentLesson('arp').steps[2].title);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'next');
  await page.locator('[data-action="reset"]').click();
  await page.locator('#playback-speed').selectOption('4000');
  await page.locator('[data-action="play"]').click();
  await page.waitForFunction(()=>document.querySelector('#step-title').textContent==='广播 ARP 请求');
  await page.locator('[data-action="play"]').click();
  assert.equal(await page.locator('[data-action="play"]').textContent(),'▷ 自动演示');
  await page.locator('#lesson-search').fill('不存在的协议');
  assert.match(await page.locator('.lesson-list').textContent(),/没有找到/);
  await page.locator('[data-action="group"][data-group="网络层"]').click();
  assert.equal(await page.locator('.lesson-list .lesson-card').count(),9);
  await page.locator('#concept-search').fill('SACK');
  assert.ok(await page.locator('.concept-card').count()>0);
  await page.locator('.concept-card [data-action="related"]').first().click();
  assert.equal(await page.locator('.lesson-overview h3').textContent(),getExperimentLesson('reliability').title);
  assert.equal(await page.locator('.lesson-card.is-active').count(),1);
  console.log('PASS: keyboard, focus, autoplay, filters, concept navigation');
  for(const width of [390,320,768,1920]) {
    await page.setViewportSize({width,height:900});
    await page.locator('#lesson-search').fill('');
    await page.locator('#lesson-group').selectOption('全部');
    for(const id of ['arp','dns','tcp','routing','nat','ospf','mail','signals','flow','quic']) {
      await page.locator(`[data-action="lesson"][data-id="${id}"]`).click();
      await page.locator('.timeline [data-step="1"]').click();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${id} overflows at ${width}`);
      if(width===390) await page.locator('.stage').screenshot({path:`${output}/mobile-${id}.png`});
    }
    if(width===390) {
      await page.locator('.explain-panel').scrollIntoViewIfNeeded();
      const controls=await page.locator('.playback-controls').boundingBox();
      assert.ok(controls.y>=0 && controls.y+controls.height<900,'mobile controls stay visible while reading');
      await page.locator('[data-action="next"]').click();
      assert.equal(await page.locator('#step-title').textContent(),getExperimentLesson('quic').steps[2].title);
      await page.screenshot({path:`${output}/mobile-reading.png`});
    }
  }
  // Confirm that cached progress still works if storage is blocked.
  const privatePage=await browser.newPage();
  await privatePage.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('disabled');}}));
  await privatePage.goto(`${base}/?lesson=arp`);
  await privatePage.locator('[data-action="next"]').click();
  assert.equal(await privatePage.locator('#step-title').textContent(),'广播 ARP 请求');
  await privatePage.close();
  assert.deepEqual(errors,[]);
  assert.deepEqual(external,[]);
  console.log(`PASS: 320/390/768/1920px, unavailable storage, zero page errors, no external requests. Screenshots: ${output}`);
} finally {await browser.close();}
