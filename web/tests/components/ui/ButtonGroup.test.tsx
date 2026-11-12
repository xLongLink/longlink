// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { Button } from '@/components/ui/Button';
import { renderStatic, withMounted } from '../../render';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import { SizeProvider } from '@astryxdesign/core/SizeContext';
import { Button as AstryxButton } from '@astryxdesign/core/Button';
import { Dialog as AstryxDialog } from '@astryxdesign/core/Dialog';
import { DropdownMenu as AstryxDropdownMenu } from '@astryxdesign/core/DropdownMenu';

it('names the group while retaining its actions', () => {
    // Act
    const output = renderStatic(
        <ButtonGroup label="Order actions">
            <Button label="Save" />
        </ButtonGroup>
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
            <ButtonGroup label="Actions" orientation={orientation}>
                <Button label="Save" />
                <Button label="Unavailable" disabled />
                <Button label="Docs" href="https://example.com/docs" />
                <Button label="Publish" />
            </ButtonGroup>,
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
    // Existing size containers remain compatible without a ButtonGroup context from Astryx.
    const output = renderStatic(
        <SizeProvider value="lg">
            <ButtonGroup label="Inherited">
                <Button label="Large" />
                <Button label="Small" size="sm" />
            </ButtonGroup>
            <ButtonGroup label="Override" size="md">
                <Button label="Medium" />
            </ButtonGroup>
        </SizeProvider>
    );

    expect(Array.from(output.querySelectorAll('button'), (button) => button.dataset.size)).toEqual(['lg', 'sm', 'md']);
});

it('repairs its tab stop when an action disappears and keeps disabled groups reachable', async () => {
    // Removing the focused member must not strand the remaining actions outside the Tab order.
    function Actions() {
        const [visible, setVisible] = useState(true);

        return (
            <>
                <button onClick={() => setVisible(false)}>Remove</button>
                <ButtonGroup label="Actions">
                    {visible && <Button label="First" />}
                    <Button label="Second" />
                </ButtonGroup>
                <ButtonGroup label="Disabled" isDisabled>
                    <Button label="Disabled first" />
                    <Button label="Disabled second" />
                </ButtonGroup>
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

it('roves mixed native actions, Astryx actions and menu triggers without opening the menu', async () => {
    // Existing menu and action descendants must remain reachable during the incremental migration.
    const open = vi.fn();
    await withMounted(
        <ButtonGroup label="Mixed" size="lg">
            <Button label="Native" />
            <AstryxButton label="Legacy" />
            <AstryxDropdownMenu button={{ label: 'More' }} items={[]} onOpenChange={open} />
        </ButtonGroup>,
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

it('disables both native and legacy actions without leaking group membership into a dialog', async () => {
    // A disabled group cannot block a dialog's independent recovery action or run its own actions.
    const blocked = vi.fn();
    const recover = vi.fn();
    await withMounted(
        <ButtonGroup label="Disabled" isDisabled>
            <Button label="Native" onClick={blocked} />
            <AstryxButton label="Legacy" onClick={blocked} />
            <AstryxDropdownMenu button={{ label: 'More' }} items={[]} />
            <AstryxDialog isOpen aria-label="Recovery" onOpenChange={() => {}}>
                <Button label="Recover" onClick={recover} />
            </AstryxDialog>
        </ButtonGroup>,
        async (output) => {
            const actions = Array.from(output.querySelectorAll<HTMLButtonElement>('[role="group"] > button'));
            expect(actions).toHaveLength(3);
            expect(actions.map((button) => button.getAttribute('aria-disabled'))).toEqual(['true', 'true', 'true']);
            await act(async () => {
                for (const button of actions) button.click();
            });
            expect(blocked).not.toHaveBeenCalled();
            expect(actions[2]?.getAttribute('aria-expanded')).toBe('false');
            const recovery = document.querySelector<HTMLButtonElement>('dialog button');

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
        <ButtonGroup label="Outer">
            <Button label="Outer first" />
            <ButtonGroup label="Inner">
                <Button label="Inner first" />
                <Button label="Inner last" />
            </ButtonGroup>
            <section role="menu">
                <button>Menu first</button>
                <button>Menu last</button>
            </section>
            <Button label="Outer last" />
        </ButtonGroup>,
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
        const legacy = vi.fn();
        const disabled = vi.fn();
        const matchMedia = window.matchMedia.bind(window);

        const media = vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
            const list = matchMedia(query);

            if (query === '(pointer: coarse)') Object.defineProperty(list, 'matches', { value: true });

            return list;
        });

        try {
            await withMounted(
                <ButtonGroup label="Touch actions">
                    <Button label="Native" onClick={first} />
                    <AstryxButton label="Legacy" onClick={legacy} />
                    <Button label="Unavailable" disabled onClick={disabled} />
                </ButtonGroup>,
                async (output) => {
                    const group = output.querySelector<HTMLElement>('[role="group"]');
                    const controls = Array.from(output.querySelectorAll('button'));
                    const initial = controls[0];

                    if (!group || !initial) throw new Error('Expected touch actions');

                    const rectangles = [
                        vi.spyOn(group, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 120, 32)),
                    ];

                    for (const [index, control] of controls.entries()) {
                        rectangles.push(
                            vi
                                .spyOn(control, 'getBoundingClientRect')
                                .mockReturnValue(new DOMRect(index * 40, 0, 40, 32))
                        );
                    }

                    /** Delivers a real pointer event through the mounted gesture host. */
                    async function point(
                        type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
                        x: number
                    ) {
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
                                    cancelable: true,
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
                                            cancelable: true,
                                        }
                                    )
                                )
                            );
                        }
                    }

                    try {
                        expect(
                            controls.slice(0, 2).map((control) => control.getAttribute('data-astryx-press-group-item'))
                        ).toEqual(['touch pen', 'touch pen']);
                        await point('pointerdown', 20);
                        expect(initial.getAttribute('data-astryx-press')).toBe('on');
                        await point('pointermove', 60);
                        expect(controls[1]?.getAttribute('data-astryx-press')).toBe('on');
                        await point('pointerup', 60);
                        await act(async () =>
                            initial.dispatchEvent(
                                new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })
                            )
                        );
                        expect(first).not.toHaveBeenCalled();
                        expect(legacy).toHaveBeenCalledTimes(1);
                        await point('pointerdown', 20);
                        await point('pointermove', 100);
                        await point('pointerup', 100);
                        expect(first).not.toHaveBeenCalled();
                        expect(disabled).not.toHaveBeenCalled();
                        expect(legacy).toHaveBeenCalledTimes(1);
                        await point('pointerdown', 20);
                        await point('pointercancel', 20);
                        expect(initial.getAttribute('data-astryx-press')).not.toBe('on');
                        expect(first).not.toHaveBeenCalled();
                        expect(legacy).toHaveBeenCalledTimes(1);
                    } finally {
                        for (const rectangle of rectangles) rectangle.mockRestore();
                    }
                }
            );
        } finally {
            media.mockRestore();
        }
    }
);
