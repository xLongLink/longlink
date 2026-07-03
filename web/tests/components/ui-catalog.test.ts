import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'bun:test';

const uiDirectory = join(import.meta.dir, '../../src/components/ui');

describe('UI primitive catalog', () => {
    it('includes primitives for layout, forms, navigation, overlays, feedback, and data display', () => {
        const files = new Set(readdirSync(uiDirectory).filter((file) => file.endsWith('.tsx')));

        expect(files).toContain('button.tsx');
        expect(files).toContain('dialog.tsx');
        expect(files).toContain('field.tsx');
        expect(files).toContain('table.tsx');
        expect(files).toContain('menu.tsx');
        expect(files).toContain('navigation-menu.tsx');
        expect(files).toContain('popover.tsx');
        expect(files).toContain('tooltip.tsx');
        expect(files).toContain('stack.tsx');
        expect(files).toContain('grid.tsx');
        expect(files).toContain('columns.tsx');
        expect(files).toContain('badge.tsx');
        expect(files).toContain('avatar.tsx');
        expect(files).toContain('alert.tsx');
        expect(files).toContain('sonner.tsx');
    });

    it('keeps shared React components available beside XML adapter primitives', () => {
        expect(existsSync(join(import.meta.dir, '../../src/components/DataTable.tsx'))).toBe(true);
        expect(existsSync(join(import.meta.dir, '../../src/components/CodeBlock.tsx'))).toBe(true);
        expect(existsSync(join(import.meta.dir, '../../src/xml/adapters/DataTable.tsx'))).toBe(true);
        expect(existsSync(join(import.meta.dir, '../../src/xml/adapters/Dialog.tsx'))).toBe(true);
    });
});
