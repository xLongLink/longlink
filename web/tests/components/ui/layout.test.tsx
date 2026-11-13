// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { act, useState } from 'react';
import Content from '@/components/layouts/content';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { Grid, GridSpan } from '@/components/custom/grid';
import { PageContainer } from '@/components/page-container';
import { Stack, StackItem } from '@/components/custom/stack';

it('keeps Platform pages free of View spacing defaults and honors zero inline padding', () => {
    // Platform pages must not inherit the View Stack's implicit gap or lose their full-height sizing chain.
    const output = renderStatic(
        <>
            <PageContainer>
                <h1>Default page</h1>
            </PageContainer>
            <PageContainer height="100%" minHeight={0} maxWidth={720} gap={8} padding={2} paddingInline={0}>
                <h2>Sized page</h2>
            </PageContainer>
        </>
    );

    const plain = output.querySelector('h1')?.parentElement;
    const sized = output.querySelector('h2')?.parentElement;

    if (!plain || !sized) throw new Error('Expected page containers');
    expect(plain.style.gap).toBe('');
    expect(plain.style.paddingInline).toBe('');
    expect(plain.style.paddingBlock).toBe('');
    expect(sized.style.height).toBe('100%');
    expect(Number.parseFloat(sized.style.minHeight)).toBe(0);
    expect(sized.style.maxWidth).toBe('720px');
    expect(sized.style.gap).toBe('var(--spacing-8)');
    expect(sized.style.paddingInline).toBe('var(--spacing-0)');
    expect(sized.style.paddingBlock).toBe('var(--spacing-2)');
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

it('collapses spanning children on viewport changes without collapsing nested independent grids', async () => {
    const originalWidth = window.innerWidth;

    try {
        await act(async () => {
            window.innerWidth = 1000;
            window.dispatchEvent(new Event('resize'));
        });

        await withMounted(
            <Grid columns={3} collapseBelow={600}>
                <GridSpan columns={2}>
                    <Grid columns={2}>
                        <GridSpan columns={2}>Nested</GridSpan>
                    </Grid>
                </GridSpan>
            </Grid>,
            async (output) => {
                const spans = output.querySelectorAll<HTMLElement>('.view-grid-span');
                expect(spans[0]?.style.gridColumn).toBe('span 2');

                await act(async () => {
                    window.innerWidth = 600;
                    window.dispatchEvent(new Event('resize'));
                });

                expect(spans[0]?.style.gridColumn).toBe('1 / -1');
                expect(spans[1]?.style.gridColumn).toBe('span 2');

                await act(async () => {
                    window.innerWidth = 601;
                    window.dispatchEvent(new Event('resize'));
                });

                expect(spans[0]?.style.gridColumn).toBe('span 2');
            }
        );
    } finally {
        window.innerWidth = originalWidth;
        window.dispatchEvent(new Event('resize'));
    }
});

it('names a scrolling StackItem only while its retained content overflows', async () => {
    await withMounted(
        <Stack height={100}>
            <StackItem size="fill" isScrollable>
                <p>Content</p>
            </StackItem>
        </Stack>,
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
