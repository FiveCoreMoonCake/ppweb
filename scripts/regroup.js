// Regroup characters.ts from variable-size groups into 20-char groups
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'data', 'characters.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Extract the interfaces (keep as-is)
const interfaceBlock = content.match(/^(export interface[\s\S]*?}\n\n)/m)[1];

// Extract all CharItem entries by matching each { char: "X", ... groupId: "pN" }
// Handle multi-line entries (polyphonic chars)
const charEntries = [];
const entryRegex = /\{ char: "(.)",([\s\S]*?)groupId: "p\d+" \}/g;
let match;
while ((match = entryRegex.exec(content)) !== null) {
  charEntries.push({
    char: match[1],
    fullText: match[0],
  });
}

console.log(`Found ${charEntries.length} character entries`);

const GROUP_SIZE = 20;
const totalGroups = Math.ceil(charEntries.length / GROUP_SIZE);
console.log(`Will create ${totalGroups} groups of ${GROUP_SIZE}`);

// Build new file
let output = interfaceBlock;

for (let g = 0; g < totalGroups; g++) {
  const groupId = `p${g + 1}`;
  const start = g * GROUP_SIZE;
  const end = Math.min(start + GROUP_SIZE, charEntries.length);
  const entries = charEntries.slice(start, end);

  output += `const ${groupId}: CharItem[] = [\n`;
  for (const entry of entries) {
    // Replace old groupId with new one
    const updated = entry.fullText.replace(/groupId: "p\d+"/, `groupId: "${groupId}"`);
    output += `  ${updated},\n`;
  }
  output += `];\n\n`;
}

// Build charGroups export
output += `export const charGroups: CharGroup[] = [\n`;
for (let g = 0; g < totalGroups; g++) {
  const groupId = `p${g + 1}`;
  output += `  { id: "${groupId}", name: "第${g + 1}期", chars: ${groupId} },\n`;
}
output += `];\n\n`;
output += `export const allChars: CharItem[] = charGroups.flatMap((g) => g.chars);\n`;

fs.writeFileSync(filePath, output, 'utf8');
console.log('Done! File rewritten.');
