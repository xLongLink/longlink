// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { useLocation } from 'react-router';
import { ReportedError } from '@/lib/reported';
import { act, createRef, useState } from 'react';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { Link } from '@/components/longlink/action/link';
import { LinkNavigationContext } from '@/lib/view-capabilities';

it('delegates ordinary solution navigation while preserving canceled, modified and middle clicks', async () => {
    const navigate = vi.fn();
    let cancel = false;

    await withMounted(
        <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
            <Link href="/invoices" onClick={(event) => cancel && event.preventDefault()}>
                Invoices
            </Link>
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

it.each(['javascript:alert(1)', 'https://user:password@example.com/private', '../users'])(
    'withholds unsafe destination %s without delegating it to the host',
    async (href) => {
        const navigate = vi.fn();

        await withMounted(
            <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
                <Link href={href}>Unsafe</Link>
            </LinkNavigationContext>,
            async (output) => {
                const anchor = output.querySelector('a');

                if (!anchor) throw new Error('Expected navigation link');
                expect(anchor.hasAttribute('href')).toBe(false);
                for (const modifiers of [{}, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { button: 1 }]) {
                    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...modifiers });
                    await act(async () => anchor.dispatchEvent(event));
                    expect(event.defaultPrevented).toBe(true);
                }
                expect(navigate).not.toHaveBeenCalled();
            }
        );
    }
);

it('opens validated external destinations outside the frame without an opener', () => {
    const output = renderStatic(
        <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate: vi.fn() }}>
            <Link href="https://example.com/docs">Docs</Link>
        </LinkNavigationContext>
    );

    const anchor = output.querySelector('a');

    expect(anchor?.getAttribute('href')).toBe('https://example.com/docs');
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
});

it('leaves downloads, mail targets and new tabs to the browser inside the Platform router', async () => {
    function Location() {
        const { pathname } = useLocation();

        return <output>{pathname}</output>;
    }

    await withMounted(
        <>
            <Link href="mailto:info@longlink.dev">Email</Link>
            <Link href="/report.pdf" download="report.pdf">
                Report
            </Link>
            <Link href="/pricing" target="_blank" rel="author">
                Pricing
            </Link>
            <Location />
        </>,
        async (output) => {
            const [email, report, pricing] = output.querySelectorAll('a');
            if (!email || !report || !pricing) throw new Error('Expected native anchors');

            expect(email.getAttribute('href')).toBe('mailto:info@longlink.dev');
            expect(report.download).toBe('report.pdf');
            expect(pricing.target).toBe('_blank');
            expect(pricing.rel.split(' ')).toEqual(expect.arrayContaining(['author', 'noopener', 'noreferrer']));

            for (const link of [email, report, pricing]) {
                let preventedByApp: boolean | undefined;
                const preventNavigation = (event: MouseEvent) => {
                    preventedByApp = event.defaultPrevented;
                    event.preventDefault();
                };

                document.addEventListener('click', preventNavigation, { once: true });
                try {
                    await act(async () => link.click());
                } finally {
                    document.removeEventListener('click', preventNavigation);
                }

                expect(preventedByApp).toBe(false);
                expect(output.querySelector('output')?.textContent).toBe('/');
            }
        }
    );
});

it('preserves native download links and allows canceling without navigating', async () => {
    const navigate = vi.fn();

    await withMounted(
        <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
            <Link href="/invoice.pdf" download="invoice.pdf" onClick={(event) => event.preventDefault()}>
                Invoice
            </Link>
        </LinkNavigationContext>,
        async (output) => {
            const control = output.querySelector('a');

            if (!control) throw new Error('Expected download action');
            expect(control.getAttribute('download')).toBe('invoice.pdf');
            expect(control.getAttribute('href')).toBe('/solutions/orders/invoice.pdf');
            expect(output.querySelector('button')).toBeNull();
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            await act(async () => control.dispatchEvent(event));
            expect(event.defaultPrevented).toBe(true);
            expect(control.hasAttribute('aria-busy')).toBe(false);
            expect(navigate).not.toHaveBeenCalled();
        }
    );
});

