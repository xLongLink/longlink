// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"navigation":{"disableChildPageNavigation":true}}}
import { act } from 'react';
import { it, expect } from 'vitest';
import { useLocation } from 'react-router';
import Brand from '@/platform/layouts/brand';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';

it('leaves documentation in a protected new tab without discarding the current authentication draft', async () => {
    function Account() {
        const { pathname } = useLocation();

        return (
            <Brand>
                <output>{pathname}</output>
                <input aria-label="Email" />
            </Brand>
        );
    }

    await withMounted(
        <Account />,
        async (output) => {
            const input = output.querySelector<HTMLInputElement>('input');
            const link = output.querySelector<HTMLAnchorElement>('a[href="/docs/"]');

            if (!input || !link) throw new Error('Expected account draft and documentation action');
            await act(async () => userEvent.setup().type(input, 'owner@example.test'));
            const click = new MouseEvent('click', { bubbles: true, cancelable: true });
            await act(async () => link.dispatchEvent(click));
            expect(click.defaultPrevented).toBe(false);
            expect(link.target).toBe('_blank');
            expect(link.rel.split(' ')).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
            expect(output.querySelector('output')?.textContent).toBe('/login');
            expect(output.querySelector('input')).toBe(input);
            expect(input.value).toBe('owner@example.test');
        },
        '/login'
    );
});

it('keeps private pages out of search without publishing a canonical URL', () => {
    // Act
    const output = renderStatic(
        <Brand>
            <title>Account | LongLink</title>
        </Brand>
    );

    // Assert
    expect(output.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
    expect(output.querySelector('link[rel="canonical"]')).toBeNull();
});
