// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { RequestContext } from '@/lib/view-capabilities';
import { FileViewer } from '@/components/longlink/display/file-viewer';

it.each(['missing', 'rejected'] as const)('reports a %s file capability without remaining pending', async (result) => {
    // Arrange
    const files = {
        request: async () => {
            throw new Error('File request denied');
        }
    };

    // Act
    await withMounted(
        <RequestContext value={result === 'missing' ? null : files}>
            <FileViewer src="/api/report" title="Report" />
        </RequestContext>,
        async (output) => {
            // Assert
            await vi.waitFor(async () => {
                await act(async () => {});
                expect(output.querySelector('[role="status"]')?.textContent).toBe(
                    result === 'missing' ? 'File preview unavailable' : 'File request denied'
                );
            });
            expect(output.querySelector('[role="progressbar"], img, iframe, object, embed')).toBeNull();
        }
    );
});

it('updates the accessible title without reloading or replacing the displayed media', async () => {
    const load = vi.fn(async () => new Blob(['image'], { type: 'image/png' }));
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:image');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    function Example() {
        const [title, setTitle] = useState('Invoice');

        return (
            <>
                <FileViewer src="/api/image" title={title} />
                <button type="button" onClick={() => setTitle('Updated invoice')}>
                    Rename
                </button>
            </>
        );
    }

    try {
        await withMounted(
            <RequestContext value={{ request: load }}>
                <Example />
            </RequestContext>,
            async (output) => {
                await vi.waitFor(async () => {
                    await act(async () => {});
                    expect(output.querySelector('img')).not.toBeNull();
                });
                const image = output.querySelector('img');

                if (!image) throw new Error('Missing loaded image');

                expect(image.getAttribute('src')).toBe('blob:image');
                await act(async () => output.querySelector('button')?.click());
                expect(output.querySelector('img')).toBe(image);
                expect(image.alt).toBe('Updated invoice');
                expect(output.querySelector('[aria-label="Updated invoice"]')).not.toBeNull();
                expect(load).toHaveBeenCalledExactlyOnceWith('/api/image', { binary: true });
                expect(create).toHaveBeenCalledTimes(1);
                expect(revoke).not.toHaveBeenCalled();
            }
        );
        expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:image');
    } finally {
        create.mockRestore();
        revoke.mockRestore();
    }
});

it('ignores a pending response after replacing the file and releases the displayed URL', async () => {
    let finish: (value: Blob) => void = () => undefined;

    const first = new Promise<Blob>((resolve) => {
        finish = resolve;
    });

    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:replacement');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    function Example() {
        const [src, setSource] = useState('/api/first');

        return (
            <>
                <FileViewer src={src} title="Image" />
                <button type="button" onClick={() => setSource('/api/replacement')}>
                    Replace
                </button>
            </>
        );
    }

    try {
        await withMounted(
            <RequestContext
                value={{
                    request: async (path) => (path === '/api/first' ? first : new Blob(['new'], { type: 'image/png' }))
                }}
            >
                <Example />
            </RequestContext>,
            async (output) => {
                expect(output.querySelector('[role="progressbar"]')).not.toBeNull();
                await act(async () => output.querySelector('button')?.click());
                await vi.waitFor(async () => {
                    await act(async () => {});
                    expect(output.querySelector('img')?.getAttribute('src')).toBe('blob:replacement');
                });
                await act(async () => {
                    finish(new Blob(['stale'], { type: 'image/png' }));
                    await first;
                });
                expect(output.querySelector('img')?.getAttribute('src')).toBe('blob:replacement');
                expect(create).toHaveBeenCalledTimes(1);
            }
        );
        expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:replacement');
    } finally {
        create.mockRestore();
        revoke.mockRestore();
    }
});

