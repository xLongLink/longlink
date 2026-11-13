// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { LinkNavigationContext } from '@/components/custom/contexts';
import { InteractiveCard } from '@/components/custom/interactive-card';

it('retains content without making a plain card an action', () => {
    // Act
    const output = renderStatic(<InteractiveCard>Order summary</InteractiveCard>);

    // Assert
    expect(output.textContent).toContain('Order summary');
    expect(output.querySelector('a, button')).toBeNull();
});

it('gives selection priority over actions and navigation and leaves nested controls independent', async () => {
    const action = vi.fn();
    const nested = vi.fn();
    const changed = vi.fn();

    // Keep the controlled state real so pointer and keyboard toggles must agree.
    function Selection() {
        const [selected, setSelected] = useState(false);

        return (
            <InteractiveCard
                label="Order"
                isSelected={selected}
                href="/orders"
                onClick={action}
                onChange={(next) => {
                    changed(next);
                    setSelected(next);
                }}
            >
                <p>Order contents</p>
                <button onClick={nested}>Remove</button>
            </InteractiveCard>
        );
    }

    await withMounted(<Selection />, async (output) => {
        const user = userEvent.setup();
        const checkbox = output.querySelector('input');
        const text = output.querySelector('p');
        const button = output.querySelector('button');

        if (!checkbox || !text || !button) throw new Error('Expected selection and nested controls');

        await act(async () => {
            await user.click(button);
        });
        expect(nested).toHaveBeenCalledOnce();
        expect(changed).not.toHaveBeenCalled();
        await act(async () => {
            await user.click(text);
        });
        expect(checkbox.checked).toBe(true);
        checkbox.focus();
        await act(async () => {
            await user.keyboard(' ');
        });
        expect(checkbox.checked).toBe(false);
        await act(async () => {
            await user.keyboard('{Enter}');
        });
        expect(checkbox.checked).toBe(true);
        expect(changed.mock.calls).toEqual([[true], [false], [true]]);
        expect(action).not.toHaveBeenCalled();
        expect(output.querySelector('a')).toBeNull();
    });
});

it('gives an action priority over href with native button keyboard activation', async () => {
    const action = vi.fn();
    await withMounted(
        <InteractiveCard label="Open order" href="/orders" onClick={action}>
            <p>Order</p>
        </InteractiveCard>,
        async (output) => {
            const user = userEvent.setup();
            const button = output.querySelector('button');
            const text = output.querySelector('p');

            if (!button || !text) throw new Error('Expected action control');

            await act(async () => {
                await user.click(text);
            });
            button.focus();
            await act(async () => {
                await user.keyboard('{Enter} ');
            });
            expect(action).toHaveBeenCalledTimes(3);
            expect(output.querySelector('a')).toBeNull();
        }
    );
});

it('keeps disabled primary controls focusable without live destinations or activation', async () => {
    const action = vi.fn();
    const changed = vi.fn();
    const nested = vi.fn();
    const navigate = vi.fn();
    await withMounted(
        <LinkNavigationContext value={{ baseUrl: 'https://example.com/app/', navigate }}>
            <InteractiveCard label="Action" isDisabled onClick={action}>
                <p>Action</p>
                <button onClick={nested}>Nested</button>
            </InteractiveCard>
            <InteractiveCard label="Selection" isDisabled onChange={changed}>
                <p>Selection</p>
            </InteractiveCard>
            <InteractiveCard label="Link" isDisabled href="/orders">
                <p>Link</p>
            </InteractiveCard>
        </LinkNavigationContext>,
        async (output) => {
            const user = userEvent.setup();
            const controls = output.querySelectorAll<HTMLElement>('.view-card-control');

            for (const control of controls) {
                control.focus();
                expect(document.activeElement).toBe(control);
                await act(async () => {
                    await user.keyboard('{Enter} ');
                    control.click();
                });
            }

            await act(async () => {
                for (const text of output.querySelectorAll('p')) text.click();
                output.querySelector<HTMLButtonElement>('button:not(.view-card-control)')?.click();
            });
            expect(output.querySelector('a')?.hasAttribute('href')).toBe(false);
            expect(action).not.toHaveBeenCalled();
            expect(changed).not.toHaveBeenCalled();
            expect(navigate).not.toHaveBeenCalled();
            expect(nested).toHaveBeenCalledOnce();
        }
    );
});

