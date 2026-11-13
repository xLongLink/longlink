// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

it('selects composed panels without activating disabled tabs', async () => {
    // Nested labels and separate panels must remain connected through native composition.
    await withMounted(
        <Tabs defaultValue="orders">
            <TabsList aria-label="Orders">
                <TabsTrigger value="orders">
                    <span>Orders</span>
                </TabsTrigger>
                <TabsTrigger value="restricted" disabled>
                    Restricted
                </TabsTrigger>
                <TabsTrigger value="archive">Archive</TabsTrigger>
            </TabsList>
            <section>
                <TabsContent value="orders">Order list</TabsContent>
                <TabsContent value="restricted">Restricted details</TabsContent>
                <TabsContent value="archive">Archived list</TabsContent>
            </section>
        </Tabs>,
        async (output) => {
            const user = userEvent.setup();
            const tabs = output.querySelectorAll<HTMLButtonElement>('[role="tab"]');

            if (!tabs[0] || !tabs[1] || !tabs[2]) throw new Error('Expected order tabs');
            await act(async () => tabs[1]?.click());
            expect(output.querySelector('[role="tabpanel"]')?.textContent).toBe('Order list');
            expect(output.textContent).not.toContain('Restricted details');

            await act(async () => {
                tabs[2]?.focus();
                await user.keyboard('{Enter}');
            });
            const panel = output.querySelector('[role="tabpanel"]');

            expect(panel?.textContent).toBe('Archived list');
            expect(tabs[2].getAttribute('aria-selected')).toBe('true');
            expect(tabs[2].getAttribute('aria-controls')).toBe(panel?.id);
            expect(panel?.getAttribute('aria-labelledby')).toBe(tabs[2].id);
        }
    );
});

it('lets the caller accept controlled selection changes', async () => {
    const changed = vi.fn();

    // The owner can reject an activation and later accept the same requested value.
    function ControlledTabs() {
        const [value, setValue] = useState<unknown>('orders');
        const [acceptChanges, setAcceptChanges] = useState(false);

        return (
            <>
                <button type="button" onClick={() => setAcceptChanges(true)}>
                    Allow changes
                </button>
                <Tabs
                    value={value}
                    onValueChange={(nextValue) => {
                        changed(nextValue);

                        if (acceptChanges) setValue(nextValue);
                    }}
                >
                    <TabsList>
                        <TabsTrigger value="orders">Orders</TabsTrigger>
                        <TabsTrigger value="archive">Archive</TabsTrigger>
                    </TabsList>
                    <TabsContent value="orders">Order list</TabsContent>
                    <TabsContent value="archive">Archived list</TabsContent>
                </Tabs>
            </>
        );
    }

    await withMounted(<ControlledTabs />, async (output) => {
        const archive = output.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1];
        const allow = output.querySelector<HTMLButtonElement>('button');

        if (!archive || !allow) throw new Error('Expected controlled tabs');
        await act(async () => archive.click());
        expect(changed).toHaveBeenCalledWith('archive');
        expect(output.querySelector('[role="tabpanel"]')?.textContent).toBe('Order list');

        await act(async () => allow.click());
        await act(async () => archive.click());
        expect(output.querySelector('[role="tabpanel"]')?.textContent).toBe('Archived list');
    });
});
