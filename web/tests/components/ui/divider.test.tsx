// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { compile } from 'tailwindcss';
import { renderStatic } from '../../render';
import { Divider } from '@/components/custom/divider';
import { Separator } from '@/components/shadcn/separator';

it.each([
    { orientation: 'horizontal', dimension: 'height' },
    { orientation: 'vertical', dimension: 'width' }
] as const)(
    'gives the $orientation line visible thickness using Base UI orientation attributes',
    async ({ orientation, dimension }) => {
        // Compile the actual line classes against the attributes emitted by the installed Base UI primitive.
        const output = renderStatic(<Separator orientation={orientation} />);
        const line = output.querySelector<HTMLElement>('[data-slot="separator"]');

        if (!line) throw new Error('Expected a divider line');

        const compiler = await compile('@tailwind utilities;');
        const css = compiler.build(Array.from(line.classList));

        // A selector mismatch leaves the line with no thickness and makes sidebar dividers disappear.
        expect(line.getAttribute('data-orientation')).toBe(orientation);
        expect(css).toMatch(new RegExp(`\\[data-orientation="${orientation}"\\]\\s*\\{\\s*${dimension}: 1px;`));
    }
);

it('keeps a labeled divider named and its recovery link available', () => {
    // Render a real authentication-style label rather than a decorative-only line.
    const output = renderStatic(
        <Divider
            label={
                <>
                    Already registered? <a href="/login">Sign in</a>
                </>
            }
        />
    );

    const separator = output.querySelector('[role="separator"]:not([aria-hidden])');
    const labelId = separator?.getAttribute('aria-labelledby');

    // Preserve the accessible name without announcing each decorative line separately.
    expect(labelId).toBeTruthy();
    expect(output.querySelector(`[id="${labelId}"]`)?.textContent).toBe('Already registered? Sign in');
    expect(output.querySelector('a')?.getAttribute('href')).toBe('/login');
    expect(output.querySelectorAll('[role="separator"]:not([aria-hidden])')).toHaveLength(1);
});

it('preserves a numeric zero label and vertical orientation', () => {
    // Zero is meaningful label content, not an absent label.
    const output = renderStatic(<Divider label={0} orientation="vertical" />);
    const separator = output.querySelector('[role="separator"]:not([aria-hidden])');
    const labelId = separator?.getAttribute('aria-labelledby');

    // Keep both the authored label and orientation available to assistive technology.
    expect(output.querySelector(`[id="${labelId}"]`)?.textContent).toBe('0');
    expect(separator?.getAttribute('aria-orientation')).toBe('vertical');
});
