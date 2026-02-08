/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const replacements = [
  {
    file: 'src/app/api/cataloging/entries/[id]/approve/route.ts',
    from: /catch \(error: any\)/g,
    to: 'catch (error: unknown)'
  },
  {
    file: 'src/app/api/cataloging/entries/route.ts',
    from: /catch \(error: any\)/g,
    to: 'catch (error: unknown)'
  },
  {
    file: 'src/app/api/members/route.ts',
    from: /catch \(error: any\)/g,
    to: 'catch (error: unknown)'
  },
  {
    file: 'src/app/api/settings/audit-log/route.ts',
    from: /catch \(error: any\)/g,
    to: 'catch (error: unknown)'
  },
  {
    file: 'src/app/api/settings/categories/[id]/route.ts',
    from: /catch \(error: any\)/g,
    to: 'catch (error: unknown)'
  },
  {
    file: 'src/app/api/settings/categories/route.ts',
    from: /catch \(error: any\)/g,
    to: 'catch (error: unknown)'
  },
  {
    file: 'src/app/api/settings/faqs/route.ts',
    from: /catch \(error: any\)/g,
    to: 'catch (error: unknown)'
  },
  {
    file: 'src/app/api/training/sessions/[id]/attendance/route.ts',
    from: /catch \(error: any\)/g,
    to: 'catch (error: unknown)'
  },
  {
    file: 'src/app/api/training/sessions/[id]/register/route.ts',
    from: /catch \(error: any\)/g,
    to: 'catch (error: unknown)'
  },
  {
    file: 'src/app/api/training/sessions/route.ts',
    from: /catch \(error: any\)/g,
    to: 'catch (error: unknown)'
  },
  {
    file: 'src/app/cataloging/page.tsx',
    from: /catch \(error: any\)/g,
    to: 'catch (error: unknown)'
  },
  {
    file: 'src/app/manage-books/page.tsx',
    from: /catch \(error: any\)/g,
    to: 'catch (error: unknown)'
  },
  {
    file: 'src/app/onboarding/page.tsx',
    from: /catch \(error: any\)/g,
    to: 'catch (error: unknown)'
  },
  {
    file: 'src/app/profile/page.tsx',
    from: /catch \(error: any\)/g,
    to: 'catch (error: unknown)'
  },
  {
    file: 'src/lib/activity-logger.ts',
    from: /: any\)/g,
    to: ': unknown)'
  },
  {
    file: 'src/lib/pdf-export.ts',
    from: /: any\)/g,
    to: ': unknown)'
  },
];

replacements.forEach(({ file, from, to }) => {
  try {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Arquivo não encontrado: ${file}`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    content = content.replace(from, to);
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Corrigido: ${file}`);
    } else {
      console.log(`⏭️  Sem alterações: ${file}`);
    }
  } catch (err) {
    console.error(`❌ Erro ao processar ${file}:`, err.message);
  }
});

console.log('\n✨ Concluído!');
