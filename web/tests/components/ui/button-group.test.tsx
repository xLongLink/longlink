// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { Icon } from '@/components/custom/icon';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { ActionMenu } from '@/components/custom/action-menu';
import { ViewDialog } from '@/components/custom/view-dialog';
import { ActionButton } from '@/components/custom/action-button';
import { ControlSizeContext } from '@/components/custom/contexts';
import { ActionButtonGroup } from '@/components/custom/action-button-group';

it('names the group while retaining its actions', () => {
    // Act
    const output = renderStatic(
        <ActionButtonGroup label="Order actions">
            <ActionButton variant="outline">Save</ActionButton>
        </ActionButtonGroup>
    );

    // Assert
    expect(output.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Order actions');
    expect(output.textContent).toContain('Save');
});

it.each(['horizontal', 'vertical'] as const)(
    'roves %s actions, skips disabled controls and wraps',
    async (orientation) => {
        // Keyboard users enter once, then reach links and enabled actions without activating them.
        await withMounted(
            <ActionButtonGroup label="Actions" orientation={orientation}>
                <ActionButton variant="outline">Save</ActionButton>
                <ActionButton variant="outline" disabled>
                    Unavailable
                </ActionButton>
                <ActionButton variant="outline" href="https://example.com/docs">
                    Docs
                </ActionButton>
                <ActionButton variant="outline">Publish</ActionButton>
            </ActionButtonGroup>,
            async (output) => {
                const controls = Array.from(output.querySelectorAll<HTMLElement>('button, a'));
                const first = controls[0];

                if (!first) throw new Error('Expected group actions');
                expect(controls.map((control) => control.tabIndex)).toEqual([0, -1, -1, -1]);
                await act(async () => first.focus());
                const forward = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';

                const press = async (key: string) => {
                    await act(async () =>
                        document.activeElement?.dispatchEvent(
                            new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
                        )
                    );
                };

                await press(forward);
                expect(document.activeElement).toBe(controls[2]);
                await press('End');
                expect(document.activeElement).toBe(controls[3]);
                await press(forward);
                expect(document.activeElement).toBe(first);
                await press('End');
                await press('Home');
                expect(document.activeElement).toBe(first);
                expect(controls.map((control) => control.tabIndex)).toEqual([0, -1, -1, -1]);
            }
        );
    }
);

it('inherits generic size while allowing action and group overrides', () => {
    // Shared controls inherit their group size without a third-party sizing provider.
    const output = renderStatic(
        <ControlSizeContext value="lg">
            <ActionButtonGroup label="Inherited">
                <ActionButton variant="outline">Large</ActionButton>
                <ActionButton variant="outline" size="sm">
                    Small
                </ActionButton>
            </ActionButtonGroup>
            <ActionButtonGroup label="Override" size="default">
                <ActionButton variant="outline">Medium</ActionButton>
            </ActionButtonGroup>
        </ControlSizeContext>
    );

    expect(Array.from(output.querySelectorAll('button'), (button) => button.dataset.size)).toEqual([
        'lg',
        'sm',
        'default'
    ]);
});

it('repairs its tab stop when an action disappears and keeps disabled groups reachable', async () => {
    // Removing the focused member must not strand the remaining actions outside the Tab order.
    function Actions() {
        const [visible, setVisible] = useState(true);

        return (
            <>
                <button onClick={() => setVisible(false)}>Remove</button>
                <ActionButtonGroup label="Actions">
                    {visible && <ActionButton variant="outline">First</ActionButton>}
                    <ActionButton variant="outline">Second</ActionButton>
                </ActionButtonGroup>
                <ActionButtonGroup label="Disabled" isDisabled>
                    <ActionButton variant="outline">Disabled first</ActionButton>
                    <ActionButton variant="outline">Disabled second</ActionButton>
                </ActionButtonGroup>
            </>
        );
    }

    await withMounted(<Actions />, async (output) => {
        await act(async () => output.querySelector('button')?.click());
        const groups = output.querySelectorAll('[role="group"]');
        expect(groups[0]?.querySelector('button')?.tabIndex).toBe(0);
        expect(Array.from(groups[1]?.querySelectorAll('button') ?? [], (button) => button.tabIndex)).toEqual([0, -1]);
    });
});

it('roves text actions, icon actions and menu triggers without opening the menu', async () => {
    // Existing menu and action descendants must remain reachable during the incremental migration.
    const open = vi.fn();
    await withMounted(
        <ActionButtonGroup label="Mixed" size="lg">
            <ActionButton variant="outline">Native</ActionButton>
            <ActionButton size="icon-lg" aria-label="Copy">
                <Icon icon="copy" size="lg" />
            </ActionButton>
            <ActionMenu button={{ label: 'More' }} items={[]} onOpenChange={open} />
        </ActionButtonGroup>,
        async (output) => {
            const controls = Array.from(output.querySelectorAll('button'));
            expect(controls.map((control) => control.tabIndex)).toEqual([0, -1, -1]);
            await act(async () => controls[0]?.focus());
            await act(async () =>
                document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
            );
            expect(document.activeElement).toBe(controls[2]);
            expect(open).not.toHaveBeenCalled();
            expect(controls[2]?.getAttribute('aria-expanded')).toBe('false');
        }
    );
});

it('disables all grouped actions without leaking group membership into a dialog', async () => {
    // A disabled group cannot block a dialog's independent recovery action or run its own actions.
    const blocked = vi.fn();
    const recover = vi.fn();
    await withMounted(
        <ActionButtonGroup label="Disabled" isDisabled>
            <ActionButton variant="outline" onClick={blocked}>
                Native
            </ActionButton>
            <ActionButton size="icon" aria-label="Copy" onClick={blocked}>
                <Icon icon="copy" size="md" />
            </ActionButton>
            <ActionMenu button={{ label: 'More' }} items={[]} />
            <ViewDialog isOpen title="Recovery" onOpenChange={() => {}}>
                <ActionButton variant="outline" onClick={recover}>
                    Recover
                </ActionButton>
            </ViewDialog>
        </ActionButtonGroup>,
        async (output) => {
            const actions = Array.from(output.querySelectorAll<HTMLButtonElement>('[role="group"] > button'));
            expect(actions).toHaveLength(3);
            expect(actions.map((button) => button.getAttribute('aria-disabled'))).toEqual(['true', 'true', 'true']);
            await act(async () => {
                for (const button of actions) button.click();
            });
            expect(blocked).not.toHaveBeenCalled();
            expect(actions[2]?.getAttribute('aria-expanded')).toBe('false');

            const recovery = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find(
                (button) => button.textContent?.includes('Recover')
            );

            if (!recovery) throw new Error('Expected dialog recovery action');
            expect(recovery.getAttribute('aria-disabled')).not.toBe('true');
            expect(recovery.hasAttribute('data-group-orientation')).toBe(false);
            expect(recovery.tabIndex).toBe(0);
            await act(async () => recovery.click());
            expect(recover).toHaveBeenCalledExactlyOnceWith(expect.anything());
        }
    );
});

it('keeps nested groups and menu layers outside its roving order', async () => {
    // An arrow within an independent surface must never move focus to an outer action.
    await withMounted(
        <ActionButtonGroup label="Outer">
            <ActionButton variant="outline">Outer first</ActionButton>
            <ActionButtonGroup label="Inner">
                <ActionButton variant="outline">Inner first</ActionButton>
                <ActionButton variant="outline">Inner last</ActionButton>
            </ActionButtonGroup>
            <section role="menu">
                <button>Menu first</button>
                <button>Menu last</button>
            </section>
            <ActionButton variant="outline">Outer last</ActionButton>
        </ActionButtonGroup>,
        async (output) => {
            const controls = Array.from(output.querySelectorAll('button'));
            expect(controls.map((button) => button.tabIndex)).toEqual([0, 0, -1, 0, 0, -1]);
            await act(async () => controls[1]?.focus());
            await act(async () =>
                document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
            );
            expect(document.activeElement).toBe(controls[2]);
            await act(async () => controls[3]?.focus());
            await act(async () =>
                document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
            );
            expect(document.activeElement).toBe(controls[3]);
        }
    );
});

it.each(['touch', 'pen'] as const)(
    'slides a held %s across mixed actions and activates only the enabled release target once',
    async (pointerType) => {
        // The real gesture arena must hand the release to the final action, not the initial native click.
        const first = vi.fn();
        const other = vi.fn();
        const disabled = vi.fn();
        await withMounted(
            <ActionButtonGroup label="Touch actions">
                <ActionButton variant="outline" onClick={first}>
                    Native
                </ActionButton>
                <ActionButton size="icon" aria-label="Copy" onClick={other}>
                    <Icon icon="copy" size="md" />
                </ActionButton>
                <ActionButton variant="outline" disabled onClick={disabled}>
                    Unavailable
                </ActionButton>
            </ActionButtonGroup>,
            async (output) => {
                const group = output.querySelector<HTMLElement>('[role="group"]');
                const controls = Array.from(output.querySelectorAll('button'));
                const initial = controls[0];

                if (!group || !initial) throw new Error('Expected touch actions');

                const rectangles = [
                    vi.spyOn(group, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 120, 32))
                ];

                for (const [index, control] of controls.entries()) {
                    rectangles.push(
                        vi.spyOn(control, 'getBoundingClientRect').mockReturnValue(new DOMRect(index * 40, 0, 40, 32))
                    );
                }

                /** Delivers a real pointer event through the mounted gesture host. */
                async function point(type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel', x: number) {
                    await act(async () =>
                        initial.dispatchEvent(
                            new PointerEvent(type, {
                                pointerId: 1,
                                pointerType,
                                isPrimary: true,
                                button: 0,
                                buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
                                clientX: x,
                                clientY: 16,
                                bubbles: true,
                                cancelable: true
                            })
                        )
                    );

                    if (pointerType === 'touch' && type !== 'pointermove') {
                        const touch = new Touch({ identifier: 1, target: initial, clientX: x, clientY: 16 });
                        await act(async () =>
                            initial.dispatchEvent(
                                new TouchEvent(
                                    type === 'pointerdown'
                                        ? 'touchstart'
                                        : type === 'pointerup'
                                          ? 'touchend'
                                          : 'touchcancel',
                                    {
                                        touches: type === 'pointerdown' ? [touch] : [],
                                        changedTouches: [touch],
                                        bubbles: true,
                                        cancelable: true
                                    }
                                )
                            )
                        );
                    }
                }

                try {
                    await point('pointerdown', 20);
                    expect(initial.hasAttribute('data-group-pressed')).toBe(true);
                    await point('pointermove', 60);
                    expect(controls[1]?.hasAttribute('data-group-pressed')).toBe(true);
                    await point('pointerup', 60);
                    await act(async () =>
                        initial.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }))
                    );
                    expect(first).not.toHaveBeenCalled();
                    expect(other).toHaveBeenCalledTimes(1);
                    await point('pointerdown', 20);
                    await point('pointermove', 100);
                    await point('pointerup', 100);
                    expect(first).not.toHaveBeenCalled();
                    expect(disabled).not.toHaveBeenCalled();
                    expect(other).toHaveBeenCalledTimes(1);
                    await point('pointerdown', 20);
                    await point('pointercancel', 20);
                    expect(initial.hasAttribute('data-group-pressed')).toBe(false);
                    expect(first).not.toHaveBeenCalled();
                    expect(other).toHaveBeenCalledTimes(1);
                } finally {
                    for (const rectangle of rectangles) rectangle.mockRestore();
                }
            }
        );
    }
);

