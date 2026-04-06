content = open('prisma/seed-llm-terms.ts', 'r', encoding='utf-8').read()
fixed = content.replace('```', r'\`\`\`')
open('prisma/seed-llm-terms.ts', 'w', encoding='utf-8').write(fixed)
print('done, replacements:', content.count('```'))
