// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import Home from '@/platform/routes/Index';
import { renderStatic } from '../../render';

it('keeps the public onboarding destination reachable', () => {
    // Act
    const output = renderStatic(<Home />);

    // Assert
    expect(output.querySelector('a[href="/login/"]')?.textContent).toContain('Get Started');
    expect(output.querySelector('a[href="mailto:info@longlink.dev"]')?.textContent).toContain('Contact Us');
});
