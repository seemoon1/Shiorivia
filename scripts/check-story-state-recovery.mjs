// Run: node --experimental-strip-types scripts/check-story-state-recovery.mjs
import assert from "node:assert/strict";
import {
  normalizeStoryProtocol, isUsableStoryProtocol, storyProtocolIssues,
} from "../src/lib/storyStateRecovery.ts";

const recoveredFromModel = {
  protagonist: {
    name:"涼宮 月",timeDesc:"深秋周末白天",
    environment:"地下铁车站外的涉谷街口红绿灯前",
    temperature:"干燥冷冽",clothing:"秋冬风衣",
    sensation:"冷风",innerState:"无奈又开心",
  },
  sceneCastIds:["anon"],nextSceneCastIds:["anon"],
  character:[{
    charId:"anon",characterName:"千早 爱音",favorability:78,trust:75,
    innerPsychology:"期待买可颂",status:"等红绿灯",
    clothing:"米白色针织开衫",action:"拉住手指",
  }],
  suggestions:[
    {tag:"fun",text:"讨论焦糖布丁的分法"},
    {tag:"rational",text:"提醒绿灯"},
    {tag:"radical",text:"反握手"},
  ],
  danmaku:[{text:"粉毛大狗狗出街！"}],
  timeline:[{type:"minor",description:"深秋周末与爱音出游"}],
  music:{title:"Autumn Breeze",genre:"Acoustic Pop",mood:"轻快"},
};
assert.equal(isUsableStoryProtocol(recoveredFromModel),false);
const fixed = normalizeStoryProtocol(recoveredFromModel);
assert.equal(isUsableStoryProtocol(fixed),true,storyProtocolIssues(fixed).join("; "));
assert.deepEqual(fixed.suggestions,{fun:"讨论焦糖布丁的分法",rational:"提醒绿灯",radical:"反握手"});
assert.deepEqual(fixed.timeline,{major:"",medium:"",minor:"深秋周末与爱音出游"});
assert.equal(fixed.character[0].id,"anon");
assert.equal(fixed.character[0].name,"千早 爱音");
assert.equal(fixed.character[0].affection,78);
assert.equal(fixed.character[0].innerState,"期待买可颂");
assert.equal(fixed.character[0].bodyState,"等红绿灯");
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
