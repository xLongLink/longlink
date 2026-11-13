// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { ReportedError } from '@/lib/reported';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { Link, NavigationLink } from '@/components/custom/Link';
import { FileRequestContext } from '@/components/custom/preview';
import { LinkNavigationContext } from '@/components/custom/contexts';

it('keeps a Solution-relative destination on the rendered link', () => {
    // Act
    const output = renderStatic(<Link to="/orders">Orders</Link>);

    // Assert
    expect(output.querySelector('a')?.getAttribute('href')).toBe('/orders');
    expect(output.querySelector('a')?.textContent).toBe('Orders');
});

it('delegates ordinary solution navigation while preserving canceled, modified and middle clicks', async () => {
    const navigate = vi.fn();
    let cancel = false;

    await withMounted(
        <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
            <NavigationLink href="/invoices" onClick={(event) => cancel && event.preventDefault()}>
                Invoices
            </NavigationLink>
        </LinkNavigationContext>,
        async (output) => {
            const anchor = output.querySelector('a');

            if (!anchor) throw new Error('Expected navigation link');
            expect(anchor.getAttribute('href')).toBe('/solutions/orders/invoices');

            for (const gesture of [
                { ctrlKey: true },
                { metaKey: true },
                { shiftKey: true },
                { altKey: true },
                { button: 1 }
            ]) {
                const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...gesture });
                await act(async () => anchor.dispatchEvent(event));
                expect(event.defaultPrevented).toBe(false);
            }

            cancel = true;
            await act(async () => anchor.click());
            expect(navigate).not.toHaveBeenCalled();
            cancel = false;
            await act(async () => anchor.click());
            expect(navigate).toHaveBeenCalledExactlyOnceWith('/invoices');
        }
    );
});

it.each(['javascript:alert(1)', 'data:text/html,unsafe', 'https://user:password@example.com/private'])(
    'withholds unsafe destination %s without delegating it to the host',
    async (href) => {
        const navigate = vi.fn();

        await withMounted(
            <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
                <NavigationLink href={href}>Unsafe</NavigationLink>
            </LinkNavigationContext>,
            async (output) => {
                const anchor = output.querySelector('a');

                if (!anchor) throw new Error('Expected navigation link');
                expect(anchor.hasAttribute('href')).toBe(false);
                const event = new MouseEvent('click', { bubbles: true, cancelable: true });
                await act(async () => anchor.dispatchEvent(event));
                expect(event.defaultPrevented).toBe(true);
                expect(navigate).not.toHaveBeenCalled();
            }
        );
    }
);

it('opens validated external destinations outside the frame without an opener', () => {
    const output = renderStatic(
        <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate: vi.fn() }}>
            <Link to="https://example.com/docs">Docs</Link>
        </LinkNavigationContext>
    );

    const anchor = output.querySelector('a');

    expect(anchor?.getAttribute('href')).toBe('https://example.com/docs');
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
});

it.each([undefined, '/orders'])(
    'keeps disabled controls discoverable without keyboard or click actions (%s)',
    async (to) => {
        const action = vi.fn();
        const user = userEvent.setup();

        await withMounted(
            <Link to={to} disabled onClick={action}>
                Unavailable
            </Link>,
            async (output) => {
                const control = output.querySelector<HTMLElement>('a, button');

                if (!control) throw new Error('Expected link control');
                await act(async () => user.tab());
                expect(document.activeElement).toBe(control);
                expect(control.getAttribute('aria-disabled')).toBe('true');
                expect(control.tagName).toBe('BUTTON');
                expect(control.hasAttribute('href')).toBe(false);
                await act(async () => user.keyboard('{Enter} '));
                await act(async () => control.click());
                expect(action).not.toHaveBeenCalled();
            }
        );
    }
);

