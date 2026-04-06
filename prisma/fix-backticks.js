const fs = require('fs');
const content = fs.readFileSync('prisma/seed-llm-terms.ts', 'utf8');
// Replace ``` with \`\`\` (escaped backticks for TypeScript template literals)
const fixed = content.split('```').join('\\`\\`\\`');
fs.writeFileSync('prisma/seed-llm-terms.ts', fixed, 'utf8');
console.log('done, replacements:', (content.match(/```/g) || []).length);