it('routes plain surface clicks through the validated primary link without stealing nested links', async () => {
    const navigate = vi.fn();
    const nested = vi.fn((event: React.MouseEvent) => event.preventDefault());
    await withMounted(
        <LinkNavigationContext value={{ baseUrl: 'https://example.com/app/', navigate }}>
            <InteractiveCard href="/orders">
                <p>Order</p>
                <a href="/other" onClick={nested}>
                    Other
                </a>
            </InteractiveCard>
        </LinkNavigationContext>,
        async (output) => {
            await act(async () => {
                output.querySelector<HTMLAnchorElement>('a:not(.view-card-control)')?.click();
            });
            expect(nested).toHaveBeenCalledOnce();
            expect(navigate).not.toHaveBeenCalled();
            await act(async () => {
                output.querySelector('p')?.click();
            });
            expect(navigate).toHaveBeenCalledExactlyOnceWith('/orders');
            expect(output.querySelector('a')?.href).toBe('https://example.com/app/orders');
        }
    );
});

it('forwards modifier and middle gestures using the resolved destination and rejects unsafe URLs', async () => {
    const navigate = vi.fn();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);

    try {
        await withMounted(
            <LinkNavigationContext value={{ baseUrl: 'https://example.com/app/', navigate }}>
                <InteractiveCard href="/orders">
                    <p>Order</p>
                </InteractiveCard>
                <InteractiveCard href="javascript:alert(1)">
                    <p>Unsafe</p>
                </InteractiveCard>
            </LinkNavigationContext>,
            async (output) => {
                const cards = output.querySelectorAll<HTMLElement>('.view-card');
                const anchor = cards[0]?.querySelector('a');

                if (!anchor) throw new Error('Expected primary link');
                const gestures: boolean[] = [];
                anchor.addEventListener('click', (event) => {
                    gestures.push(event.ctrlKey);
                    event.preventDefault();
                });
                await act(async () => {
                    cards[0]?.dispatchEvent(
                        new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true })
                    );
                    cards[0]?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 1 }));
                    cards[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                    cards[1]?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 1 }));
                });
                expect(gestures).toEqual([true]);
                expect(open).toHaveBeenCalledExactlyOnceWith(
                    'https://example.com/app/orders',
                    '_blank',
                    'noopener,noreferrer'
                );
                expect(navigate).not.toHaveBeenCalled();
                expect(cards[1]?.querySelector('a')?.hasAttribute('href')).toBe(false);
            }
        );
    } finally {
        open.mockRestore();
    }
});

it('does not activate on text selection or inert surfaces and keeps decorative accessibility attributes', async () => {
    const action = vi.fn();
    await withMounted(
        <>
            <InteractiveCard onClick={action}>
                <p>Select this text</p>
            </InteractiveCard>
            <InteractiveCard inert aria-hidden="true" onClick={action}>
                <p>Inert</p>
            </InteractiveCard>
        </>,
        async (output) => {
            const text = output.querySelector('p');

            if (!text) throw new Error('Expected selectable content');
            const selection = document.getSelection();
            selection?.removeAllRanges();
            const range = document.createRange();
            range.selectNodeContents(text);
            selection?.addRange(range);

            try {
                await act(async () => {
                    text.click();
                });
                expect(action).not.toHaveBeenCalled();
            } finally {
                selection?.removeAllRanges();
            }

            await act(async () => {
                output.querySelector<HTMLElement>('[inert] p')?.click();
            });
            expect(action).not.toHaveBeenCalled();
            expect(output.querySelector('[inert]')?.getAttribute('aria-hidden')).toBe('true');
            await act(async () => {
                text.click();
            });
            expect(action).toHaveBeenCalledOnce();
        }
    );
});
