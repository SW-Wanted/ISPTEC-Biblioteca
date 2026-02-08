/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');

const fixes = [
  // Settings page
  {
    file: 'src/app/admin/settings/page.tsx',
    replacements: [
      { from: /(handleUpdateSystemPolicy\(key: string, value: string, description\?: string\)): any/g, to: '$1: void' },
      { from: /(handleCreateCategory\(name: string, description\?: string, parentId\?: string\)): any/g, to: '$1: void' },
      { from: /(handleUpdateCategory\(id: string, name: string, description\?: string \| null, parentId\?: string \| null\)): any/g, to: '$1: void' }
    ]
  },
  // API routes
  {
    file: 'src/app/api/cataloging/entries/[id]/approve/route.ts',
    replacements: [
      { from: /catch \(error: any\)/g, to: 'catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/cataloging/entries/route.ts',
    replacements: [
      { from: /catch \(error: any\)/g, to: 'catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/members/route.ts',
    replacements: [
      { from: /catch \(error: any\)/g, to: 'catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/settings/audit-log/route.ts',
    replacements: [
      { from: /catch \(error: any\)/g, to: 'catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/settings/categories/[id]/route.ts',
    replacements: [
      { from: /catch \(error: any\)/g, to: 'catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/settings/categories/route.ts',
    replacements: [
      { from: /catch \(error: any\)/g, to: 'catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/settings/faqs/route.ts',
    replacements: [
      { from: /catch \(error: any\)/g, to: 'catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/training/sessions/[id]/attendance/route.ts',
    replacements: [
      { from: /catch \(error: any\)/g, to: 'catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/training/sessions/[id]/register/route.ts',
    replacements: [
      { from: /catch \(error: any\)/g, to: 'catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/training/sessions/route.ts',
    replacements: [
      { from: /catch \(error: any\)/g, to: 'catch (error: unknown)' }
    ]
  },
  // Pages
  {
    file: 'src/app/cataloging/page.tsx',
    replacements: [
      { from: /catch \(error: any\)/g, to: 'catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/manage-books/page.tsx',
    replacements: [
      { from: /catch \(error: any\)/g, to: 'catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/onboarding/page.tsx',
    replacements: [
      { from: /catch \(error: any\)/g, to: 'catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/profile/page.tsx',
    replacements: [
      { from: /catch \(error: any\)/g, to: 'catch (error: unknown)' }
    ]
  },
  // Components
  {
    file: 'src/components/ConsolidatedAuditLogs.tsx',
    replacements: [
      { from: /catch \(error: any\)/g, to: 'catch (error: unknown)' }
    ]
  },
  // Libs
  {
    file: 'src/lib/activity-logger.ts',
    replacements: [
      { from: /: any\)/g, to: ': unknown)' }
    ]
  },
  {
    file: 'src/lib/pdf-export.ts',
    replacements: [
      { from: /: any\)/g, to: ': unknown)' }
    ]
  }
];

fixes.forEach(({ file, replacements }) => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    replacements.forEach(({ from, to }) => {
      const newContent = content.replace(from, to);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Corrigido: ${file}`);
    } else {
      console.log(`⏭️  Sem alterações: ${file}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao processar ${file}:`, error.message);
  }
});

console.log('\n✨ Concluído!');