it('displays active text documents as inert text without creating nested frames', async () => {
    const create = vi.spyOn(URL, 'createObjectURL');

    try {
        for (const type of ['application/xml', 'text/html']) {
            const body = new Blob(['<script>active()</script>'], { type });
            await withMounted(
                <RequestContext value={{ request: async () => body }}>
                    <FileViewer src="/api/report" title="Report" />
                </RequestContext>,
                async (output) => {
                    await vi.waitFor(async () => {
                        await act(async () => {});
                        expect(output.querySelector('pre')?.textContent).toBe('<script>active()</script>');
                    });
                    expect(output.querySelector('iframe, script, object, embed, button')).toBeNull();
                    expect(create).not.toHaveBeenCalled();
                }
            );
        }
    } finally {
        create.mockRestore();
    }
});

it('keeps PDF bytes out of text rendering and embedded documents despite a text filename', async () => {
    // Arrange
    const body = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0xff])], { type: 'application/pdf' });

    // Act
    await withMounted(
        <RequestContext value={{ request: async () => body }}>
            <FileViewer src="/api/report" title="report.txt" />
        </RequestContext>,
        async (output) => {
            // Assert
            await vi.waitFor(async () => {
                await act(async () => {});
                expect(output.querySelector('[role="status"]')?.textContent).toBe('Unable to display this PDF.');
            });
            expect(output.querySelector('pre, iframe, object, embed')).toBeNull();
            expect(output.textContent).not.toContain('%PDF');
        }
    );
});

it.each(['application/octet-stream', 'image/svg+xml'])(
    'does not embed or interpret unsupported %s files',
    async (type) => {
        const create = vi.spyOn(URL, 'createObjectURL');

        try {
            await withMounted(
                <RequestContext value={{ request: async () => new Blob(['<script>active()</script>'], { type }) }}>
                    <FileViewer src="/api/file" title="Attachment" />
                </RequestContext>,
                async (output) => {
                    await vi.waitFor(async () => {
                        await act(async () => {});
                        expect(output.querySelector('[role="status"]')?.textContent).toContain('Preview unavailable');
                    });
                    expect(output.querySelector('img, script, iframe, object, embed')).toBeNull();
                    expect(create).not.toHaveBeenCalled();
                }
            );
        } finally {
            create.mockRestore();
        }
    }
);

it('shares a pending file request and reloads after all viewers close, releasing their URLs', async () => {
    // Arrange
    let finish: (body: Blob) => void = () => {};
    const pending = new Promise<Blob>((resolve) => {
        finish = resolve;
    });
    const request = vi
        .fn()
        .mockReturnValueOnce(pending)
        .mockResolvedValue(new Blob(['replacement'], { type: 'image/png' }));
    const create = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValueOnce('blob:first')
        .mockReturnValueOnce('blob:second')
        .mockReturnValue('blob:replacement');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const user = userEvent.setup();

    function Example() {
        const [visible, setVisible] = useState(true);
        return (
            <RequestContext value={{ request }}>
                <button type="button" onClick={() => setVisible(!visible)}>
                    Toggle
                </button>
                {visible && (
                    <>
                        <FileViewer src="/api/image" title="First" />
                        <FileViewer src="/api/image" title="Second" />
                    </>
                )}
            </RequestContext>
        );
    }

    try {
        await withMounted(<Example />, async (output) => {
            expect(request).toHaveBeenCalledTimes(1);
            expect(output.querySelectorAll('[role="progressbar"]')).toHaveLength(2);

            // Act
            await act(async () => finish(new Blob(['image'], { type: 'image/png' })));
            await vi.waitFor(async () => {
                await act(async () => {});
                expect(output.querySelectorAll('img')).toHaveLength(2);
            });
            const toggle = output.querySelector('button');
            if (!toggle) throw new Error('Expected toggle');
            await act(async () => user.click(toggle));

            // Assert
            expect(revoke.mock.calls).toEqual([['blob:first'], ['blob:second']]);
            await act(async () => user.click(toggle));
            await vi.waitFor(async () => {
                await act(async () => {});
                expect(output.querySelectorAll('img[src="blob:replacement"]')).toHaveLength(2);
            });
            expect(request).toHaveBeenCalledTimes(2);
        });
        expect(revoke).toHaveBeenCalledTimes(4);
    } finally {
        create.mockRestore();
        revoke.mockRestore();
    }
});
