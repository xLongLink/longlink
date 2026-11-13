// @vitest-environment happy-dom
import { act, createRef } from 'react';
import { it, expect, vi } from 'vitest';
import { Text } from '@/components/custom/text';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { NativeText } from '@/components/custom/native-text';
import { NativeHeading } from '@/components/custom/native-heading';

it('preserves heading targets while separating the accessible level from visual sizing', () => {
    const output = renderStatic(
        <NativeHeading id="account" level={4} accessibilityLevel={1}>
            Account
        </NativeHeading>
    );

    const heading = output.querySelector('#account');

    expect(heading?.tagName).toBe('H4');
    expect(heading?.getAttribute('aria-level')).toBe('1');
    expect(heading?.getAttribute('data-level')).toBe('4');
    expect(output.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(1);
});

it('keeps native refs, focus and caller handlers working with truncation details', async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLElement>();
    const onFocus = vi.fn();

    await withMounted(
        <NativeText as="p" ref={ref} tabIndex={0} onFocus={onFocus} maxLines={1}>
            Account details
        </NativeText>,
        async (output) => {
            const paragraph = output.querySelector('p');

            if (!paragraph) throw new Error('Missing native text');

            expect(ref.current).toBe(paragraph);
            Object.defineProperty(paragraph, 'offsetWidth', { configurable: true, value: 20 });
            Object.defineProperty(paragraph, 'scrollWidth', { configurable: true, value: 200 });
            await act(async () => {
                paragraph.textContent = 'Updated account details';
            });
            await act(async () => await user.tab());
            await vi.waitFor(() =>
                expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Updated account details')
            );

            expect(document.activeElement).toBe(paragraph);
            expect(onFocus).toHaveBeenCalledOnce();
            expect(ref.current).toBe(paragraph);
        }
    );

    expect(ref.current).toBeNull();
});

it('does not forward trusted native attributes through the isolated View text API', () => {
    const attributes = { id: 'injected', className: 'injected', tabIndex: 0, role: 'button' };
    const output = renderStatic(<Text {...attributes}>Read-only content</Text>);
    const text = output.querySelector('.view-text');

    expect(text?.textContent).toBe('Read-only content');
    expect(text?.id).not.toBe('injected');
    expect(text?.classList.contains('injected')).toBe(false);
    expect(text?.hasAttribute('tabindex')).toBe(false);
    expect(text?.hasAttribute('role')).toBe(false);
});
