// Regression checks: node --experimental-strip-types scripts/check-charta-worldline.mjs
import assert from "node:assert/strict";
import {
  emptyChartaLore, formatChartaLore, parseChartaLoreProfile, validateChartaRelationshipTargets,
  parseChartaIdentityExtras, validateChartaTimelineLinks,
} from "../src/lib/chartaLore.ts";
import { parseStoryWorldline } from "../src/lib/storyWorldline.ts";

const stages = [
  { era: "开端", period: "诞生" },
  { era: "开端", period: "初遇" },
  { era: "转折", period: "分别" },
  { era: "转折", period: "重逢" },
];
const profile = {
  ...emptyChartaLore(),
  intro: "原创角色，渴望认识世界。",
  personality: "外向而谨慎。",
  relationshipNotes: "默认好友关系。",
  experienceNotes: "已经学会游泳。",
  guidance: "不要突然对所有人说出秘密。",
  relationships: [
    { id: "r0", targetName: "小树", content: "童年认识。", periods: ["诞生","初遇"] },
    { id: "r1", targetName: "小海", content: "转折之后才成为好友。", periods: ["分别", "重逢"] },
    { id: "r2", targetName: "小星", content: "任意时期都会认识。", periods: [] },
  ],
  experiences: [
    { id: "e0", content: "加入新的旅团。", periods: ["分别"] },
    { id: "e1", content: "永远记得外婆。", periods: [] },
  ],
};
assert.equal(validateChartaTimelineLinks(profile, stages), null);
const invalid = { ...profile, relationships: [{ ...profile.relationships[0], periods: ["诞生", "分别"] }] };
assert.match(validateChartaTimelineLinks(invalid, stages) || "", /连续/);
assert.match(validateChartaTimelineLinks({...profile,experiences:[{id:"e",content:"",periods:["其他世界"]}]},stages)||"",/世界观/);
assert.throws(()=>parseChartaLoreProfile({...profile,relationships:[{id:"x",targetName:"",content:"",periods:[]}]}),/名称/);
const parsed = parseChartaLoreProfile(profile);
assert.ok(parsed);
const character = {
  id:"charta-a12345678", name:"样例角色", names:{"zh-CN":"样例角色"},
  aliases:["别名甲","别名乙"],
  gender:"female", hairColor:"青色", moeTags:["眼镜","认真"],
  profile:parsed,
};
const early = formatChartaLore(character, "初遇", stages);
assert.ok(early.includes("童年认识"));
assert.ok(early.includes("任意时期都会认识"));
assert.ok(early.includes("永远记得外婆"));
assert.ok(!early.includes("转折之后才成为好友"));
assert.ok(!early.includes("加入新的旅团"));
assert.ok(early.includes("青色") && early.includes("认真"));
const late = formatChartaLore(character, "重逢", stages);
assert.ok(late.includes("童年认识"), "Past memories must remain");
assert.ok(late.includes("转折之后才成为好友"));
assert.ok(late.includes("加入新的旅团"));
const unscoped = formatChartaLore(character, null, stages);
assert.ok(!unscoped.includes("童年认识"));
assert.ok(unscoped.includes("默认好友关系。"));
const extra = parseChartaIdentityExtras({aliases:["别名","别名",""],moeTags:["认真"]});
assert.deepEqual(extra.aliases,["别名"]);

const world = {
  worldId:"world-abcdefgh",worldName:"架空世界",worldDescription:"设定文字",
  canonTimeline:stages,kind:"au",era:"AU纪元",period:"if线二",
  baseEra:"开端",basePeriod:"初遇",event:"发生一件事"
};
const allowed = parseStoryWorldline(world);
assert.ok(allowed && allowed.basePeriod==="初遇");
assert.equal(parseStoryWorldline({...world,basePeriod:"不存在"}),null);
assert.equal(parseStoryWorldline({...world,baseEra:"其他时代"}),null);
assert.equal(parseStoryWorldline({...world,kind:"canon"}),null);
// BanG Dream built-ins can be linked by ID, but only in the same world.
const bangDreamProfile = parseChartaLoreProfile({
  ...emptyChartaLore(), intro:"个性化角色",
  relationships:[{id:"rel-saki",targetId:"sakiko",targetName:"丰川祥子",content:"朋友",periods:[]}],
});
assert.ok(bangDreamProfile);
assert.equal(validateChartaRelationshipTargets(bangDreamProfile,"bang-dream",[]),null);
assert.match(validateChartaRelationshipTargets(bangDreamProfile,"world-abcdefgh",[]) || "",/世界观/);
const customRelationProfile = parseChartaLoreProfile({
  ...emptyChartaLore(),intro:"原创人物",
  relationships:[{id:"rel-custom",targetId:"charta-abcdefgh",targetName:"同伴",content:"好友",periods:[]}],
});
assert.ok(customRelationProfile);
assert.equal(validateChartaRelationshipTargets(customRelationProfile,"world-abcdefgh",
  [{id:"charta-abcdefgh",worldId:"world-abcdefgh"}]),null);
assert.match(validateChartaRelationshipTargets(customRelationProfile,"world-abcdefgh",
  [{id:"charta-abcdefgh",worldId:"world-ijklmnop"}]) || "",/世界观/);

console.log("Charta baseline and structured lore checks passed.");
