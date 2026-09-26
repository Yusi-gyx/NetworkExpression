import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons, getLesson } from '../src/lessons.js';
import { layers } from '../src/curriculum.js';
import { eventPaths } from '../src/topology.js';
import { experimentOptions, getExperimentLesson } from '../src/experiments.js';
import { renderTopology, renderDetail } from '../src/visuals.js';

test('five-layer map covers every protocol lesson exactly once',()=>{
  const linked=layers.flatMap(layer=>layer.ids);
  assert.equal(new Set(linked).size,linked.length);
  assert.deepEqual(new Set(linked),new Set(lessons.filter(lesson=>lesson.group!=='基础').map(lesson=>lesson.id)));
  for(const layer of layers) for(const id of layer.ids) assert.equal(getLesson(id).group,layer.id);
});

test('every transmission follows connected devices and local work has no invented arrows',()=>{
  const variants=Object.entries(experimentOptions).flatMap(([id,options])=>options.map(option=>getExperimentLesson(id,option.id)));
  for(const lesson of [...lessons,...variants]) {
    assert.ok(lesson.sources.length,`${lesson.id}: missing original sources`);
    const {topology}=lesson;
    const ids=new Set(topology.nodes.map(node=>node.id));
    assert.equal(ids.size,topology.nodes.length);
    for(const edge of topology.links) assert.ok(ids.has(edge.a)&&ids.has(edge.b));
    for(const [index,step] of lesson.steps.entries()) {
      const context=`${lesson.id} step ${index}`;
      const paths=eventPaths(lesson,step);
      if(!step.to&&!step.routes) assert.equal(paths.length,0,context);
      if(step.from&&step.to) assert.ok(paths.length&&paths.every(path=>path.length>=2),context);
      for(const path of paths) for(let i=1;i<path.length;i++) {
        assert.ok(topology.links.some(edge=>[edge.a,edge.b].includes(path[i-1])&&[edge.a,edge.b].includes(path[i])),`${context}: nonexistent link`);
        if(step.broken) assert.ok(!(step.broken.includes(path[i-1])&&step.broken.includes(path[i])),`${context}: traffic crosses failed link`);
      }
      assert.doesNotMatch(renderTopology(lesson,step,null,false)+renderDetail(lesson,step,index),/undefined|NaN/,context);
    }
  }
});

test('broadcast branches, VLAN boundaries, and re-routing retain their causal meaning',()=>{
  const arp=getLesson('arp');
  const branches=eventPaths(arp,arp.steps[1]);
  assert.deepEqual(new Set(branches.map(path=>path.at(-1))),new Set(['server','peer','router']));
  assert.equal(eventPaths(arp,arp.steps[2]).length,0,'recognizing an ARP request is local work');
  const vlan=getLesson('vlan');
  assert.ok(eventPaths(vlan,vlan.steps[2]).every(path=>!path.includes('peer')),'VLAN 20 must not receive VLAN 10 broadcast');
  const ospf=getLesson('ospf');
  assert.ok(eventPaths(ospf,ospf.steps[2])[0].includes('r2'));
  assert.ok(!eventPaths(ospf,ospf.steps[4])[0].includes('r2'));
});

test('experiments change observable outcomes without mutating canonical lessons',()=>{
  const low=getExperimentLesson('routing','ttl-one');
  assert.ok(low.steps.some(step=>step.dropped));
  assert.ok(low.steps.every(step=>!eventPaths(low,step).flat().includes('server')),'expired packet never reaches server');
  assert.equal(low.steps.at(-1).from,'router');
  assert.equal(low.steps.at(-1).to,'client');
  assert.equal(getLesson('routing').steps.length,5);
  const normal=getExperimentLesson('reliability','no-loss');
  assert.ok(normal.steps.every(step=>!step.dropped));
  assert.equal(normal.steps.at(-1).message,'ACK=301');
  assert.match(getExperimentLesson('cache','changed').steps.at(-1).message,/200 OK/);
  assert.match(getLesson('cache').steps.at(-1).message,/304/);
  assert.equal(eventPaths(getLesson('cache'),getLesson('cache').steps[2]).length,0);
});

test('encapsulation layers stay inside devices and transit frames are replaced',()=>{
  const lesson=getLesson('encapsulation');
  assert.ok(lesson.nodes.every(node=>!['app','transport','network','link'].includes(node.id)));
  assert.ok(lesson.steps.slice(0,4).every(step=>eventPaths(lesson,step).length===0));
  assert.deepEqual(lesson.steps.slice(4,7).map(step=>[step.from,step.to]),[['client','router'],['router','r2'],['r2','server']]);
});
