/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// Arquivos e suas correções
const fixes = [
  // Settings
  {
    file: 'src/app/api/settings/audit-log/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' },
      { from: /import { z } from "zod";\n/g, to: '' }
    ]
  },
  {
    file: 'src/app/api/settings/categories/[id]/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/settings/categories/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  // Activity logs
  {
    file: 'src/app/api/activity-logs/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  // Members
  {
    file: 'src/app/api/members/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  // Training sessions
  {
    file: 'src/app/api/training/sessions/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/training/sessions/[id]/attendance/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/training/sessions/[id]/register/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  // Cataloging
  {
    file: 'src/app/api/cataloging/entries/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/cataloging/entries/[id]/approve/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/cataloging/enrich/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' },
      { from: /const publishedYear = /g, to: '// const publishedYear = ' }
    ]
  },
  // Computers
  {
    file: 'src/app/api/computers/[id]/accept/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/computers/[id]/cancel/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/computers/[id]/reject/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/computers/[id]/release/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/computers/[id]/renew/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/computers/[id]/reserve/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  // Lockers
  {
    file: 'src/app/api/lockers/[id]/accept/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/lockers/[id]/cancel/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/lockers/[id]/reject/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/lockers/[id]/release/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/lockers/[id]/renew/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
    ]
  },
  {
    file: 'src/app/api/lockers/[id]/reserve/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' },
      { from: /import { canManageMembers } from "@\/lib\/permissions";\n/g, to: '' }
    ]
  },
  // FAQs
  {
    file: 'src/app/api/settings/faqs/route.ts',
    replacements: [
      { from: /} catch \(error: any\)/g, to: '} catch (error: unknown)' }
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
