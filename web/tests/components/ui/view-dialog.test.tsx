// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/longlink/form/input';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { DialogActivityContext } from '@/lib/view-capabilities';

it.each([false, true])(
    'closes without submitting and submits from the owned footer (fullscreen: %s)',
    async (fullscreen) => {
        const saved: FormData[] = [];
        const opened = vi.fn();
        const activity = vi.fn();

        function Editor() {
            const [open, setOpen] = useState(false);

            return (
                <DialogActivityContext value={activity}>
                    <Dialog
                        title="Edit order"
                        description="Update the order reference."
                        fullscreen={fullscreen}
                        open={open}
                        onOpenChange={setOpen}
                        trigger={<Button onClick={opened}>Edit</Button>}
                        footer={
                            <Button type="submit" form="order-editor">
                                Save
                            </Button>
                        }
                    >
                        <form
                            id="order-editor"
                            onSubmit={(event) => {
                                event.preventDefault();
                                saved.push(new FormData(event.currentTarget));
                                setOpen(false);
                            }}
                        >
                            <Input name="reference" label="Reference" defaultValue="PO-871" />
                        </form>
                    </Dialog>
                </DialogActivityContext>
            );
        }

        await withMounted(<Editor />, async (output) => {
            const trigger = output.querySelector('button');

            if (!trigger) throw new Error('Expected the connected trigger');
            const user = userEvent.setup();
            await act(async () => user.click(trigger));
            const modal = document.querySelector<HTMLElement>('[role="dialog"]');
            const close = modal?.querySelector('[data-slot="dialog-close"]');

            if (!modal || !close) throw new Error('Expected the owned dialog and close action');
            if (!fullscreen) expect(modal.style.width).toBe('960px');
            expect(document.getElementById(modal.getAttribute('aria-labelledby') ?? '')?.textContent).toBe(
                'Edit order'
            );
            expect(document.getElementById(modal.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
                'Update the order reference.'
            );
            expect(activity).toHaveBeenLastCalledWith(true);
            const firstInput = modal.querySelector('input');
            expect(document.activeElement).toBe(firstInput);
            await act(async () => user.tab({ shift: true }));
            expect(document.activeElement).toBe(close);
            await act(async () => user.tab());
            expect(document.activeElement).toBe(firstInput);
            await act(async () => user.click(close));
            expect(saved).toEqual([]);
            expect(document.querySelector('[role="dialog"]')).toBeNull();
            expect(document.activeElement).toBe(trigger);
            await act(async () => user.click(trigger));
            const input = document.querySelector<HTMLInputElement>('[role="dialog"] input[name="reference"]');
            const save = document.querySelector('[data-slot="dialog-footer"] button');

            if (!input || !save) throw new Error('Expected the form and footer submit action');
            await act(async () => user.clear(input));
            await act(async () => user.type(input, 'PO-904'));
            await act(async () => user.click(save));
            expect(saved).toHaveLength(1);
            expect(saved[0]?.get('reference')).toBe('PO-904');
            expect(document.querySelector('[role="dialog"]')).toBeNull();
            expect(activity).toHaveBeenLastCalledWith(false);
            expect(opened).toHaveBeenCalledTimes(2);
        });
    }
);

it('blocks user dismissal during pending work but permits a caller-controlled successful close', async () => {
    const activity = vi.fn();
    const changes: boolean[] = [];

    function Upload() {
        const [open, setOpen] = useState(false);

        return (
            <DialogActivityContext value={activity}>
                <Dialog
                    title="Upload"
                    dismissible={false}
                    open={open}
                    onOpenChange={(value) => {
                        changes.push(value);
                        setOpen(value);
                    }}
                    trigger={<Button>Upload</Button>}
                    footer={<Button onClick={() => setOpen(false)}>Finish</Button>}
                >
                    <Input label="Filename" defaultValue="report.pdf" />
                </Dialog>
            </DialogActivityContext>
        );
    }

    await withMounted(<Upload />, async (output) => {
        const trigger = output.querySelector('button');

        if (!trigger) throw new Error('Expected upload trigger');
        const user = userEvent.setup();
        await act(async () => user.click(trigger));
        const modal = document.querySelector('[role="dialog"]');
        const backdrop = document.querySelector('[data-slot="dialog-overlay"]');

        if (!modal || !backdrop) throw new Error('Expected pending modal');
        expect(modal.querySelector('[data-slot="dialog-close"]')).toBeNull();
        await act(async () => user.keyboard('{Escape}'));
        await act(async () => user.click(backdrop));
        expect(document.querySelector('[role="dialog"]')).toBe(modal);
        expect(changes).toEqual([true]);
        expect(activity.mock.calls).toEqual([[true]]);
        const finish = modal.querySelector('[data-slot="dialog-footer"] button');

        if (!finish) throw new Error('Expected the completion action');
        await act(async () => user.click(finish));
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        expect(activity).toHaveBeenLastCalledWith(false);
        expect(document.activeElement).toBe(trigger);
    });
});

it('resizes an open dialog through props without losing its draft', async () => {
    // Arrange
    const user = userEvent.setup();

    function Editor() {
        const [expanded, setExpanded] = useState(false);

        return (
            <Dialog
                title="Edit draft"
                trigger={<Button>Edit</Button>}
                width={expanded ? 720 : 640}
                height={expanded ? 400 : 'auto'}
                footer={<Button onClick={() => setExpanded((value) => !value)}>Toggle size</Button>}
            >
                <Input label="Draft" defaultValue="Retained" />
            </Dialog>
        );
    }

    await withMounted(<Editor />, async (output) => {
        const trigger = output.querySelector('button');

        if (!trigger) throw new Error('Expected the editor trigger');
        await act(async () => user.click(trigger));
        const modal = document.querySelector<HTMLElement>('[role="dialog"]');
        const input = modal?.querySelector('input');
        const toggle = modal?.querySelector('[data-slot="dialog-footer"] button');

        if (!modal || !input || !toggle) throw new Error('Expected the draft editor');
        await act(async () => user.type(input, ' draft'));
        expect(modal.style.width).toBe('640px');
        expect(modal.style.height).toBe('auto');

        // Act
        await act(async () => user.click(toggle));

        // Assert
        expect(document.querySelector('[role="dialog"]')).toBe(modal);
        expect(modal.style.width).toBe('720px');
        expect(modal.style.height).toBe('400px');
        expect(modal.querySelector('input')).toBe(input);
        expect(input.value).toBe('Retained draft');

        // Act
        await act(async () => user.click(toggle));

        // Assert
        expect(modal.style.width).toBe('640px');
        expect(modal.style.height).toBe('auto');
        expect(input.value).toBe('Retained draft');
        await act(async () => user.keyboard('{Escape}'));
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        expect(document.activeElement).toBe(trigger);
    });
});

it('retains an uncontrolled draft and host activity when the caller cancels Escape', async () => {
    const activity = vi.fn();

    await withMounted(
        <DialogActivityContext value={activity}>
            <Dialog
                title="Order details"
                trigger={<Button>Edit</Button>}
                onOpenChange={(_open, details) => {
                    if (details.reason === 'escape-key') details.cancel();
                }}
            >
                <Input name="draft" label="Draft" defaultValue="Initial" />
            </Dialog>
        </DialogActivityContext>,
        async (output) => {
            const trigger = output.querySelector('button');

            if (!trigger) throw new Error('Expected uncontrolled trigger');
            const user = userEvent.setup();
            await act(async () => user.click(trigger));
            const input = document.querySelector<HTMLInputElement>('input[name="draft"]');

            if (!input) throw new Error('Expected draft input');
            await act(async () => user.type(input, ' edit'));
            await act(async () => user.keyboard('{Escape}'));
            expect(document.querySelector('input[name="draft"]')).toBe(input);
            expect(input.value).toBe('Initial edit');
            expect(activity.mock.calls).toEqual([[true]]);
            const close = document.querySelector('[data-slot="dialog-close"]');

            if (!close) throw new Error('Expected explicit close');
            await act(async () => user.click(close));
            expect(document.querySelector('[role="dialog"]')).toBeNull();
            expect(activity).toHaveBeenLastCalledWith(false);
            expect(document.activeElement).toBe(trigger);
            await act(async () => user.click(trigger));
            const backdrop = document.querySelector('[data-slot="dialog-overlay"]');

            if (!backdrop) throw new Error('Expected the reopened backdrop');
            await act(async () => user.click(backdrop));
            expect(document.querySelector('[role="dialog"]')).toBeNull();
            expect(activity).toHaveBeenLastCalledWith(false);
        }
    );
});

it('reports actual controlled visibility when the caller ignores open and close requests', async () => {
    // Arrange
    const activity = vi.fn();
    const changes = vi.fn();
    const user = userEvent.setup();

    function Editor() {
        const [open, setOpen] = useState(false);

        return (
            <DialogActivityContext value={activity}>
                <Button onClick={() => setOpen(true)}>Show editor</Button>
                <Dialog
                    title="Edit draft"
                    open={open}
                    onOpenChange={changes}
                    trigger={<Button>Edit</Button>}
                    footer={<Button onClick={() => setOpen(false)}>Finish</Button>}
                >
                    <Input name="draft" label="Draft" defaultValue="Initial" />
                </Dialog>
            </DialogActivityContext>
        );
    }

    await withMounted(<Editor />, async (output) => {
        const trigger = output.querySelector('[data-slot="dialog-trigger"]');
        const show = output.querySelector('button');

        if (!trigger || !show) throw new Error('Expected editor actions');

        // Act
        await act(async () => user.click(trigger));

        // Assert
        expect(changes).toHaveBeenLastCalledWith(true, expect.anything());
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        expect(activity).not.toHaveBeenCalled();

        // Act
        await act(async () => user.click(show));
        const modal = document.querySelector('[role="dialog"]');
        const input = modal?.querySelector('input');

        if (!modal || !input) throw new Error('Expected the controlled editor');
        await act(async () => user.type(input, ' edit'));
        await act(async () => user.keyboard('{Escape}'));

        // Assert
        expect(changes).toHaveBeenLastCalledWith(false, expect.anything());
        expect(document.querySelector('[role="dialog"]')).toBe(modal);
        expect(input.value).toBe('Initial edit');
        expect(activity.mock.calls).toEqual([[true]]);
        const finish = modal.querySelector('[data-slot="dialog-footer"] button');

        if (!finish) throw new Error('Expected completion action');

        // Act
        await act(async () => user.click(finish));

        // Assert
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        expect(activity.mock.calls).toEqual([[true], [false]]);
    });
});
