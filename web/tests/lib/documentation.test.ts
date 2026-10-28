import { it, expect } from 'vitest';
import { componentDocumentation } from '@/platform/routes';
import { documentationCategories } from '@/lib/documentation';

it('places every published component in a documented reading category', () => {
    // Assert
    expect(new Set(componentDocumentation.map((entry) => entry.category))).toEqual(new Set(documentationCategories));
});
