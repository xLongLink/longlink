// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { Card } from '@/components/longlink/layout/card';
import { LinkNavigationContext } from '@/views/contexts';

it('owns section layout and ignores injected styling', () => {
    const overrides = { className: 'hidden', style: { display: 'none' } };
    const output = renderStatic(
        <Card
            {...overrides}
            aria-labelledby="order-title"
            title={<h3 id="order-title">Order</h3>}
            description="Ready to ship"
            action={<button type="button">Details</button>}
            footer={<button type="button">Edit</button>}
        >
            Order contents
        </Card>
    );

    for (const part of output.querySelectorAll('[data-slot]')) {
        expect(part.classList.contains('hidden')).toBe(false);
        expect(part.hasAttribute('style')).toBe(false);
    }
    expect(output.querySelector('[aria-labelledby="order-title"]')).not.toBeNull();
    expect(output.querySelector('#order-title')?.textContent).toBe('Order');
    expect(output.querySelector('[data-slot="card-header"] h3')).not.toBeNull();
    expect(output.querySelector('[data-slot="card-description"]')?.textContent).toBe('Ready to ship');
    expect(output.querySelector('[data-slot="card-action"] button')?.textContent).toBe('Details');
    expect(output.querySelector('[data-slot="card-content"]')?.textContent).toBe('Order contents');
    expect(output.querySelector('[data-slot="card-footer"] button')?.textContent).toBe('Edit');
});

it.each([true, false])(
    'keeps header and footer actions independent of surface activation (titled: %s)',
    async (titled) => {
        const action = vi.fn();
        const edit = vi.fn();
        const user = userEvent.setup();

        await withMounted(
            <Card
                label="Open order"
                onClick={action}
                title={titled ? 'Order' : undefined}
                description={titled ? 'Ready to ship' : undefined}
                action={
                    <button type="button" onClick={edit}>
                        Details
                    </button>
                }
                footer={
                    <button type="button" onClick={edit}>
                        Edit
                    </button>
                }
            >
                Order contents
            </Card>,
            async (output) => {
                const body = output.querySelector<HTMLElement>('[data-slot="card-content"]');
                const footerAction = output.querySelector<HTMLButtonElement>('[data-slot="card-footer"] button');
                const headerAction = output.querySelector<HTMLButtonElement>('[data-slot="card-action"] button');

                if (!body || !footerAction || !headerAction) throw new Error('Missing card controls');
                await act(async () => user.click(headerAction));
                expect(edit).toHaveBeenCalledOnce();
                expect(action).not.toHaveBeenCalled();
                await act(async () => user.click(footerAction));
                expect(edit).toHaveBeenCalledTimes(2);
                expect(action).not.toHaveBeenCalled();

                await act(async () => user.click(body));
                expect(action).toHaveBeenCalledTimes(1);
            }
        );
    }
);

it('retains content without making a plain card an action', () => {
    // Act
    const output = renderStatic(<Card>Order summary</Card>);

    // Assert
    expect(output.textContent).toContain('Order summary');
    expect(output.querySelector('a, button')).toBeNull();
    expect(output.querySelector('[data-slot="card-header"], [data-slot="card-footer"]')).toBeNull();
});

