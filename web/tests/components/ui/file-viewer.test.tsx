// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { getDocument, PDFWorker } from 'pdfjs-dist';
import { useQueryClient } from '@tanstack/react-query';
import { RequestContext } from '@/lib/view-capabilities';
import { Image } from '@/components/longlink/display/image';
import { FileViewer } from '@/components/longlink/display/file-viewer';
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from 'pdfjs-dist';

vi.mock('pdfjs-dist', () => ({
    getDocument: vi.fn(() => {
        throw new Error('Invalid PDF');
    }),
    PDFWorker: { create: vi.fn() }
}));
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?raw', () => ({ default: '' }));

function RefreshableFile() {
    const client = useQueryClient();
    const [title, setTitle] = useState('Report');

    return (
        <>
            <FileViewer src="/api/report" title={title} />
            <button
                type="button"
                onClick={async () => await client.refetchQueries({ queryKey: ['api', '/api/report'] })}
            >
                Refresh
            </button>
            <button type="button" onClick={() => setTitle('Renamed report')}>
                Rename
            </button>
        </>
    );
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}

it.each(['missing', 'rejected'] as const)('reports a %s file capability without remaining pending', async (result) => {
    // Arrange
    const request = async () => {
        throw new Error('File request denied');
    };

    // Act
    await withMounted(
        <RequestContext value={result === 'missing' ? null : request}>
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

it('preserves media on rename and same-Blob refresh, replacing its URL only for new content', async () => {
    const body = new Blob(['image'], { type: 'image/png' });
    const replacement = new Blob(['replacement'], { type: 'image/png' });
    const load = vi.fn().mockResolvedValueOnce(body).mockResolvedValueOnce(body).mockResolvedValue(replacement);
    const create = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValueOnce('blob:image')
        .mockReturnValue('blob:replacement');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    function Example() {
        const [title, setTitle] = useState('Invoice');
        const client = useQueryClient();

        return (
            <>
                <FileViewer src="/api/image" title={title} />
                <button type="button" onClick={() => setTitle('Updated invoice')}>
                    Rename
                </button>
                <button type="button" onClick={async () => await client.refetchQueries()}>
                    Refresh
                </button>
            </>
        );
    }

    try {
        await withMounted(
            <RequestContext value={load}>
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
                await act(async () => output.querySelectorAll('button')[1]?.click());
                await vi.waitFor(async () => {
                    await act(async () => {});
                    expect(load).toHaveBeenCalledTimes(2);
                });
                expect(output.querySelector('img')).toBe(image);
                expect(image.getAttribute('src')).toBe('blob:image');
                expect(create).toHaveBeenCalledTimes(1);
                expect(revoke).not.toHaveBeenCalled();
                await act(async () => output.querySelectorAll('button')[1]?.click());
                await vi.waitFor(async () => {
                    await act(async () => {});
                    expect(image.getAttribute('src')).toBe('blob:replacement');
                });
                expect(output.querySelector('img')).toBe(image);
                expect(create).toHaveBeenCalledTimes(2);
                expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:image');
            }
        );
        expect(revoke.mock.calls).toEqual([['blob:image'], ['blob:replacement']]);
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
                value={async (path) => (path === '/api/first' ? first : new Blob(['new'], { type: 'image/png' }))}
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
            const request = vi.fn(async () => body);
            await withMounted(
                <RequestContext value={request}>
                    <Image src="/api/report" alt="Report image" />
                    <FileViewer src="/api/report" title="Report" />
                </RequestContext>,
                async (output) => {
                    await vi.waitFor(async () => {
                        await act(async () => {});
                        expect(output.querySelector('pre')?.textContent).toBe('<script>active()</script>');
                    });
                    expect(output.querySelector('iframe, script, object, embed, button')).toBeNull();
                    expect(output.querySelector('img')).toBeNull();
                    expect(output.textContent).toContain('Photo unavailable');
                    expect(request).toHaveBeenCalledTimes(1);
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
        <RequestContext value={async () => body}>
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

it('does not embed or interpret unsupported SVG files', async () => {
    const create = vi.spyOn(URL, 'createObjectURL');

    try {
        await withMounted(
            <RequestContext value={async () => new Blob(['<script>active()</script>'], { type: 'image/svg+xml' })}>
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
});

it('shares a pending binary request across images and files and reloads after both close, releasing their URLs', async () => {
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
            <RequestContext value={request}>
                <button type="button" onClick={() => setVisible(!visible)}>
                    Toggle
                </button>
                {visible && (
                    <>
                        <Image src="/api/image" alt="First" />
                        <FileViewer src="/api/image" title="Second" />
                    </>
                )}
            </RequestContext>
        );
    }

    try {
        await withMounted(<Example />, async (output) => {
            expect(request).toHaveBeenCalledTimes(1);
            expect(output.querySelectorAll('[role="progressbar"]')).toHaveLength(1);

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

it('resets text on same-source replacement and ignores a superseded decoder completion', async () => {
    // Arrange
    const pending = deferred<string>();
    const first = new Blob(['first'], { type: 'text/plain' });
    const second = new Blob(['second'], { type: 'text/plain' });
    const third = new Blob(['<script>replacement()</script>'], { type: 'text/html' });
    const decode = vi.spyOn(second, 'text').mockReturnValue(pending.promise);
    const request = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second).mockResolvedValue(third);

    await withMounted(
        <RequestContext value={{ request }}>
            <RefreshableFile />
        </RequestContext>,
        async (output) => {
            await vi.waitFor(async () => {
                await act(async () => {});
                expect(output.querySelector('pre')?.textContent).toBe('first');
            });

            // Act
            const refresh = output.querySelector('button');
            if (!refresh) throw new Error('Missing refresh control');
            await act(async () => refresh.click());
            await vi.waitFor(async () => {
                await act(async () => {});
                expect(decode).toHaveBeenCalledTimes(1);
                expect(output.querySelector('pre')).toBeNull();
                expect(output.querySelector('[role="progressbar"]')).not.toBeNull();
            });
            await act(async () => refresh.click());
            await vi.waitFor(async () => {
                await act(async () => {});
                expect(output.querySelector('pre')?.textContent).toBe('<script>replacement()</script>');
            });
            await act(async () => pending.resolve('obsolete'));

            // Assert
            expect(output.querySelector('pre')?.textContent).toBe('<script>replacement()</script>');
            expect(output.querySelector('script, iframe, object, embed')).toBeNull();
        }
    );
});

it('preserves PDF pages on rename and same-Blob refresh, but disposes replaced and late decoders', async () => {
    // Arrange
    const first = new Blob(['first'], { type: 'application/pdf' });
    const second = new Blob(['second'], { type: 'application/pdf' });
    const third = new Blob(['third'], { type: 'application/pdf' });
    const pending = deferred<PDFDocumentProxy>();
    const latest = deferred<PDFDocumentProxy>();
    const document = { numPages: 3 } as PDFDocumentProxy;
    const replacement = { numPages: 1 } as PDFDocumentProxy;
    const destroy = [vi.fn(), vi.fn(), vi.fn()];
    const workers = [vi.fn(), vi.fn(), vi.fn()];
    const ports: Array<{ terminate: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal(
        'Worker',
        class {
            terminate = vi.fn();
            addEventListener = vi.fn();
            constructor() {
                ports.push(this);
            }
        }
    );
    vi.mocked(PDFWorker.create)
        .mockReturnValueOnce({ destroy: workers[0] } as unknown as ReturnType<typeof PDFWorker.create>)
        .mockReturnValueOnce({ destroy: workers[1] } as unknown as ReturnType<typeof PDFWorker.create>)
        .mockReturnValueOnce({ destroy: workers[2] } as unknown as ReturnType<typeof PDFWorker.create>);
    vi.mocked(getDocument)
        .mockReturnValueOnce({
            promise: Promise.resolve(document),
            destroy: destroy[0]
        } as unknown as PDFDocumentLoadingTask)
        .mockReturnValueOnce({ promise: pending.promise, destroy: destroy[1] } as unknown as PDFDocumentLoadingTask)
        .mockReturnValueOnce({ promise: latest.promise, destroy: destroy[2] } as unknown as PDFDocumentLoadingTask);
    const request = vi
        .fn()
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(second)
        .mockResolvedValue(third);

    try {
        await withMounted(
            <RequestContext value={{ request }}>
                <RefreshableFile />
            </RequestContext>,
            async (output) => {
                await vi.waitFor(async () => {
                    await act(async () => {});
                    expect(output.textContent).toContain('1 / 3');
                });
                const controls = Array.from(output.querySelectorAll('button'));
                const reload = controls.find((button) => button.textContent === 'Refresh');
                const rename = controls.find((button) => button.textContent === 'Rename');
                const next = output.querySelector<HTMLButtonElement>('[aria-label="Next page"]');
                if (!reload || !rename || !next) throw new Error('Missing file controls');

                // Act
                await act(async () => next.click());
                const page = output.querySelector('[role="group"]');
                await act(async () => rename.click());
                await act(async () => reload.click());
                await vi.waitFor(async () => {
                    await act(async () => {});
                    expect(request).toHaveBeenCalledTimes(2);
                });

                // Assert
                expect(output.textContent).toContain('2 / 3');
                expect(output.querySelector('[role="group"]')).toBe(page);
                expect(page?.getAttribute('aria-label')).toBe('Renamed report, page 2');
                expect(destroy[0]).not.toHaveBeenCalled();
                expect(ports).toHaveLength(1);

                // Act
                await act(async () => reload.click());
                await vi.waitFor(async () => {
                    await act(async () => {});
                    expect(ports).toHaveLength(2);
                    expect(output.querySelector('[role="group"]')).toBeNull();
                });
                expect(destroy[0]).toHaveBeenCalledTimes(1);
                expect(workers[0]).toHaveBeenCalledTimes(1);
                expect(ports[0].terminate).toHaveBeenCalledTimes(1);
                await act(async () => reload.click());
                await vi.waitFor(async () => {
                    await act(async () => {});
                    expect(ports).toHaveLength(3);
                });
                await act(async () => pending.resolve(document));

                // Assert
                expect(output.querySelector('[role="group"]')).toBeNull();
                expect(output.querySelector('[role="progressbar"]')).not.toBeNull();
                expect(destroy[1]).toHaveBeenCalledTimes(1);
                expect(workers[1]).toHaveBeenCalledTimes(1);
                expect(ports[1].terminate).toHaveBeenCalledTimes(1);
                await act(async () => latest.resolve(replacement));
                expect(output.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe(
                    'Renamed report, page 1'
                );
                expect(output.querySelector('[aria-label="Next page"]')).toBeNull();
            }
        );
        expect(destroy[2]).toHaveBeenCalledTimes(1);
        expect(workers[2]).toHaveBeenCalledTimes(1);
        expect(ports[2].terminate).toHaveBeenCalledTimes(1);
    } finally {
        vi.unstubAllGlobals();
        vi.mocked(getDocument).mockClear();
        vi.mocked(PDFWorker.create).mockReset();
    }
});