it('cancels scroll flicks and second fingers without swallowing a later keyboard activation', async () => {
    const action = vi.fn();
    const user = userEvent.setup();

    await withMounted(
        <section style={{ overflowY: 'auto' }}>
            <ActionButtonGroup label="Scrollable actions">
                <ActionButton variant="outline" onClick={action}>
                    Save
                </ActionButton>
            </ActionButtonGroup>
        </section>,
        async (output) => {
            const scroller = output.querySelector('section');
            const control = output.querySelector('button');

            if (!scroller || !control) throw new Error('Expected scrollable actions');
            const button = control;
            Object.defineProperties(scroller, { scrollHeight: { value: 1000 }, clientHeight: { value: 100 } });
            const rectangle = vi.spyOn(control, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 40, 32));

            async function point(type: string, y = 16, pointerId = 1) {
                await act(async () =>
                    button.dispatchEvent(
                        new PointerEvent(type, {
                            pointerType: 'touch',
                            pointerId,
                            isPrimary: pointerId === 1,
                            button: 0,
                            clientX: 20,
                            clientY: y,
                            bubbles: true,
                            cancelable: true
                        })
                    )
                );
            }

            async function compatibilityClick() {
                await act(async () =>
                    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }))
                );
            }

            try {
                await point('pointerdown');
                expect(control.hasAttribute('data-group-pressed')).toBe(false);
                await point('pointermove', 40);
                await point('pointerup', 40);
                await compatibilityClick();
                expect(action).not.toHaveBeenCalled();

                await point('pointerdown');
                await act(async () => scroller.dispatchEvent(new Event('scroll', { bubbles: true })));
                await point('pointerup');
                await compatibilityClick();
                expect(action).not.toHaveBeenCalled();

                await point('pointerdown');
                await point('pointerup');
                await compatibilityClick();
                expect(action).toHaveBeenCalledTimes(1);
                await act(async () => user.keyboard('{Enter}'));
                expect(action).toHaveBeenCalledTimes(2);

                await point('pointerdown');
                await point('pointerdown', 16, 2);
                await point('pointerup');
                await point('pointerup', 16, 2);
                await compatibilityClick();
                expect(action).toHaveBeenCalledTimes(2);
            } finally {
                rectangle.mockRestore();
            }
        }
    );
});

