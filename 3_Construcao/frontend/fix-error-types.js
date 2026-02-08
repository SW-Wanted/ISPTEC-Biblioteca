/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const files = [
  'src/app/admin/computers/page.tsx',
  'src/app/admin/lockers/page.tsx',
  'src/app/admin/settings/page.tsx',
  'src/app/admin/special-requests/page.tsx',
  'src/app/services/page.tsx',
  'src/app/api/activity-logs/route.ts',
  'src/app/api/cataloging/enrich/route.ts',
  'src/app/api/cataloging/entries/[id]/approve/route.ts',
  'src/app/api/cataloging/entries/route.ts',
  'src/app/api/members/route.ts',
  'src/app/api/settings/audit-log/route.ts',
  'src/app/api/settings/categories/[id]/route.ts',
  'src/app/api/settings/categories/route.ts',
  'src/app/api/settings/faqs/route.ts',
  'src/app/api/training/sessions/[id]/attendance/route.ts',
  'src/app/api/training/sessions/[id]/register/route.ts',
  'src/app/api/training/sessions/route.ts',
  'src/app/cataloging/page.tsx',
  'src/app/manage-books/page.tsx',
  'src/app/manage-loans/page.tsx',
  'src/app/onboarding/page.tsx',
  'src/app/profile/page.tsx',
  'src/app/recommendations/page.tsx',
  'src/components/ConsolidatedAuditLogs.tsx',
  'src/components/reservations/ActiveReservationsCard.tsx',
  'src/lib/activity-logger.ts',
  'src/lib/notification-helpers.ts',
  'src/lib/pdf-export.ts',
];

files.forEach(file => {
  try {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Arquivo não encontrado: ${file}`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Substituir error: any por error: Error
    content = content.replace(/\(error: any\)/g, '(error: Error)');
    content = content.replace(/: any\)/g, ': unknown)');
    
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
