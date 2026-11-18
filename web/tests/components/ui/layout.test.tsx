// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { act, useState } from 'react';
import Content from '@/components/layouts/content';
import userEvent from '@testing-library/user-event';
import { Box } from '@/components/longlink/layout/box';
import { renderStatic, withMounted } from '../../render';
import { Grid } from '@/components/longlink/layout/grid';
import { PageContainer } from '@/components/ui/page-container';
import { Stack, StackItem } from '@/components/longlink/layout/stack';

it('keeps Platform pages free of View spacing defaults and honors zero inline padding', () => {
    // Platform pages must not inherit the View Stack's implicit gap or lose their full-height sizing chain.
    const output = renderStatic(
        <>
            <PageContainer>
                <h1>Default page</h1>
            </PageContainer>
            <PageContainer className="h-full min-h-0 max-w-[720px]" gap={8} padding={2} paddingInline={0}>
                <h2>Sized page</h2>
            </PageContainer>
        </>
    );

    const plain = output.querySelector('h1')?.parentElement;
    const sized = output.querySelector('h2')?.parentElement;

    if (!plain || !sized) throw new Error('Expected page containers');
    expect(plain.style.gap).toBe('calc(var(--spacing) * 0)');
    expect(plain.style.paddingInline).toBe('');
    expect(plain.style.paddingBlock).toBe('');
    expect(plain.classList.contains('max-w-[1000px]')).toBe(true);
    expect(sized.classList.contains('h-full')).toBe(true);
    expect(sized.classList.contains('min-h-0')).toBe(true);
    expect(sized.classList.contains('max-w-[720px]')).toBe(true);
    expect(sized.classList.contains('max-w-[1000px]')).toBe(false);
    expect(sized.style.gap).toBe('calc(var(--spacing) * 8)');
    expect(sized.style.paddingInline).toBe('calc(var(--spacing) * 0)');
    expect(sized.style.paddingBlock).toBe('calc(var(--spacing) * 2)');
});

it.each([Stack, Grid])('forwards native container events alongside layout props', async (Layout) => {
    const user = userEvent.setup();
    let resets = 0;

    await withMounted(
        <Layout role="region" aria-label="Draft preview" gap={4} onResetCapture={() => resets++}>
            <form>
                <button type="reset">Reset draft</button>
            </form>
        </Layout>,
        async (output) => {
            const container = output.querySelector<HTMLDivElement>('[role="region"]');
            const button = output.querySelector('button');

            if (!container || !button) throw new Error('Expected a native preview container');

            expect(container.getAttribute('aria-label')).toBe('Draft preview');
            expect(container.style.gap).toBe('calc(var(--spacing) * 4)');
            await user.click(button);
            expect(resets).toBe(1);
        }
    );
});

it.each([Box, Grid])('updates padding overrides without remounting an editable child', async (Layout) => {
    // Arrange
    const user = userEvent.setup();

    function Preview() {
        const [compact, setCompact] = useState(false);

        return (
            <>
                <button type="button" onClick={() => setCompact((value) => !value)}>
                    Toggle spacing
                </button>
                <Layout padding={4} paddingInline={compact ? 0 : undefined} paddingBlock={compact ? 2 : undefined}>
                    <input aria-label="Draft" defaultValue="Retained" />
                </Layout>
            </>
        );
    }

    await withMounted(<Preview />, async (output) => {
        const input = output.querySelector('input');
        const toggle = output.querySelector('button');
        const layout = input?.parentElement;

        if (!input || !toggle || !layout) throw new Error('Expected an editable preview');
        await act(async () => user.type(input, ' draft'));

        // Act
        await act(async () => user.click(toggle));

        // Assert
        expect(output.querySelector('input')).toBe(input);
        expect(input.value).toBe('Retained draft');
        expect(layout.style.paddingInline).toBe('calc(var(--spacing) * 0)');
        expect(layout.style.paddingBlock).toBe('calc(var(--spacing) * 2)');
        expect(layout.hasAttribute('padding')).toBe(false);

        // Act
        await act(async () => user.click(toggle));

        // Assert
        expect(layout.style.paddingInline).toBe('calc(var(--spacing) * 4)');
        expect(layout.style.paddingBlock).toBe('calc(var(--spacing) * 4)');
        expect(input.value).toBe('Retained draft');
    });
});

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
            expect(input.value).toBe('Retained draft');
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