it('cancels a pending hold when its group is disabled and permits a fresh press after re-enabling', async () => {
    const action = vi.fn();

    function Actions() {
        const [disabled, setDisabled] = useState(false);

        return (
            <section style={{ overflowY: 'auto' }}>
                <button type="button" onClick={() => setDisabled((value) => !value)}>
                    Toggle
                </button>
                <ActionButtonGroup label="Actions" isDisabled={disabled}>
                    <ActionButton variant="outline" onClick={action}>
                        Save
                    </ActionButton>
                </ActionButtonGroup>
            </section>
        );
    }

    await withMounted(<Actions />, async (output) => {
        const scroller = output.querySelector('section');
        const toggle = output.querySelector('button');
        const control = output.querySelector('[role="group"] button');

        if (!scroller || !toggle || !(control instanceof HTMLButtonElement))
            throw new Error('Expected toggle and group');
        Object.defineProperties(scroller, { scrollHeight: { value: 1000 }, clientHeight: { value: 100 } });
        const rectangle = vi.spyOn(control, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 40, 32));

        const pointer = (type: string) =>
            control.dispatchEvent(
                new PointerEvent(type, {
                    pointerType: 'touch',
                    pointerId: 1,
                    isPrimary: true,
                    button: 0,
                    clientX: 20,
                    clientY: 16,
                    bubbles: true,
                    cancelable: true
                })
            );

        try {
            await act(async () => {
                pointer('pointerdown');
                toggle.click();
            });
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 180));
                pointer('pointerup');
            });
            expect(control.hasAttribute('data-group-pressed')).toBe(false);
            expect(action).not.toHaveBeenCalled();
            await act(async () => toggle.click());
            await act(async () => {
                pointer('pointerdown');
                pointer('pointerup');
            });
            expect(action).toHaveBeenCalledTimes(1);
        } finally {
            rectangle.mockRestore();
        }
    });
});

