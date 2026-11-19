import { it, expect, vi } from 'vitest';
import { ReportedError } from '@/lib/reported';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { Link } from '@/components/longlink/action/link';
import { Dialog } from '@/components/longlink/layout/dialog';
// @vitest-environment happy-dom
import { act, createRef, useContext, useState } from 'react';
import { FilePreview } from '@/components/longlink/display/file-preview';
import { RequestContext, LinkNavigationContext, DialogActivityContext } from '@/lib/view-capabilities';

function PreviewAction({ src, title }: { src: string; title: string }) {
    const requests = useContext(RequestContext);
    const [body, setBody] = useState<Blob>();

    return (
        <>
            <Link
                aria-haspopup="dialog"
                onClick={async () => {
                    if (!requests) throw new Error('File requests unavailable');
                    const result = await requests.request(src, { binary: true });
                    if (!(result instanceof Blob)) throw new Error('File preview unavailable');
                    setBody(result);
                }}
            >
                Preview
            </Link>
            {body && (
                <Dialog open fullscreen title={title} onOpenChange={() => setBody(undefined)}>
                    <div className="h-full min-h-0">
                        <FilePreview body={body} title={title} highlight />
                    </div>
                </Dialog>
            )}
        </>
    );
}

it.each(['navigation', 'action'] as const)('ignores injected presentation overrides on a %s link', (kind) => {
    const overrides = { className: 'hidden', style: { display: 'none' } };
    const output = renderStatic(
        kind === 'navigation' ? (
            <Link {...overrides} href="/orders">
                Orders
            </Link>
        ) : (
            <Link {...overrides} onClick={() => {}}>
                Orders
            </Link>
        )
    );

    const control = output.querySelector('a, button');
    expect(control?.classList.contains('hidden')).toBe(false);
    expect(control?.hasAttribute('style')).toBe(false);
});

it('keeps a Solution-relative destination on the rendered link', () => {
    // Act
    const output = renderStatic(<Link href="/orders">Orders</Link>);

    // Assert
    expect(output.querySelector('a')?.getAttribute('href')).toBe('/orders');
});

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

it.each([
    'javascript:alert(1)',
    'data:text/html,unsafe',
    'https://user:password@example.com/private',
    '../users',
    '/%252e%252e/users',
    '/items%2f..%2fusers',
    '/items%5cusers'
])('withholds unsafe destination %s without delegating it to the host', async (href) => {
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
});

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

