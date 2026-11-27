import { it, expect, vi } from 'vitest';
// @vitest-environment happy-dom
import { act, createRef, useState } from 'react';
import { renderStatic, withMounted } from '../../render';
import { RequestContext } from '@/lib/view-capabilities';
import { Image } from '@/components/longlink/display/image';

it('rejects alternate network sources supplied by untyped Views', () => {
    // Arrange
    const src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E';

    // Act
    const unsafe = { srcSet: 'https://untrusted.example/photo.png 2x', srcset: 'https://untrusted.example/photo.png' };

    const output = renderStatic(
        // @ts-expect-error Exercise alternate sources supplied by untyped View code.
        <Image {...unsafe} src={src} alt="Order preview" />
    );

    // Assert
    expect(output.querySelector('img')?.getAttribute('src')).toBe(src);
    expect(output.querySelector('img')?.getAttribute('srcset')).toBeNull();
});

it('keeps whitespace in scoped image paths rather than treating them as caller URLs', async () => {
    // Arrange
    const request = vi.fn(async () => new Blob(['not an image'], { type: 'text/plain' }));

    // Act
    await withMounted(
        <RequestContext value={request}>
            <Image src=" blob:caller-photo " alt="Photo" />
        </RequestContext>,
        async (output) => {
            await vi.waitFor(async () => {
                await act(async () => {});
                expect(output.textContent).toContain('Photo unavailable');
            });

            // Assert
            expect(request).toHaveBeenCalledExactlyOnceWith(' blob:caller-photo ', { binary: true });
            expect(output.querySelector('img')).toBeNull();
        }
    );
});

it('releases owned SVG previews on source changes and ignores late responses', async () => {
    // Arrange
    // Hold host responses independently so stale requests cannot overwrite the current photo.
    const pending = new Map<string, (blob: Blob) => void>();

    const request = (path: string) => new Promise<Blob>((resolve) => pending.set(path, resolve));

    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:last');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    function Photo() {
        const [src, setSrc] = useState('/first');

        return (
            <RequestContext value={request}>
                <button type="button" onClick={() => setSrc('/pending')}>
                    Pending
                </button>
                <button type="button" onClick={() => setSrc('/last')}>
                    Last
                </button>
                <Image src={src} alt="Shipment photo" />
            </RequestContext>
        );
    }

    try {
        await withMounted(<Photo />, async (output) => {
            // Act
            expect(output.querySelector('img')).toBeNull();
            await act(async () => pending.get('/first')?.(new Blob(['first'], { type: 'image/svg+xml' })));
            await vi.waitFor(async () => {
                await act(async () => {});
                expect(output.querySelector('img')?.getAttribute('src')).toBe('blob:first');
            });

            await act(async () => output.querySelectorAll('button')[0]?.click());
            expect(output.querySelector('img')).toBeNull();
            expect(revoke).toHaveBeenCalledWith('blob:first');

            await act(async () => output.querySelectorAll('button')[1]?.click());
            await act(async () => pending.get('/last')?.(new Blob(['last'], { type: 'image/svg+xml' })));
            await vi.waitFor(async () => {
                await act(async () => {});
                expect(output.querySelector('img')?.getAttribute('src')).toBe('blob:last');
            });
            await act(async () => pending.get('/pending')?.(new Blob(['stale'], { type: 'image/svg+xml' })));

            // Assert
            expect(create).toHaveBeenCalledTimes(2);
            expect(output.querySelector('img')?.getAttribute('src')).toBe('blob:last');
            expect(output.querySelector('svg, iframe, object, embed')).toBeNull();
        });

        expect(revoke.mock.calls).toEqual([['blob:first'], ['blob:last']]);
    } finally {
        create.mockRestore();
        revoke.mockRestore();
    }
});

it.each(['rejected', 'non-image', 'missing'] as const)(
    'keeps a %s scoped preview unavailable without exposing its source',
    async (result) => {
        // A URL-looking path still belongs to the host capability, not the browser network.
        const requests: string[] = [];

        const request = async (path: string) => {
            requests.push(path);
            if (result === 'rejected') throw new Error('Denied');

            return new Blob(['<script>private attachment</script>'], { type: 'text/html' });
        };

        await withMounted(
            <RequestContext value={result === 'missing' ? null : request}>
                <Image src="https://untrusted.example/photo.png" alt="Photo" />
            </RequestContext>,
            async (output) => {
                await vi.waitFor(async () => {
                    await act(async () => {});
                    expect(output.textContent).toContain('Photo unavailable');
                });
                expect(requests).toEqual(result === 'missing' ? [] : ['https://untrusted.example/photo.png']);
                expect(output.querySelector('img')).toBeNull();
                expect(output.querySelector('script')).toBeNull();
                expect(output.textContent).not.toContain('private attachment');
            }
        );
    }
);

it('recovers from an inline decode failure on source change without revoking caller URLs', async () => {
    // A failed image must not leave the next source stuck in its placeholder state.
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const onError = vi.fn();
    const request = vi.fn(async () => new Blob());

    function Photo() {
        const [src, setSrc] = useState('blob:broken');

        return (
            <RequestContext value={request}>
                <button type="button" onClick={() => setSrc('blob:replacement')}>
                    Replace
                </button>
                <Image src={src} alt="" onError={onError} />
            </RequestContext>
        );
    }

    try {
        await withMounted(<Photo />, async (output) => {
            const image = output.querySelector('img');

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
        expect(request).not.toHaveBeenCalled();
    } finally {
        revoke.mockRestore();
    }
});

it('recovers a scoped SVG preview after a decode failure and releases owned URLs', async () => {
    // Arrange
    const request = vi.fn(async () => new Blob(['image'], { type: 'image/svg+xml' }));

    const create = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValueOnce('blob:broken-scoped')
        .mockReturnValueOnce('blob:replacement');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const onError = vi.fn();
    const imageRef = createRef<HTMLImageElement>();

    function Photo() {
        const [src, setSrc] = useState('/photo');

        return (
            <RequestContext value={request}>
                <button type="button" onClick={() => setSrc('/replacement')}>
                    Replace
                </button>
                <Image src={src} alt="Shipment photo" ratio={1} onError={onError} ref={imageRef} />
            </RequestContext>
        );
    }

    try {
        await withMounted(<Photo />, async (output) => {
            await vi.waitFor(async () => {
                await act(async () => {});
                expect(output.querySelector('img')).not.toBeNull();
            });
            const image = output.querySelector('img');

            if (!image) throw new Error('Missing scoped image');
            expect(imageRef.current).toBe(image);

            // Act
            await act(async () => image.dispatchEvent(new Event('error')));
            // Assert
            expect(onError.mock.calls[0]?.[0].target).toBe(image);
            expect(output.querySelector('img')).toBeNull();
            expect(imageRef.current).toBeNull();
            expect(output.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe(
                'Shipment photo: Photo unavailable'
            );
            // Act
            await act(async () => output.querySelector('button')?.click());
            await vi.waitFor(async () => {
                await act(async () => {});
                expect(output.querySelector('img')?.getAttribute('src')).toBe('blob:replacement');
            });
            // Assert
            expect(imageRef.current).toBe(output.querySelector('img'));
            expect(request).toHaveBeenLastCalledWith('/replacement', { binary: true });
            expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:broken-scoped');
            expect(output.querySelector('svg, iframe, object, embed')).toBeNull();
        });
        expect(revoke.mock.calls).toEqual([['blob:broken-scoped'], ['blob:replacement']]);
    } finally {
        create.mockRestore();
        revoke.mockRestore();
    }
});