it('lets a grouped menu own its touch press without a second group activation closing it', async () => {
    const action = vi.fn();

    await withMounted(
        <ActionButtonGroup label="Actions">
            <ActionButton variant="outline">Save</ActionButton>
            <ActionMenu button={{ label: 'More' }} items={[{ label: 'Archive', onClick: action }]} />
        </ActionButtonGroup>,
        async (output) => {
            const trigger = output.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]');

            if (!trigger) throw new Error('Expected grouped menu trigger');
            const rectangle = vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 0, 40, 32));

            try {
                await act(async () =>
                    trigger.dispatchEvent(
                        new PointerEvent('pointerdown', {
                            pointerType: 'touch',
                            pointerId: 1,
                            isPrimary: true,
                            button: 0,
                            clientX: 60,
                            clientY: 16,
                            bubbles: true,
                            cancelable: true
                        })
                    )
                );
                expect(document.querySelector('[role="menu"]')?.textContent).toContain('Archive');
                await act(async () => {
                    trigger.dispatchEvent(
                        new PointerEvent('pointerup', {
                            pointerType: 'touch',
                            pointerId: 1,
                            isPrimary: true,
                            button: 0,
                            clientX: 60,
                            clientY: 16,
                            bubbles: true,
                            cancelable: true
                        })
                    );
                    trigger.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true, cancelable: true }));
                });
                expect(document.querySelector('[role="menu"]')?.textContent).toContain('Archive');
                expect(action).not.toHaveBeenCalled();
            } finally {
                rectangle.mockRestore();
            }
        }
    );
});

