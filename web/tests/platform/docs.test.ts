import { it, expect } from 'vitest';
import { componentDocumentation, documentationPaths } from '@/platform/publications';

it('uses the public Buttons route without publishing companion-only components', () => {
    // Assert
    expect(componentDocumentation.find((component) => component.name === 'Button')?.slug).toBe('buttons');
    expect(documentationPaths).toContain('/docs/sdk/views/buttons');
    expect(componentDocumentation.some((component) => component.name === 'CodeBlock')).toBe(false);
    expect(new Set(documentationPaths).size).toBe(documentationPaths.length);
});
