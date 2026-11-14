// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import { FileViewer } from '@/components/custom/file-viewer';
import { FileRequestContext } from '@/components/custom/preview';

it('displays an image immediately without custom preview or download actions', async () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:image');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    try {
        await withMounted(
            <FileRequestContext
                value={{
                    preview: async () => new Blob(['image'], { type: 'image/png' }),
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
                    preview: async (path) => (path === '/api/first' ? first : new Blob(['new'], { type: 'image/png' })),
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

it('displays PDFs natively and retypes active text documents before embedding', async () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:document');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    try {
        for (const type of ['application/pdf', 'text/html']) {
            const body = new Blob(['<script>active()</script>'], { type });
            await withMounted(
                <FileRequestContext value={{ preview: async () => body, download: async () => undefined }}>
                    <FileViewer src="/api/report" title="Report" />
                </FileRequestContext>,
                async (output) => {
                    const frame = output.querySelector('iframe');
                    expect(frame?.getAttribute('src')).toBe('blob:document');
                    expect(frame?.title).toBe('Report');
                    const served = create.mock.lastCall?.[0];
                    expect(served).toBeInstanceOf(Blob);

                    if (!(served instanceof Blob)) throw new Error('Expected document bytes');
                    expect(served.type).toBe(
                        type === 'application/pdf' ? 'application/pdf' : 'text/plain;charset=utf-8'
                    );

                    if (type === 'text/html') expect(frame?.getAttribute('sandbox')).toBe('');
                    expect(output.querySelector('script, object, embed, button')).toBeNull();
                }
            );
        }
    } finally {
        create.mockRestore();
        revoke.mockRestore();
    }
});

it('does not embed unknown binary files or interpret their content', async () => {
    const create = vi.spyOn(URL, 'createObjectURL');

    try {
        await withMounted(
            <FileRequestContext
                value={{
                    preview: async () => new Blob(['<script>active()</script>'], { type: 'application/octet-stream' }),
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
});
