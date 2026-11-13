// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { Image } from '@/components/custom/image';
import { renderStatic, withMounted } from '../../render';
import { FileRequestContext } from '@/components/custom/preview';

it('forwards native image attributes without allowing alternate network sources', () => {
    // Arrange
    const src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E';

    // Act
    const unsafe = { srcSet: 'https://untrusted.example/photo.png 2x', srcset: 'https://untrusted.example/photo.png' };

    const output = renderStatic(
        // @ts-expect-error Exercise alternate sources supplied by untyped View code.
        <Image {...unsafe} src={src} alt="Order preview" width={320} height={240} loading="lazy" decoding="async" />
    );

    // Assert
    expect(output.querySelector('img')?.getAttribute('src')).toBe(src);
    expect(output.querySelector('img')?.getAttribute('alt')).toBe('Order preview');
    expect(output.querySelector('img')?.getAttribute('width')).toBe('320');
    expect(output.querySelector('img')?.getAttribute('height')).toBe('240');
    expect(output.querySelector('img')?.getAttribute('loading')).toBe('lazy');
    expect(output.querySelector('img')?.getAttribute('decoding')).toBe('async');
    expect(output.querySelector('img')?.getAttribute('srcset')).toBeNull();
});

it('releases owned previews on source changes and ignores late responses', async () => {
    // Hold host responses independently so stale requests cannot overwrite the current photo.
    const pending = new Map<string, (blob: Blob) => void>();

    const files = {
        preview: (path: string) => new Promise<Blob>((resolve) => pending.set(path, resolve)),
        download: async () => undefined
    };

    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:last');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    function Photo() {
        const [src, setSrc] = useState('/first');

        return (
            <FileRequestContext value={files}>
                <button type="button" onClick={() => setSrc('/pending')}>
                    Pending
                </button>
                <button type="button" onClick={() => setSrc('/last')}>
                    Last
                </button>
                <Image src={src} alt="Shipment photo" />
            </FileRequestContext>
        );
    }

    try {
        await withMounted(<Photo />, async (output) => {
            expect(output.querySelector('img')).toBeNull();
            await act(async () => pending.get('/first')?.(new Blob(['first'], { type: 'image/png' })));
            expect(output.querySelector('img')?.getAttribute('src')).toBe('blob:first');

            await act(async () => output.querySelectorAll('button')[0]?.click());
            expect(output.querySelector('img')).toBeNull();
            expect(revoke).toHaveBeenCalledWith('blob:first');

            await act(async () => output.querySelectorAll('button')[1]?.click());
            await act(async () => pending.get('/last')?.(new Blob(['last'], { type: 'image/png' })));
            await act(async () => pending.get('/pending')?.(new Blob(['stale'], { type: 'image/png' })));

            expect(create).toHaveBeenCalledTimes(2);
            expect(output.querySelector('img')?.getAttribute('src')).toBe('blob:last');
        });

        expect(revoke.mock.calls).toEqual([['blob:first'], ['blob:last']]);
    } finally {
        create.mockRestore();
        revoke.mockRestore();
    }
});

it('never renders a remote source directly when the scoped host rejects it', async () => {
    // A URL-looking path still belongs to the host capability, not the browser network.
    const requests: string[] = [];

    const files = {
        preview: async (path: string) => {
            requests.push(path);
            throw new Error('Denied');
        },
        download: async () => undefined
    };

    await withMounted(
        <FileRequestContext value={files}>
            <Image src="https://untrusted.example/photo.png" alt="Photo" />
        </FileRequestContext>,
        async (output) => {
            expect(requests).toEqual(['https://untrusted.example/photo.png']);
            expect(output.querySelector('img')).toBeNull();
            expect(output.textContent).toContain('Photo unavailable');
        }
    );
});

it('recovers from an inline decode failure on source change without revoking caller URLs', async () => {
    // A failed image must not leave the next source stuck in its placeholder state.
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const onError = vi.fn();

    function Photo() {
        const [src, setSrc] = useState('blob:broken');

        return (
            <>
                <button type="button" onClick={() => setSrc('blob:replacement')}>
                    Replace
                </button>
                <Image src={src} alt="" onError={onError} />
            </>
        );
    }

    try {
        await withMounted(<Photo />, async (output) => {
            const image = output.querySelector('img');
            expect(image).not.toBeNull();

            if (!image) throw new Error('Missing inline image');
            expect(image.getAttribute('alt')).toBe('');

            await act(async () => image.dispatchEvent(new Event('error')));
            expect(output.querySelector('img')).toBeNull();
            expect(onError).toHaveBeenCalledTimes(1);
            expect(output.textContent).toContain('Photo unavailable');

            await act(async () => output.querySelector('button')?.click());
            expect(output.querySelector('img')?.getAttribute('src')).toBe('blob:replacement');
        });

        expect(revoke).not.toHaveBeenCalled();
    } finally {
        revoke.mockRestore();
    }
});

it('releases a scoped preview after a decode failure and reports the original image error', async () => {
    // A failed decode must still notify callers and release the host-owned URL on unmount.
    const files = { preview: async () => new Blob(['broken'], { type: 'image/png' }), download: async () => undefined };
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:broken-scoped');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const onError = vi.fn();

    try {
        await withMounted(
            <FileRequestContext value={files}>
                <Image src="/photo" alt="Shipment photo" ratio={1} onError={onError} />
            </FileRequestContext>,
            async (output) => {
                const image = output.querySelector('img');

                if (!image) throw new Error('Missing scoped image');

                await act(async () => image.dispatchEvent(new Event('error')));
                expect(onError.mock.calls[0]?.[0].target).toBe(image);
                expect(output.querySelector('img')).toBeNull();
                expect(output.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe(
                    'Shipment photo: Photo unavailable'
                );
            }
        );
        expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:broken-scoped');
    } finally {
        create.mockRestore();
        revoke.mockRestore();
    }
});
