import { it, expect } from 'vitest';
import { documentationCategories } from '@/lib/documentation';
import { componentDocumentation } from '@/platform/publications';

it('places every published component in a documented reading category', () => {
    // Assert
    expect(new Set(componentDocumentation.map((entry) => entry.category))).toEqual(new Set(documentationCategories));
});
