// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import { FileViewer } from '@/components/custom/FileViewer';
import { FileRequestContext } from '@/components/custom/preview';

it('sanitizes display names before requesting a scoped download', async () => {
    // Arrange
    const downloads: [string, string][] = [];

    const files = {
        preview: async () => new Blob(),
        download: async (path: string, name: string) => {
            downloads.push([path, name]);
        }
    };

    // Act
    await withMounted(
        <FileRequestContext value={files}>
            <FileViewer src="/api/invoice" title="reports/invoice.pdf" />
        </FileRequestContext>,
        async (output) => {
            const download = [...output.querySelectorAll('button')].find((button) =>
                button.textContent?.includes('Download')
            );

            await act(async () => download?.click());

            // Assert
            expect(downloads).toEqual([['/api/invoice', 'reports_invoice.pdf']]);
        }
    );
});

it('cancels a pending preview and releases only the image URL from a reopened attempt', async () => {
    const user = userEvent.setup();
    let finish: (value: Blob) => void = () => undefined;

    const first = new Promise<Blob>((resolve) => {
        finish = resolve;
    });

    let requests = 0;
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:reopened');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    try {
        await withMounted(
            <FileRequestContext
                value={{
                    preview: async () => (++requests === 1 ? first : new Blob(['image'], { type: 'image/png' })),
                    download: async () => undefined
                }}
            >
                <FileViewer src="/api/image" title="Image" />
            </FileRequestContext>,
            async (output) => {
                const preview = output.querySelector<HTMLButtonElement>('button');

                if (!preview) throw new Error('Expected preview action');
                await act(async () => user.click(preview));
                expect(output.querySelector('[role="progressbar"]')).not.toBeNull();
                expect(output.textContent).toContain('Loading attachment');
                await act(async () => user.click(preview));
                await act(async () => {
                    finish(new Blob(['stale'], { type: 'image/png' }));
                    await first;
                });
                expect(output.querySelector('img, [role="progressbar"]')).toBeNull();
                expect(create).not.toHaveBeenCalled();
                await act(async () => user.click(preview));
                expect(output.querySelector('img')?.getAttribute('src')).toBe('blob:reopened');
                expect(output.querySelector('img')?.alt).toBe('Image');
                expect(output.querySelector('[role="progressbar"]')).toBeNull();
                await act(async () => user.click(preview));
                expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:reopened');
            }
        );
    } finally {
        create.mockRestore();
        revoke.mockRestore();
    }
});

it('recovers from a failed preview and closes after the host opens a document', async () => {
    const user = userEvent.setup();
    const requests: [string, string | undefined][] = [];

    await withMounted(
        <FileRequestContext
            value={{
                preview: async (path, title) => {
                    requests.push([path, title]);

                    if (requests.length === 1) throw new Error('File unavailable');

                    return null;
                },
                download: async () => {
                    throw new Error('Preview must not download');
                }
            }}
        >
            <FileViewer src="/api/report" title="report.pdf" />
        </FileRequestContext>,
        async (output) => {
            const preview = output.querySelector<HTMLButtonElement>('button');

            if (!preview) throw new Error('Expected preview action');
            await act(async () => user.click(preview));
            expect([...output.querySelectorAll('[role="status"]')].map((status) => status.textContent)).toContain(
                'File unavailable'
            );
            await act(async () => user.click(preview));
            await act(async () => user.click(preview));
            expect(requests).toEqual([
                ['/api/report', 'report.pdf'],
                ['/api/report', 'report.pdf']
            ]);
            expect(output.querySelector('img, [role="progressbar"]')).toBeNull();
            expect(output.textContent).not.toContain('File unavailable');
        }
    );
});

it('removes a prior image while a replacement loads and never renders active document bytes', async () => {
    const user = userEvent.setup();
    let finish: (value: Blob) => void = () => undefined;

    const replacement = new Promise<Blob>((resolve) => {
        finish = resolve;
    });

    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:first-image');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    function Preview() {
        const [src, setSource] = useState('/api/image');

        return (
            <>
                <FileViewer src={src} title="Attachment" />
                <button type="button" onClick={() => setSource('/api/document')}>
                    Change attachment
                </button>
            </>
        );
    }

    try {
        await withMounted(
            <FileRequestContext
                value={{
                    preview: async (path) =>
                        path === '/api/image' ? new Blob(['image'], { type: 'image/png' }) : replacement,
                    download: async () => undefined
                }}
            >
                <Preview />
            </FileRequestContext>,
            async (output) => {
                const buttons = output.querySelectorAll('button');
                await act(async () => user.click(buttons[0]));
                expect(output.querySelector('img')).not.toBeNull();
                await act(async () => user.click(buttons[2]));
                expect(output.querySelector('img')).toBeNull();
                expect(output.querySelector('[role="progressbar"]')).not.toBeNull();
                expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:first-image');
                await act(async () => {
                    finish(new Blob(['<script>active()</script>'], { type: 'text/html' }));
                    await replacement;
                });
                expect([...output.querySelectorAll('[role="status"]')].map((status) => status.textContent)).toContain(
                    'No preview is available. Use Download to save this file.'
                );
                expect(output.querySelector('img, script, iframe, object, embed')).toBeNull();
                expect(create).toHaveBeenCalledTimes(1);
            }
        );
    } finally {
        create.mockRestore();
        revoke.mockRestore();
    }
});