it('keeps native download links independent of the scoped download capability', async () => {
    const navigate = vi.fn();
    const download = vi.fn(async () => {});

    await withMounted(
        <RequestContext value={{ request: vi.fn(), download }}>
            <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
                <Link href="/invoice.pdf" download="invoice.pdf" onClick={(event) => event.preventDefault()}>
                    Invoice
                </Link>
            </LinkNavigationContext>
        </RequestContext>,
        async (output) => {
            const control = output.querySelector('a');

            if (!control) throw new Error('Expected download action');
            expect(control.getAttribute('download')).toBe('invoice.pdf');
            expect(control.getAttribute('href')).toBe('/solutions/orders/invoice.pdf');
            expect(output.querySelector('button')).toBeNull();
            await act(async () => control.click());
            expect(download).not.toHaveBeenCalled();
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

it.each([false, true])('forwards the rendered download element to its ref and handler (scoped: %s)', async (scoped) => {
    // Arrange
    const ref = createRef<HTMLElement>();
    const download = vi.fn(async () => {});
    let activated: HTMLElement | undefined;

    await withMounted(
        <RequestContext value={scoped ? { request: vi.fn(), download } : null}>
            <Link
                ref={ref}
                href="/invoice.pdf"
                download="invoice.pdf"
                onClick={(event) => {
                    activated = event.currentTarget;
                    event.preventDefault();
                }}
            >
                Download
            </Link>
        </RequestContext>,
        async (output) => {
            const control = output.querySelector<HTMLElement>('a, button');

            if (!control) throw new Error('Expected download control');

            // Act
            ref.current?.focus();
            await act(async () => control.click());

            // Assert
            expect(control.tagName).toBe('A');
            expect(ref.current).toBe(control);
            expect(activated).toBe(control);
            expect(document.activeElement).toBe(control);
            expect(download).not.toHaveBeenCalled();
        }
    );

    expect(ref.current).toBeNull();
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

it('allows canceling an attachment download without navigating or requesting file bytes', async () => {
    const load = vi.fn(async () => {
        throw new Error('Attachment links must not load file bytes');
    });

    const navigate = vi.fn();

    await withMounted(
        <RequestContext value={{ request: load, download: async () => {} }}>
            <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
                <Link href="/invoice.pdf" download="invoice.pdf" onClick={(event) => event.preventDefault()}>
                    Preview
                </Link>
            </LinkNavigationContext>
        </RequestContext>,
        async (output) => {
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            await act(async () => output.querySelector('a')?.dispatchEvent(event));
            expect(event.defaultPrevented).toBe(true);
            expect(load).not.toHaveBeenCalled();
            expect(navigate).not.toHaveBeenCalled();
            expect(output.querySelector('a')?.hasAttribute('aria-busy')).toBe(false);
        }
    );
});

it('loads and displays previews locally, coordinates modal activity and releases bytes on dismissal', async () => {
    // Arrange
    const request = vi.fn(async () => new Blob(['image'], { type: 'image/png' }));
    const download = vi.fn(async () => {});
    const navigate = vi.fn();
    const activity = vi.fn();
    const user = userEvent.setup();
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    try {
        await withMounted(
            <RequestContext value={{ request, download }}>
                <DialogActivityContext value={activity}>
                    <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
                        <PreviewAction src="/invoice.png" title="Invoice" />
                    </LinkNavigationContext>
                </DialogActivityContext>
            </RequestContext>,
            async (output) => {
                const control = output.querySelector('button');
                if (!control) throw new Error('Expected attachment link');
                expect(request).not.toHaveBeenCalled();

                // Act
                await act(async () => user.click(control));

                // Assert
                expect(request).toHaveBeenCalledExactlyOnceWith('/invoice.png', { binary: true });
                expect(document.querySelector('[role="dialog"] img')?.getAttribute('src')).toBe('blob:preview');
                expect(activity).toHaveBeenLastCalledWith(true);
                expect(download).not.toHaveBeenCalled();
                expect(navigate).not.toHaveBeenCalled();

                await act(async () => user.keyboard('{Escape}'));
                expect(activity).toHaveBeenLastCalledWith(false);
                expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:preview');
                expect(document.activeElement).toBe(control);
                await act(async () => control.click());
                expect(request).toHaveBeenCalledTimes(2);
            }
        );
    } finally {
        create.mockRestore();
        revoke.mockRestore();
    }
});

it.each([
    { type: 'application/pdf', title: 'report.txt', content: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0xff]) },
    { type: 'text/html', title: 'source.html', content: '<script>active()</script><img src=x onerror="active()">' },
    { type: 'application/octet-stream', title: 'source.tsx', content: '<script>active()</script>' }
])(
    'renders $type locally without interpreting markup or decoding PDF bytes as text',
    async ({ type, title, content }) => {
        // Arrange
        const request = vi.fn(async () => new Blob([content], { type }));

        await withMounted(
            <RequestContext value={{ request, download: async () => {} }}>
                <PreviewAction src="/file" title={title} />
            </RequestContext>,
            async (output) => {
                // Act
                await act(async () => output.querySelector('button')?.click());

                // Assert
                await vi.waitFor(async () => {
                    await act(async () => {});
                    const dialog = document.querySelector('[role="dialog"]');
                    expect(dialog?.textContent).toContain(title);
                    expect(dialog?.textContent).toContain(
                        type === 'application/pdf' ? 'Unable to display this PDF.' : content
                    );
                    expect(dialog?.querySelector('script, img, iframe, object, embed')).toBeNull();
                });
            }
        );
    }
);

it('keeps a text decoding failure inside the preview and permits reopening with fresh content', async () => {
    // Arrange
    const request = vi
        .fn()
        .mockResolvedValueOnce(new Blob([new Uint8Array([0xff])], { type: 'text/html' }))
        .mockResolvedValue(new Blob(['recovered'], { type: 'text/html' }));
    const user = userEvent.setup();

    await withMounted(
        <RequestContext value={{ request, download: async () => {} }}>
            <PreviewAction src="/file" title="source.html" />
        </RequestContext>,
        async (output) => {
            const control = output.querySelector('button');
            if (!control) throw new Error('Expected preview action');

            // Act
            await act(async () => user.click(control));

            // Assert
            await vi.waitFor(async () => {
                await act(async () => {});
                expect(document.querySelector('[role="dialog"] [role="status"]')?.textContent).toBe(
                    'Unable to display this file.'
                );
            });
            await act(async () => user.keyboard('{Escape}'));
            await act(async () => user.click(control));
            await vi.waitFor(async () => {
                await act(async () => {});
                expect(document.querySelector('[role="dialog"]')?.textContent).toContain('recovered');
            });
            expect(request).toHaveBeenCalledTimes(2);
        }
    );
});

it('recovers after a scoped preview failure has already been reported', async () => {
    const request = vi
        .fn<() => Promise<Blob>>()
        .mockRejectedValueOnce(new ReportedError('Request already reported'))
        .mockResolvedValue(new Blob(['unsupported'], { type: 'application/octet-stream' }));

    await withMounted(
        <RequestContext value={{ request, download: async () => {} }}>
            <PreviewAction src="/invoice.pdf" title="Invoice" />
        </RequestContext>,
        async (output) => {
            await act(async () => output.querySelector('button')?.click());
            expect(output.textContent).toBe('Preview');
            expect(output.querySelector('button')?.hasAttribute('aria-busy')).toBe(false);
            await act(async () => output.querySelector('button')?.click());
            expect(request).toHaveBeenCalledTimes(2);
            expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Preview unavailable');
            expect(output.querySelector('[role="alert"]')).toBeNull();
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
