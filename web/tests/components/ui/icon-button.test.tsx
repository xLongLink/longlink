// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import { IconButton } from '@/components/custom/icon-button';

it('keeps an accessible action name on the icon-only control', () => {
    // Act
    const output = renderStatic(<IconButton label="Delete order" icon="trash" />);

    // Assert
    expect(output.querySelector('button')?.getAttribute('aria-label')).toBe('Delete order');
    expect(output.querySelector('button')?.getAttribute('type')).toBe('button');
});
