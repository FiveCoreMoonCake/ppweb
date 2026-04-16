/**
 * One-time script to redistribute abstract characters across groups.
 * Run with: node scripts/redistribute-chars.mjs
 * 
 * This script reads characters.ts, moves specified characters between groups,
 * updates groupId fields, and writes the result back.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const charFile = join(__dirname, "..", "src", "data", "characters.ts");

let content = readFileSync(charFile, "utf-8");

// Moves: [char, fromGroup, toGroup, insertAfterChar]
// insertAfterChar: the char after which to insert in the target group (null = append at end)
const moves = [
  // p5 → p4: pronouns join family group (我 is already in p4)
  ["你", "p5", "p4", "我"],
  ["他", "p5", "p4", "你"],
  ["她", "p5", "p4", "他"],

  // p5 → p3: very common particles learned early
  ["又", "p5", "p3", "方"],
  ["不", "p5", "p3", "又"],

  // p11 → p7: particles mixed with concrete daily-life words
  ["吗", "p11", "p7", "奶"],
  ["呢", "p11", "p7", "吗"],

  // p11 → p9: particles mixed with sensory/emotion words  
  ["也", "p11", "p9", "慢"],
  ["啊", "p11", "p9", "也"],

  // p11 → p10: connector mixed with adjective/quality words
  ["和", "p11", "p10", "假"],

  // p12 → p9: emotion words thematic match
  ["喜", "p12", "p9", "爱"],
  ["欢", "p12", "p9", "喜"],

  // p12 → p13: capability words with action words
  ["会", "p12", "p13", "刷"],
  ["能", "p12", "p13", "会"],
];

for (const [char, fromGroup, toGroup, afterChar] of moves) {
  console.log(`Moving "${char}": ${fromGroup} → ${toGroup} (after "${afterChar}")`);
  
  // 1. Find the character definition line(s) in the source group
  // Pattern: { char: "X", ... groupId: "pN" ... },
  // Could be single line or multi-line (for multi-reading chars)
  
  const charPattern = new RegExp(
    `(  \\{ char: "${char}",[\\s\\S]*?groupId: "${fromGroup}"[^}]*\\},?)\\n`,
    "m"
  );
  
  const match = content.match(charPattern);
  if (!match) {
    console.error(`  ERROR: Could not find "${char}" in group ${fromGroup}`);
    continue;
  }
  
  let charDef = match[1];
  
  // 2. Remove from source
  content = content.replace(match[0], "");
  
  // 3. Update groupId
  charDef = charDef.replace(`groupId: "${fromGroup}"`, `groupId: "${toGroup}"`);
  
  // Ensure it ends with proper formatting
  if (!charDef.endsWith(",")) charDef += ",";
  
  // 4. Insert after the target char in the target group
  const afterPattern = new RegExp(
    `(  \\{ char: "${afterChar}",[\\s\\S]*?groupId: "${toGroup}"[^}]*\\},?)\\n`,
    "m"
  );
  
  const afterMatch = content.match(afterPattern);
  if (!afterMatch) {
    console.error(`  ERROR: Could not find "${afterChar}" in group ${toGroup} to insert after`);
    continue;
  }
  
  content = content.replace(afterMatch[0], afterMatch[0] + charDef + "\n");
  console.log(`  OK`);
}

// Also rename groups to be more descriptive
const groupRenames = [
  ['"第1期"', '"数字与自然"'],
  ['"第2期"', '"动作与身体"'],
  ['"第3期"', '"动物与方向"'],
  ['"第4期"', '"时间与家人"'],
  ['"第5期"', '"位置与基础"'],
  ['"第6期"', '"学校与数量"'],
  ['"第7期"', '"居家与饮食"'],
  ['"第8期"', '"器具与运动"'],
  ['"第9期"', '"感官与情感"'],
  ['"第10期"', '"颜色与性质"'],
  ['"第11期"', '"连接与关系"'],
  ['"第12期"', '"思维与意愿"'],
  ['"第13期"', '"日常动作"'],
  ['"第14期"', '"亲友与方位"'],
  ['"第15期"', '"时间与度量"'],
  ['"第16期"', '"形状与味道"'],
  ['"第17期"', '"天气与植物"'],
  ['"第18期"', '"社会与职业"'],
  ['"第19期"', '"常用虚词"'],
  ['"第20期"', '"身体与地点"'],
  ['"第21期"', '"生活与节日"'],
  ['"第22期"', '"穿戴与教育"'],
  ['"第23期"', '"情绪与比较"'],
  ['"第24期"', '"动物与感受"'],
  ['"第25期"', '"昆虫与变化"'],
];

for (const [old, newName] of groupRenames) {
  // Only replace in the charGroups array, not in individual char definitions
  content = content.replace(
    new RegExp(`name: ${old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    `name: ${newName}`
  );
}

writeFileSync(charFile, content, "utf-8");
console.log("\nDone! characters.ts has been updated.");
console.log("Verify with: npx tsc --noEmit src/data/characters.ts");
