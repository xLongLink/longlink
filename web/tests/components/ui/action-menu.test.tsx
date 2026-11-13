// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { Button } from '@/components/shadcn/button';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { ActionMenu } from '@/components/custom/action-menu';
import { LinkNavigationContext } from '@/components/custom/contexts';

it('retains an authored trigger without prematurely opening the popup', () => {
    // Act
    const output = renderStatic(<ActionMenu trigger={<Button variant="outline">Order actions</Button>} items={[]} />);

    // Assert
    expect(output.querySelector('button')?.textContent).toContain('Order actions');
    expect(output.querySelector('[role="menu"]')).toBeNull();
});

it('skips disabled actions, opens nested actions by keyboard, and restores trigger focus on Escape', async () => {
    const action = vi.fn();
    const user = userEvent.setup();

    await withMounted(
        <ActionMenu
            trigger={<Button variant="outline">Order actions</Button>}
            items={[
                { label: 'Unavailable', disabled: true, onClick: action },
                {
                    type: 'section',
                    title: 'Manage',
                    items: [{ label: 'Delivery', items: [{ label: 'Dispatch', onClick: action }] }]
                },
                { type: 'divider' },
                { label: 'Delete', variant: 'destructive', onClick: action }
            ]}
        />,
        async (output) => {
            const trigger = output.querySelector('button');

            if (!trigger) throw new Error('Expected trigger');

            await act(async () => {
                trigger.focus();
                await user.keyboard('{ArrowDown}');
            });
            expect(document.activeElement?.textContent).toBe('Delivery');
            expect(document.querySelector('[role="separator"]')).not.toBeNull();

            await act(async () => await user.keyboard('{ArrowRight}'));
            expect(document.activeElement?.textContent).toBe('Dispatch');
            await act(async () => await user.keyboard('{Enter}'));
            expect(action).toHaveBeenCalledTimes(1);
            expect(document.querySelector('[role="menu"]')).toBeNull();

            await act(async () => {
                trigger.focus();
                await user.keyboard('{ArrowDown}{Escape}');
            });
            expect(document.querySelector('[role="menu"]')).toBeNull();
            expect(document.activeElement).toBe(trigger);
        }
    );
});

it('locks a stay-open asynchronous action against repeated clicks and recovers after completion', async () => {
    let release = () => {};

    const pending = new Promise<void>((resolve) => {
        release = resolve;
    });

    const action = vi.fn(() => pending);

    try {
        await withMounted(
            <ActionMenu items={[{ label: 'Copy', closeOnClick: false, onClick: action }]} />,
            async (output) => {
                await act(async () => output.querySelector('button')?.click());
                const item = document.querySelector<HTMLElement>('[role="menuitem"]');

                if (!item) throw new Error('Expected Copy action');

                await act(async () => {
                    item.click();
                    item.click();
                });
                expect(action).toHaveBeenCalledTimes(1);
                expect(item.getAttribute('aria-busy')).toBe('true');
                expect(document.querySelector('[role="menu"]')).not.toBeNull();
                await act(async () => {
                    release();
                    await pending;
                });
                expect(item.hasAttribute('aria-busy')).toBe(false);
                await act(async () => item.click());
                expect(action).toHaveBeenCalledTimes(2);
            }
        );
    } finally {
        release();
    }
});

it('delegates ordinary link selection while preserving modified clicks and disabled destinations', async () => {
    const navigate = vi.fn();
    const action = vi.fn();

    await withMounted(
        <LinkNavigationContext value={{ baseUrl: '/orders', navigate }}>
            <ActionMenu
                items={[
                    { label: 'Open order', href: '/order/12', onClick: action, closeOnClick: false },
                    { label: 'Blocked order', href: '/order/13', disabled: true, onClick: action },
                    { label: 'Related order', href: '/order/14', onClick: action }
                ]}
            />
        </LinkNavigationContext>,
        async (output) => {
            await act(async () => output.querySelector('button')?.click());
            const items = document.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]');
            expect(items[1]?.hasAttribute('href')).toBe(false);
            await act(async () => items[1]?.click());
            expect(action).not.toHaveBeenCalled();
            expect(navigate).not.toHaveBeenCalled();

            await act(async () =>
                items[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }))
            );
            expect(action).not.toHaveBeenCalled();
            expect(navigate).not.toHaveBeenCalled();
            expect(items[0]?.getAttribute('href')).toBe('/order/12');

            await act(async () => items[0]?.click());
            expect(action).toHaveBeenCalledTimes(1);
            expect(navigate).toHaveBeenCalledExactlyOnceWith('/order/12', false);

            await act(async () =>
                items[2]?.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }))
            );
            expect(document.querySelector('[role="menu"]')).toBeNull();
            expect(action).toHaveBeenCalledTimes(1);
            expect(navigate).toHaveBeenCalledTimes(1);
        }
    );
});