it.each([false, true])(
    'keeps disabled actions discoverable without keyboard or click actions (file: %s)',
    async (file) => {
        const action = vi.fn();
        const user = userEvent.setup();

        await withMounted(
            file ? (
                <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate: vi.fn() }}>
                    <Link href="/invoice.pdf" download="invoice.pdf" disabled onClick={action}>
                        Unavailable
                    </Link>
                </LinkNavigationContext>
            ) : (
                <Link disabled onClick={action}>
                    Unavailable
                </Link>
            ),
            async (output) => {
                const control = output.querySelector<HTMLElement>('a, button');

                if (!control) throw new Error('Expected link control');
                await act(async () => user.tab());
                expect(document.activeElement).toBe(control);
                expect(control.getAttribute('aria-disabled')).toBe('true');
                expect(control.tagName).toBe(file ? 'A' : 'BUTTON');
                expect(control.hasAttribute('href')).toBe(false);
                await act(async () => user.keyboard('{Enter} '));
                await act(async () => control.click());
                expect(action).not.toHaveBeenCalled();
            }
        );
    }
);

it('runs keyboard actions without submitting the form and preserves focus while blocking duplicate work', async () => {
    let release = () => {};

    const pending = new Promise<void>((resolve) => {
        release = resolve;
    });

    const action = vi.fn(() => pending);
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const user = userEvent.setup();

    try {
        await withMounted(
            <form onSubmit={submit}>
                <Link onClick={action}>Save</Link>
            </form>,
            async (output) => {
                const control = output.querySelector('button');

                if (!control) throw new Error('Expected action button');

                await act(async () => user.tab());
                await act(async () => user.keyboard('{Enter}'));
                expect(action).toHaveBeenCalledTimes(1);
                expect(control.getAttribute('aria-busy')).toBe('true');
                expect(document.activeElement).toBe(control);
                await act(async () => user.keyboard('{Enter} '));
                await act(async () => control.click());
                expect(action).toHaveBeenCalledTimes(1);
                expect(submit).not.toHaveBeenCalled();

                await act(async () => {
                    release();
                    await pending;
                });
                expect(control.hasAttribute('aria-busy')).toBe(false);
                expect(document.activeElement).toBe(control);
                await act(async () => user.keyboard(' '));
                expect(action).toHaveBeenCalledTimes(2);
                expect(submit).not.toHaveBeenCalled();
            }
        );
    } finally {
        release();
    }
});

it('blocks disabled navigation and its callback until enabled', async () => {
    const navigate = vi.fn();
    const action = vi.fn();
    const user = userEvent.setup();

    function Navigation() {
        const [disabled, setDisabled] = useState(true);

        return (
            <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
                <Link href="/orders" disabled={disabled} onClick={action}>
                    Orders
                </Link>
                <button onClick={() => setDisabled(false)}>Enable</button>
            </LinkNavigationContext>
        );
    }

    await withMounted(<Navigation />, async (output) => {
        const anchor = output.querySelector('a');

        if (!anchor) throw new Error('Expected navigation link');

        await act(async () => user.tab());
        expect(document.activeElement).toBe(anchor);
        expect(anchor.hasAttribute('href')).toBe(false);
        await act(async () => user.keyboard('{Enter}'));
        await act(async () => anchor.click());
        expect(action).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
        await act(async () => output.querySelector('button')?.click());
        await act(async () => anchor.click());
        expect(action).toHaveBeenCalledTimes(1);
        expect(navigate).toHaveBeenCalledExactlyOnceWith('/orders');
    });
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

it('preserves native anchor props and ref without wrapping caller-owned content', async () => {
    const anchorRef = createRef<HTMLAnchorElement>();
    const navigate = vi.fn();

    await withMounted(
        <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
            <Link href="/invoices" ref={anchorRef} target="_blank" rel="nofollow" title="Invoices">
                <strong>Invoices</strong>
            </Link>
        </LinkNavigationContext>,
        async (output) => {
            const anchor = output.querySelector('a');

            if (!anchor) throw new Error('Expected navigation link');
            expect(anchorRef.current).toBe(anchor);
            expect(anchor.firstElementChild?.tagName).toBe('STRONG');
            expect(anchor.title).toBe('Invoices');
            expect(anchor.rel).toBe('nofollow noopener noreferrer');
            let preventedByLink = true;

            // Observe the navigation decision, then stop happy-dom from loading another document.
            output.addEventListener(
                'click',
                (event) => {
                    preventedByLink = event.defaultPrevented;
                    event.preventDefault();
                },
                { once: true }
            );
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            await act(async () => anchor.dispatchEvent(event));
            expect(preventedByLink).toBe(false);
            expect(navigate).not.toHaveBeenCalled();
        }
    );
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
