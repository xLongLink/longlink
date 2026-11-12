// @vitest-environment happy-dom
import { act, useState } from 'react';
import { compile } from 'tailwindcss';
import { it, expect, vi } from 'vitest';
import { Tabs, Tab } from '@/components/ui/Tabs';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';

it('falls back to the first tab for an unknown controlled selection', () => {
    // Act
    const output = renderStatic(
        <Tabs value="missing">
            <Tab label="Orders" value="orders">
                Order list
            </Tab>
            <Tab label="Archive" value="archive">
                Archived list
            </Tab>
        </Tabs>
    );

    // Assert
    expect(output.querySelector('[role="tabpanel"]')?.textContent).toBe('Order list');
    expect(output.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain('Orders');
});

it('lays out horizontal tabs using the orientation attribute emitted by Base UI', async () => {
    // Registry styles must match the installed primitive rather than silently falling back to a row layout.
    const output = renderStatic(
        <Tabs>
            <Tab label="Orders" value="orders">
                Order list
            </Tab>
        </Tabs>
    );

    const root = output.querySelector<HTMLElement>('[data-slot="tabs"]');

    if (!root) throw new Error('Expected the tabs root');

    const compiler = await compile('@tailwind utilities;');
    const css = compiler.build(Array.from(root.classList));

    expect(root.getAttribute('data-orientation')).toBe('horizontal');
    expect(css).toMatch(/\[data-orientation="horizontal"\]\s*\{\s*flex-direction: column;/);
});

it('keeps disabled tabs discoverable without activating their panels', async () => {
    // Moving focus must not mount another panel until the user activates the focused tab.
    await withMounted(
        <Tabs>
            <Tab label="Orders" value="orders">
                Order list
            </Tab>
            <Tab label="Restricted" value="restricted" isDisabled>
                Restricted details
            </Tab>
            <Tab label="Archive" value="archive">
                Archived list
            </Tab>
        </Tabs>,
        async (output) => {
            const keyboard = userEvent.setup();
            const tabs = output.querySelectorAll<HTMLButtonElement>('[role="tab"]');

            await act(async () => {
                tabs[0]?.focus();
                await keyboard.keyboard('{ArrowRight}');
            });
            expect(document.activeElement).toBe(tabs[1]);
            expect(tabs[1]?.getAttribute('aria-disabled')).toBe('true');
            await act(async () => keyboard.keyboard('{Enter}'));
            expect(output.querySelector('[role="tabpanel"]')?.textContent).toBe('Order list');
            expect(output.textContent).not.toContain('Restricted details');

            await act(async () => keyboard.keyboard('{ArrowRight}'));
            expect(document.activeElement).toBe(tabs[2]);
            await act(async () => keyboard.keyboard('{Enter}'));
            const panel = output.querySelector('[role="tabpanel"]');

            expect(panel?.textContent).toBe('Archived list');
            expect(tabs[2]?.getAttribute('aria-selected')).toBe('true');
            expect(tabs[2]?.getAttribute('aria-controls')).toBe(panel?.id);
            expect(output.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);
        }
    );
});

it('unmounts inactive panels instead of preserving their local draft state', async () => {
    // Each activation mounts the authored panel afresh, as required by the View API.
    function Draft() {
        const [value, setValue] = useState('');

        return <input aria-label="Draft" value={value} onChange={(event) => setValue(event.target.value)} />;
    }

    await withMounted(
        <Tabs>
            <Tab label="Draft" value="draft">
                <Draft />
            </Tab>
            <Tab label="Archive" value="archive">
                Archive
            </Tab>
        </Tabs>,
        async (output) => {
            const keyboard = userEvent.setup();
            const input = output.querySelector<HTMLInputElement>('input');
            const tabs = output.querySelectorAll<HTMLButtonElement>('[role="tab"]');

            if (!input || !tabs[0] || !tabs[1]) throw new Error('Expected tabs and draft field');
            await act(async () => keyboard.type(input, 'Unsaved order'));
            await act(async () => tabs[1]?.click());
            expect(output.querySelector('input')).toBeNull();

            await act(async () => tabs[0]?.click());
            expect(output.querySelector<HTMLInputElement>('input')?.value).toBe('');
        }
    );
});

it('reports controlled activation without changing the selected panel itself', async () => {
    // Only the caller may accept a new selection in controlled mode.
    const changed = vi.fn();
    await withMounted(
        <Tabs value="orders" onChange={changed}>
            <Tab label="Orders" value="orders">
                Orders
            </Tab>
            <Tab label="Archive" value="archive">
                Archive
            </Tab>
        </Tabs>,
        async (output) => {
            const archive = output.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1];

            if (!archive) throw new Error('Expected archive tab');
            await act(async () => archive.click());
            expect(changed).toHaveBeenCalledWith('archive');
            expect(output.querySelector('[role="tabpanel"]')?.textContent).toBe('Orders');
        }
    );
});