it('keeps controlled state authoritative and reports dismissal requests', async () => {
    const requests = vi.fn();
    const user = userEvent.setup();

    await withMounted(<ActionMenu open items={[{ label: 'Copy' }]} onOpenChange={requests} />, async () => {
        await act(async () => await user.keyboard('{Escape}'));
        expect(requests).toHaveBeenCalledWith(false);
        expect(document.querySelector('[role="menu"]')).not.toBeNull();
    });
});

it('opens on a finger press without a second compatibility click toggling it shut', async () => {
    const requests = vi.fn();

    await withMounted(<ActionMenu items={[{ label: 'Copy' }]} onOpenChange={requests} />, async (output) => {
        const trigger = output.querySelector('button');

        if (!trigger) throw new Error('Expected trigger');

        await act(async () =>
            trigger.dispatchEvent(
                new PointerEvent('pointerdown', {
                    bubbles: true,
                    cancelable: true,
                    pointerType: 'touch',
                    pointerId: 1,
                    button: 0
                })
            )
        );
        expect(document.querySelector('[role="menu"]')).not.toBeNull();
        await act(async () => {
            document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
            trigger.click();
        });
        expect(document.querySelector('[role="menu"]')).not.toBeNull();
        expect(requests).toHaveBeenCalledExactlyOnceWith(true);
    });
});

it.each([
    { releaseX: 50, releaseType: 'pointerup', expectedCalls: 1 },
    { releaseX: 150, releaseType: 'pointerup', expectedCalls: 0 },
    { releaseX: 250, releaseType: 'pointerup', expectedCalls: 0 },
    { releaseX: 50, releaseType: 'pointercancel', expectedCalls: 0 }
])(
    'restricts touch selection to its own menu at release ($releaseType at $releaseX)',
    async ({ releaseX, releaseType, expectedCalls }) => {
        const ownAction = vi.fn();
        const otherAction = vi.fn();

        await withMounted(
            <>
                <ActionMenu
                    trigger={<Button>Own actions</Button>}
                    items={[{ label: 'Own item', onClick: ownAction }]}
                />
                <ActionMenu
                    trigger={<Button>Other actions</Button>}
                    open
                    items={[{ label: 'Other item', onClick: otherAction }]}
                />
            </>,
            async (output) => {
                const trigger = output.querySelector('button');

                if (!trigger) throw new Error('Expected own trigger');

                await act(async () =>
                    trigger.dispatchEvent(
                        new PointerEvent('pointerdown', {
                            bubbles: true,
                            cancelable: true,
                            pointerType: 'touch',
                            pointerId: 7,
                            button: 0,
                            clientX: 0,
                            clientY: 20
                        })
                    )
                );

                const items = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
                const ownItem = items.find((item) => item.textContent === 'Own item');
                const otherItem = items.find((item) => item.textContent === 'Other item');

                if (!ownItem || !otherItem) throw new Error('Expected both real menus to be open');

                // Happy-dom has no layout; only the geometry boundary is supplied, not menu behavior.
                const hitTest = vi.spyOn(document, 'elementFromPoint').mockImplementation((x) => {
                    if (x < 100) return ownItem;

                    if (x < 200) return otherItem;

                    return document.body;
                });

                try {
                    const unrelatedMove = new PointerEvent('pointermove', {
                        bubbles: true,
                        cancelable: true,
                        pointerId: 8,
                        clientX: 50,
                        clientY: 20
                    });

                    await act(async () => document.dispatchEvent(unrelatedMove));
                    expect(unrelatedMove.defaultPrevented).toBe(false);

                    await act(async () =>
                        document.dispatchEvent(
                            new PointerEvent('pointermove', {
                                bubbles: true,
                                cancelable: true,
                                pointerId: 7,
                                clientX: 50,
                                clientY: 20
                            })
                        )
                    );
                    expect(document.activeElement).toBe(ownItem);

                    await act(async () =>
                        document.dispatchEvent(
                            new PointerEvent('pointermove', {
                                bubbles: true,
                                cancelable: true,
                                pointerId: 7,
                                clientX: 150,
                                clientY: 20
                            })
                        )
                    );
                    expect(document.activeElement).toBe(ownItem);

                    await act(async () =>
                        document.dispatchEvent(
                            new PointerEvent('pointermove', {
                                bubbles: true,
                                cancelable: true,
                                pointerId: 7,
                                clientX: 50,
                                clientY: 20
                            })
                        )
                    );

                    // Release may jump away without an intervening pointermove; stale focus must not act.
                    await act(async () => {
                        document.dispatchEvent(
                            new PointerEvent(releaseType, {
                                bubbles: true,
                                pointerId: 7,
                                clientX: releaseX,
                                clientY: 20
                            })
                        );
                        document.dispatchEvent(
                            new PointerEvent('pointerup', { bubbles: true, pointerId: 7, clientX: 50, clientY: 20 })
                        );
                    });
                    expect(ownAction).toHaveBeenCalledTimes(expectedCalls);
                    expect(otherAction).not.toHaveBeenCalled();
                } finally {
                    hitTest.mockRestore();
                }
            }
        );
    }
);
