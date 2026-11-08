// Run: node --experimental-strip-types scripts/check-story-state-recovery.mjs
import assert from "node:assert/strict";
import {
  normalizeStoryProtocol, isUsableStoryProtocol, storyProtocolIssues,
} from "../src/lib/storyStateRecovery.ts";

const recoveredFromModel = {
  protagonist: {
    name:"测试主角",timeDesc:"晴日上午",
    environment:"公园入口",
    temperature:"微凉",clothing:"日常外套",
    sensation:"微风",innerState:"平静",
  },
  sceneCastIds:["anon"],nextSceneCastIds:["anon"],
  character:[{
    charId:"anon",characterName:"测试角色",favorability:78,trust:75,
    innerPsychology:"准备散步",status:"站在路边",
    clothing:"日常服装",action:"挥手",
  }],
  suggestions:[
    {tag:"fun",text:"提出建议"},
    {tag:"rational",text:"理性分析"},
    {tag:"radical",text:"尝试新路线"},
  ],
  danmaku:[{text:"测试弹幕"}],
  timeline:[{type:"minor",description:"角色在公园相遇"}],
  music:{title:"Test Track",genre:"Acoustic Pop",mood:"轻快"},
};
assert.equal(isUsableStoryProtocol(recoveredFromModel),false);
const fixed = normalizeStoryProtocol(recoveredFromModel);
assert.equal(isUsableStoryProtocol(fixed),true,storyProtocolIssues(fixed).join("; "));
assert.deepEqual(fixed.suggestions,{fun:"提出建议",rational:"理性分析",radical:"尝试新路线"});
assert.deepEqual(fixed.timeline,{major:"",medium:"",minor:"角色在公园相遇"});
assert.equal(fixed.character[0].id,"anon");
assert.equal(fixed.character[0].name,"测试角色");
assert.equal(fixed.character[0].affection,78);
assert.equal(fixed.character[0].innerState,"准备散步");
assert.equal(fixed.character[0].bodyState,"站在路边");
assert.equal(recoveredFromModel.character[0].id,undefined,"Normalization must not mutate original data");

const normal={
  protagonist:null,sceneCastIds:[],character:[],
  suggestions:{fun:"a",rational:"b",radical:"c"},
  timeline:{major:"",medium:"",minor:""},
};
assert.equal(isUsableStoryProtocol(normalizeStoryProtocol(normal)),true);
assert.equal(isUsableStoryProtocol(normalizeStoryProtocol({ ...normal, suggestions:[{tag:"fun",text:"only one"}] })),false,"Incomplete suggestions must still fail");
assert.equal(isUsableStoryProtocol(normalizeStoryProtocol({ ...normal, sceneCastIds:null })),false,"Missing cast list must still fail");
console.log("PASS: repaired suggestions/timeline arrays, character aliases, original format and invalid state safeguards.");
