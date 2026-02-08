/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');

const fixes = [
  // Admin pages
  {
    file: 'src/app/admin/computers/page.tsx',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/admin/lockers/page.tsx',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/admin/settings/page.tsx',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' },
      { from: /&quot;/g, to: '&quot;' },
      { from: /`"/g, to: '`&quot;' },
      { from: /"`/g, to: '&quot;`' }
    ]
  },
  {
    file: 'src/app/admin/special-requests/page.tsx',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' },
      { from: /const STATUS_LABELS = /g, to: '// const STATUS_LABELS = ' }
    ]
  },
  // Other pages
  {
    file: 'src/app/cataloging/page.tsx',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/manage-books/page.tsx',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/manage-loans/page.tsx',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/onboarding/page.tsx',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/profile/page.tsx',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' },
      { from: /import { getUserStatusLabel } from "@\/lib\/utils";\n/g, to: '' }
    ]
  },
  {
    file: 'src/app/recommendations/page.tsx',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/services/page.tsx',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  // Components
  {
    file: 'src/components/ConsolidatedAuditLogs.tsx',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/components/notifications/NotificationCenter.tsx',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' },
      { from: /import { RefreshCw } from "lucide-react";\n/g, to: '' },
      { from: /import { hasNotificationAction } from "@\/lib\/notification-helpers";\n/g, to: '' },
      { from: /const handleNotificationClick = /g, to: '// const handleNotificationClick = ' }
    ]
  },
  {
    file: 'src/components/reservations/ActiveReservationsCard.tsx',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' },
      { from: /import { MapPin, /g, to: 'import { ' }
    ]
  },
  // Lib files
  {
    file: 'src/lib/activity-logger.ts',
    replacements: [
      { from: /metadata\?: any/g, to: 'metadata?: Record<string, unknown>' },
      { from: /oldValue\?: any/g, to: 'oldValue?: unknown' },
      { from: /newValue\?: any/g, to: 'newValue?: unknown' },
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/lib/notification-helpers.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' },
      { from: /metadata\?: any/g, to: 'metadata?: Record<string, unknown>' }
    ]
  },
  {
    file: 'src/lib/pdf-export.ts',
    replacements: [
      { from: /: any\[\]/g, to: ': unknown[]' },
      { from: /: any\)/g, to: ': unknown)' },
      { from: /: any =/g, to: ': unknown =' }
    ]
  },
  // Test files
  {
    file: 'src/lib/__tests__/recommendations.test.ts',
    replacements: [
      { from: /as any/g, to: 'as unknown' }
    ]
  }
];

fixes.forEach(({ file, replacements }) => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    replacements.forEach(({ from, to }) => {
      if (content.match(from)) {
        content = content.replace(from, to);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✓ Fixed: ${file}`);
    }
  } catch (error) {
    console.log(`✗ Error fixing ${file}:`, error.message);
  }
});

console.log('\nDone!');
