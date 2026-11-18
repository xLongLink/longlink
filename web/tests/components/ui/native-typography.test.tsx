// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { Text } from '@/components/longlink/display/text';
import { Heading } from '@/components/longlink/display/heading';

it('preserves heading targets with native document outline semantics', () => {
    const output = renderStatic(
        <Heading id="account" level={4} size={2} align="end">
            Account
        </Heading>
    );

    const heading = output.querySelector('#account');

    expect(heading?.tagName).toBe('H4');
    expect(heading?.hasAttribute('aria-level')).toBe(false);
    expect(output.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(1);
});

it('keeps native focus and caller handlers working on Text', async () => {
    const user = userEvent.setup();
    const onFocus = vi.fn();

    await withMounted(
        <Text tabIndex={0} onFocus={onFocus} maxLines={1}>
            Account details
        </Text>,
        async (output) => {
            const text = output.querySelector('[data-slot="text"]');

            if (!(text instanceof HTMLElement)) throw new Error('Missing native text');

            await act(async () => await user.tab());

            expect(document.activeElement).toBe(text);
            expect(onFocus).toHaveBeenCalledOnce();
        }
    );
});