it('expands touch targets without reaching through nested groups or treating a pen as a finger', async () => {
    const outer = vi.fn();
    const inner = vi.fn();

    await withMounted(
        <ActionButtonGroup label="Outer">
            <ActionButton size="icon" aria-label="Outer action" onClick={outer}>
                <Icon icon="copy" size="md" />
            </ActionButton>
            <ActionButtonGroup label="Inner">
                <ActionButton size="icon" aria-label="Inner action" onClick={inner}>
                    <Icon icon="copy" size="md" />
                </ActionButton>
            </ActionButtonGroup>
        </ActionButtonGroup>,
        async (output) => {
            const group = output.querySelector<HTMLElement>('[aria-label="Outer"]');
            const controls = output.querySelectorAll('button');

            if (!group || !controls[0] || !controls[1]) throw new Error('Expected nested actions');
            const target = group;

            const rectangles = [
                vi.spyOn(controls[0], 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 28, 28)),
                vi.spyOn(controls[1], 'getBoundingClientRect').mockReturnValue(new DOMRect(28, 0, 28, 28))
            ];

            async function point(type: string, x: number, y: number, pointerType = 'touch') {
                await act(async () =>
                    target.dispatchEvent(
                        new PointerEvent(type, {
                            pointerType,
                            pointerId: 1,
                            isPrimary: true,
                            button: 0,
                            clientX: x,
                            clientY: y,
                            bubbles: true,
                            cancelable: true
                        })
                    )
                );
            }

            try {
                await point('pointerdown', 14, 14);
                await point('pointermove', 32, 14);
                await point('pointerup', 32, 14);
                expect(outer).not.toHaveBeenCalled();
                expect(inner).not.toHaveBeenCalled();

                await point('pointerdown', 14, -6);
                await point('pointerup', 14, -6);
                expect(outer).toHaveBeenCalledTimes(1);
                await point('pointerdown', 14, -6, 'pen');
                await point('pointerup', 14, -6, 'pen');
                expect(outer).toHaveBeenCalledTimes(1);
            } finally {
                for (const rectangle of rectangles) rectangle.mockRestore();
            }
        }
    );
});
