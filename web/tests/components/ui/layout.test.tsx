// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { act, useState } from 'react';
import { withMounted } from '../../render';
import Content from '@/components/layouts/content';
import userEvent from '@testing-library/user-event';
import { Stack, StackItem } from '@/components/longlink/layout/stack';

it('retains an unsaved content draft when its toolbar is removed and restored', async () => {
    const user = userEvent.setup();
    const submissions: FormDataEntryValue[] = [];

    function Page() {
        const [toolbar, setToolbar] = useState(true);

        return (
            <>
                <button type="button" onClick={() => setToolbar((value) => !value)}>
                    Toggle toolbar
                </button>
                <Content toolbar={toolbar ? <button type="button">Toolbar action</button> : undefined}>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            const value = new FormData(event.currentTarget).get('draft');

                            if (value !== null) submissions.push(value);
                        }}
                    >
                        <input aria-label="Draft" name="draft" />
                        <button type="submit">Save draft</button>
                    </form>
                </Content>
            </>
        );
    }

    await withMounted(<Page />, async (output) => {
        const input = output.querySelector<HTMLInputElement>('input');
        const toggle = output.querySelector('button');

        if (!input || !toggle) throw new Error('Expected draft and toolbar controls');
        await act(async () => user.type(input, 'Retained draft'));

        for (let index = 0; index < 2; index++) {
            await act(async () => user.click(toggle));
            expect(output.querySelector('input')).toBe(input);
        }

        const submit = output.querySelector<HTMLButtonElement>('button[type="submit"]');

        if (!submit) throw new Error('Expected draft submission');
        await act(async () => user.click(submit));
        expect(submissions).toEqual(['Retained draft']);
    });
});

it('names a scrolling StackItem only while its retained content overflows', async () => {
    await withMounted(
        <div className="grid h-25 grid-rows-[minmax(0,1fr)]">
            <Stack>
                <StackItem size="fill" isScrollable>
                    <p>Content</p>
                </StackItem>
            </Stack>
        </div>,
        async (output) => {
            const item = output.querySelector<HTMLElement>('.view-stack-item');

            if (!item) throw new Error('Expected the scroll container');
            let contentHeight = 200;

            // Supply layout measurements missing from Happy DOM, keeping real resize delivery.
            Object.defineProperties(item, {
                clientWidth: { value: 100 },
                clientHeight: { value: 100 },
                scrollWidth: { value: 100 },
                scrollHeight: { get: () => contentHeight }
            });

            await act(async () => window.dispatchEvent(new Event('resize')));
            expect(item.getAttribute('role')).toBe('group');
            expect(item.getAttribute('aria-label')).toBe('Content');

            contentHeight = 101;
            await act(async () => window.dispatchEvent(new Event('resize')));
            expect(item.hasAttribute('role')).toBe(false);
            expect(item.hasAttribute('aria-label')).toBe(false);
        }
    );
});