it('gives selection priority over actions and navigation and leaves nested controls independent', async () => {
    const action = vi.fn();
    const nested = vi.fn();
    const changed = vi.fn();

    // Keep the controlled state real so pointer and keyboard toggles must agree.
    function Selection() {
        const [selected, setSelected] = useState(false);

        return (
            <Card
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
                <button type="button" onClick={nested}>
                    Remove
                </button>
            </Card>
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
        <Card label="Open order" href="/orders" onClick={action}>
            <p>Order</p>
        </Card>,
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
            <Card label="Action" isDisabled onClick={action}>
                <p>Action</p>
                <button onClick={nested}>Nested</button>
            </Card>
            <Card label="Selection" isDisabled onChange={changed}>
                <p>Selection</p>
            </Card>
            <Card label="Link" isDisabled href="/orders">
                <p>Link</p>
            </Card>
        </LinkNavigationContext>,
        async (output) => {
            const user = userEvent.setup();
            const controls = output.querySelectorAll<HTMLElement>('[data-slot="card-control"]');
            expect(controls).toHaveLength(3);
            const texts = output.querySelectorAll('p');
            expect(texts).toHaveLength(3);
            const nestedButton = output.querySelector<HTMLButtonElement>('button:not([data-slot="card-control"])');
            const link = output.querySelector('a');

            if (!nestedButton || !link) throw new Error('Expected nested button and disabled link');

            for (const control of controls) {
                control.focus();
                expect(document.activeElement).toBe(control);
                await act(async () => {
                    await user.keyboard('{Enter} ');
                    control.click();
                });
            }

            await act(async () => {
                for (const text of texts) text.click();
                nestedButton.click();
            });
            expect(link.hasAttribute('href')).toBe(false);
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
            <Card href="/orders">
                <p>Order</p>
                <a href="/other" onClick={nested}>
                    Other
                </a>
            </Card>
        </LinkNavigationContext>,
        async (output) => {
            await act(async () => {
                output.querySelector<HTMLAnchorElement>('a:not([data-slot="card-control"])')?.click();
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
                <Card href="/orders">
                    <p>Order</p>
                </Card>
                <Card href="javascript:alert(1)">
                    <p>Unsafe</p>
                </Card>
            </LinkNavigationContext>,
            async (output) => {
                const [card, unsafeCard] = output.querySelectorAll<HTMLElement>('[data-slot="card"]');

                if (!card || !unsafeCard) throw new Error('Expected safe and unsafe link cards');
                const anchor = card.querySelector('a');
                const unsafeAnchor = unsafeCard.querySelector('a');

                if (!anchor || !unsafeAnchor) throw new Error('Expected primary links');
                const gestures: boolean[] = [];
                anchor.addEventListener('click', (event) => {
                    gestures.push(event.ctrlKey);
                    event.preventDefault();
                });
                await act(async () => {
                    card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
                    card.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 1 }));
                    unsafeCard.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                    unsafeCard.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 1 }));
                });
                expect(gestures).toEqual([true]);
                expect(open).toHaveBeenCalledExactlyOnceWith(
                    'https://example.com/app/orders',
                    '_blank',
                    'noopener,noreferrer'
                );
                expect(navigate).not.toHaveBeenCalled();
                expect(unsafeAnchor.hasAttribute('href')).toBe(false);
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
            <Card onClick={action}>
                <p>Select this text</p>
            </Card>
            <Card inert aria-hidden="true" onClick={action}>
                <p>Inert</p>
            </Card>
        </>,
        async (output) => {
            const text = output.querySelector('p');
            const inertText = output.querySelector<HTMLElement>('[inert] p');
            const inertCard = output.querySelector('[inert]');

            if (!text || !inertText || !inertCard) throw new Error('Expected selectable and inert content');
            const selection = document.getSelection();

            if (!selection) throw new Error('Expected text selection support');
            selection.removeAllRanges();
            const range = document.createRange();
            range.selectNodeContents(text);
            selection.addRange(range);

            try {
                await act(async () => {
                    text.click();
                });
                expect(action).not.toHaveBeenCalled();
            } finally {
                selection.removeAllRanges();
            }

            await act(async () => {
                inertText.click();
            });
            expect(action).not.toHaveBeenCalled();
            expect(inertCard.getAttribute('aria-hidden')).toBe('true');
            await act(async () => {
                text.click();
            });
            expect(action).toHaveBeenCalledOnce();
        }
    );
});

it('lets native mouse handlers cancel middle-button navigation from composed content', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const mouseUp = vi.fn((event: React.MouseEvent) => event.preventDefault());

    try {
        await withMounted(
            <Card href="https://example.com/orders" size="sm" onMouseUp={mouseUp}>
                Order
            </Card>,
            async (output) => {
                const content = output.querySelector('[data-slot="card-content"]');

                if (!content) throw new Error('Expected composed content');

                await act(async () => {
                    content.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 1 }));
                });
                expect(mouseUp).toHaveBeenCalledOnce();
                expect(open).not.toHaveBeenCalled();
            }
        );
    } finally {
        open.mockRestore();
    }
});
