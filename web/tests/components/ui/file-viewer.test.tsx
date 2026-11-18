// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import { FileRequestContext } from '@/components/custom/preview';
import { FileViewer } from '@/components/longlink/display/file-viewer';

it.each(['missing', 'rejected'] as const)('reports a %s file capability without remaining pending', async (result) => {
    // Arrange
    const files = {
        load: async () => {
            throw new Error('File request denied');
        },
        preview: async () => undefined,
        download: async () => undefined
    };

    // Act
    await withMounted(
        <FileRequestContext value={result === 'missing' ? null : files}>
            <FileViewer src="/api/report" title="Report" />
        </FileRequestContext>,
        async (output) => {
            // Assert
            expect(output.querySelector('[role="status"]')?.textContent).toBe(
                result === 'missing' ? 'File preview unavailable' : 'File request denied'
            );
            expect(output.querySelector('[role="progressbar"], img, iframe, object, embed')).toBeNull();
        }
    );
});

it('displays an image immediately without custom preview or download actions', async () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:image');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    try {
        await withMounted(
            <FileRequestContext
                value={{
                    load: async () => new Blob(['image'], { type: 'image/png' }),
                    preview: async () => {
                        throw new Error('Native viewers must not open a host preview');
                    },
                    download: async () => {
                        throw new Error('Viewing must not download');
                    }
                }}
            >
                <FileViewer src="/api/image" title="Invoice" />
            </FileRequestContext>,
            async (output) => {
                expect(output.querySelector('img')?.getAttribute('src')).toBe('blob:image');
                expect(output.querySelector('img')?.alt).toBe('Invoice');
                expect(output.querySelector('button')).toBeNull();
            }
        );
        expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:image');
    } finally {
        create.mockRestore();
        revoke.mockRestore();
    }
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
            <FileRequestContext
                value={{
                    load,
                    preview: async () => {
                        throw new Error('Native viewers must not open a host preview');
                    },
                    download: async () => undefined
                }}
            >
                <Example />
            </FileRequestContext>,
            async (output) => {
                const image = output.querySelector('img');

                if (!image) throw new Error('Missing loaded image');

                expect(image.getAttribute('src')).toBe('blob:image');
                await act(async () => output.querySelector('button')?.click());
                expect(output.querySelector('img')).toBe(image);
                expect(image.alt).toBe('Updated invoice');
                expect(output.querySelector('[aria-label="Updated invoice"]')).not.toBeNull();
                expect(load).toHaveBeenCalledExactlyOnceWith('/api/image');
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
            <FileRequestContext
                value={{
                    load: async (path) => (path === '/api/first' ? first : new Blob(['new'], { type: 'image/png' })),
                    preview: async () => {
                        throw new Error('Native viewers must not open a host preview');
                    },
                    download: async () => undefined
                }}
            >
                <Example />
            </FileRequestContext>,
            async (output) => {
                expect(output.querySelector('[role="progressbar"]')).not.toBeNull();
                await act(async () => output.querySelector('button')?.click());
                expect(output.querySelector('img')?.getAttribute('src')).toBe('blob:replacement');
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
                <FileRequestContext
                    value={{
                        load: async () => body,
                        preview: async () => {
                            throw new Error('Native viewers must not open a host preview');
                        },
                        download: async () => undefined
                    }}
                >
                    <FileViewer src="/api/report" title="Report" />
                </FileRequestContext>,
                async (output) => {
                    await vi.waitFor(() =>
                        expect(output.querySelector('pre')?.textContent).toBe('<script>active()</script>')
                    );
                    expect(output.querySelector('iframe, script, object, embed, button')).toBeNull();
                    expect(create).not.toHaveBeenCalled();
                }
            );
        }
    } finally {
        create.mockRestore();
    }
});

it.each(['application/octet-stream', 'image/svg+xml'])(
    'does not embed or interpret unsupported %s files',
    async (type) => {
        const create = vi.spyOn(URL, 'createObjectURL');

        try {
            await withMounted(
                <FileRequestContext
                    value={{
                        load: async () => new Blob(['<script>active()</script>'], { type }),
                        preview: async () => {
                            throw new Error('Native viewers must not open a host preview');
                        },
                        download: async () => undefined
                    }}
                >
                    <FileViewer src="/api/file" title="Attachment" />
                </FileRequestContext>,
                async (output) => {
                    expect(output.querySelector('[role="status"]')?.textContent).toContain('Preview unavailable');
                    expect(output.querySelector('img, script, iframe, object, embed')).toBeNull();
                    expect(create).not.toHaveBeenCalled();
                }
            );
        } finally {
            create.mockRestore();
        }
    }
);
