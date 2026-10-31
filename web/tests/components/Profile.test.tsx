// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { ProfileMenu } from '@/components/Profile';
import { renderPlatform } from '../platform/render';

it('identifies the profile trigger without prematurely opening account actions', () => {
    // Act
    const output = renderPlatform(<ProfileMenu />);

    // Assert
    expect(output.querySelector('button')?.getAttribute('aria-label')).toBe('Owner');
    expect(output.textContent).not.toContain('Sign out');
});