it('runs synchronous actions immediately without introducing a loading transition or submitting a form', async () => {
    const action = vi.fn();
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());

    await withMounted(
        <form onSubmit={submit}>
            <Link onClick={action}>Run</Link>
        </form>,
        async (output) => {
            const button = output.querySelector('button');

            if (!button) throw new Error('Expected action button');
            await act(async () => {
                button.click();
                expect(action).toHaveBeenCalledTimes(1);
                button.click();
            });
            expect(action).toHaveBeenCalledTimes(2);
            expect(button.hasAttribute('aria-busy')).toBe(false);
            expect(submit).not.toHaveBeenCalled();
        }
    );
});

it('guards repeated downloads until the callback and scoped host download finish, then recovers', async () => {
    let release = () => {};

    const pending = new Promise<void>((resolve) => {
        release = resolve;
    });

    const action = vi.fn(() => pending);
    const download = vi.fn(async () => {});
    const navigate = vi.fn();

    try {
        await withMounted(
            <FileRequestContext value={{ preview: async () => null, download }}>
                <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
                    <Link to="/invoice.pdf" download="invoice.pdf" onClick={action}>
                        Download
                    </Link>
                </LinkNavigationContext>
            </FileRequestContext>,
            async (output) => {
                const anchor = output.querySelector('a');

                if (!anchor) throw new Error('Expected download link');
                await act(async () => {
                    anchor.click();
                    anchor.click();
                });
                expect(action).toHaveBeenCalledTimes(1);
                expect(download).not.toHaveBeenCalled();
                expect(output.querySelector('button')?.getAttribute('aria-busy')).toBe('true');
                expect(output.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Loading');
                await act(async () => {
                    release();
                    await pending;
                });
                expect(download).toHaveBeenCalledExactlyOnceWith('/invoice.pdf', 'invoice.pdf');
                expect(navigate).not.toHaveBeenCalled();
                expect(output.querySelector('a')?.hasAttribute('aria-busy')).toBe(false);
                await act(async () => output.querySelector('a')?.click());
                expect(download).toHaveBeenCalledTimes(2);
            }
        );
    } finally {
        release();
    }
});

it('commits callback state updates before the returned promise settles', async () => {
    let release = () => {};

    const pending = new Promise<void>((resolve) => {
        release = resolve;
    });

    function Action() {
        const [message, setMessage] = useState('Ready');

        return (
            <>
                <output>{message}</output>
                <Link
                    onClick={() => {
                        setMessage('Saving');

                        return pending;
                    }}
                >
                    Save
                </Link>
            </>
        );
    }

    try {
        await withMounted(<Action />, async (output) => {
            await act(async () => output.querySelector('button')?.click());
            expect(output.querySelector('output')?.textContent).toBe('Saving');
            expect(output.querySelector('button')?.getAttribute('aria-busy')).toBe('true');
            await act(async () => {
                release();
                await pending;
            });
            expect(output.querySelector('button')?.hasAttribute('aria-busy')).toBe(false);
        });
    } finally {
        release();
    }
});

it.each([false, true])('recovers from an already-reported action failure (async: %s)', async (asynchronous) => {
    const failure = new ReportedError('Request already reported');

    const action = vi.fn(() => {
        if (asynchronous) return Promise.reject(failure);
        throw failure;
    });

    await withMounted(<Link onClick={action}>Retry</Link>, async (output) => {
        await act(async () => output.querySelector('button')?.click());
        expect(output.textContent).toBe('Retry');
        expect(output.querySelector('button')?.hasAttribute('aria-busy')).toBe(false);
        await act(async () => output.querySelector('button')?.click());
        expect(action).toHaveBeenCalledTimes(2);
    });
});

it('reports a missing download capability instead of navigating or claiming success', async () => {
    await withMounted(
        <Link to="/invoice.pdf" download="invoice.pdf">
            Download
        </Link>,
        async (output) => {
            await act(async () => output.querySelector('a')?.click());
            expect(output.querySelector('[role="alert"]')?.textContent).toBe('Downloads require the Solution runtime');
            expect(output.querySelector('a')?.hasAttribute('aria-busy')).toBe(false);
        }
    );
});
