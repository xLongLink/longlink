// @vitest-environment happy-dom
import { act, useState } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import { renderToStaticMarkup } from 'react-dom/server';
import { RequestContext } from '@/lib/view-capabilities';
import { Logo } from '@/components/longlink/display/logo';

it('keeps inline images hidden in server-rendered markup before hydration', () => {
    // Arrange
    const output = document.createElement('div');

    // Act
    output.innerHTML = renderToStaticMarkup(<Logo src="data:image/png;base64,broken" alt="Supplier" />);

    // Assert
    expect(output.querySelector('img')?.classList.contains('invisible')).toBe(true);
});

it.each(['table', 'detail'] as const)(
    'reveals only successfully loaded %s images and hides a new source until it loads',
    async (variant) => {
        // Arrange
        const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);

        function Supplier() {
            const [src, setSrc] = useState('blob:first');
            return (
                <>
                    <button type="button" onClick={() => setSrc('blob:broken')}>
                        Replace
                    </button>
                    <Logo src={src} alt="Supplier" variant={variant} />
                </>
            );
        }

        try {
            await withMounted(<Supplier />, async (output) => {
                const image = output.querySelector('img');
                if (!image) throw new Error('Missing supplier logo');
                expect(image.classList.contains('invisible')).toBe(true);
                expect(image.getAttribute('width')).toBe(variant === 'detail' ? '72' : '40');
                expect(image.getAttribute('height')).toBe(variant === 'detail' ? '72' : '40');
                expect(image.parentElement?.classList.contains(variant === 'detail' ? 'size-18' : 'size-10')).toBe(
                    true
                );
                expect(output.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Loading Supplier');

                // Act
                await act(async () => image.dispatchEvent(new Event('load')));

                // Assert
                expect(image.classList.contains('invisible')).toBe(false);
                expect(output.querySelector('[role="status"]')).toBeNull();

                // Act
                await act(async () => output.querySelector('button')?.click());

                // Assert
                const replacement = output.querySelector('img');
                if (!replacement) throw new Error('Missing replacement logo');
                expect(replacement.classList.contains('invisible')).toBe(true);
                expect(output.querySelector('[role="status"]')).not.toBeNull();

                // Act
                await act(async () => replacement.dispatchEvent(new Event('error')));

                // Assert
                expect(replacement.classList.contains('invisible')).toBe(true);
                expect(output.querySelector('img')).toBeNull();
                expect(output.querySelector('[role="status"]')).toBeNull();
                expect(output.querySelector('svg')?.getAttribute('aria-label')).toBe('Supplier: Logo unavailable');
                expect(
                    output
                        .querySelector('svg')
                        ?.parentElement?.classList.contains(variant === 'detail' ? 'size-18' : 'size-10')
                ).toBe(true);
            });
        } finally {
            complete.mockRestore();
        }
    }
);

it.each([undefined, null, '', '   '])(
    'renders an unavailable logo for missing source %s without requests',
    async (src) => {
        // Arrange
        const request = vi.fn(async () => new Blob());

        // Act
        await withMounted(
            <RequestContext value={request}>
                <Logo src={src} alt="Supplier" />
            </RequestContext>,
            async (output) => {
                // Assert
                const fallback = output.querySelector('svg');
                expect(fallback?.getAttribute('aria-label')).toBe('Supplier: Logo unavailable');
                expect(fallback?.parentElement?.classList.contains('size-10')).toBe(true);
                expect(output.querySelector('img')).toBeNull();
                expect(output.querySelector('[role="status"]')).toBeNull();
                expect(output.textContent).toBe('');
                expect(request).not.toHaveBeenCalled();
            }
        );
    }
);

it('keeps the fixed frame through loading, decode failure, recovery, and removal', async () => {
    // Arrange
    const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
    let resolve: ((body: Blob) => void) | undefined;
    const request = vi.fn(
        () =>
            new Promise<Blob>((done) => {
                resolve = done;
            })
    );
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:logo');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    function Supplier() {
        const [src, setSrc] = useState<string | undefined>('/logo');
        return (
            <RequestContext value={request}>
                <button type="button" onClick={() => setSrc('blob:replacement')}>
                    Replace
                </button>
                <button type="button" onClick={() => setSrc(undefined)}>
                    Remove
                </button>
                <Logo src={src} alt="Supplier" />
            </RequestContext>
        );
    }

    try {
        await withMounted(<Supplier />, async (output) => {
            const frame = output.querySelector('span');
            expect(frame?.classList.contains('size-10')).toBe(true);
            expect(frame?.classList.contains('rounded-lg')).toBe(true);
            expect(frame?.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Loading Supplier');

            // Act
            await act(async () => resolve?.(new Blob(['logo'], { type: 'image/svg+xml' })));
            await vi.waitFor(async () => {
                await act(async () => {});
                expect(frame?.querySelector('img')?.getAttribute('src')).toBe('blob:logo');
            });
            const image = frame?.querySelector('img');
            if (!image) throw new Error('Missing supplier logo');
            expect(image.classList.contains('invisible')).toBe(true);
            expect(frame?.querySelector('[role="status"]')).not.toBeNull();
            await act(async () => image.dispatchEvent(new Event('error')));

            // Assert
            expect(output.querySelector('svg')?.parentElement).toBe(frame);
            expect(output.querySelector('img')).toBeNull();
            expect(output.querySelector('[role="status"]')).toBeNull();
            expect(output.textContent).not.toContain('Photo unavailable');

            // Act
            await act(async () => output.querySelectorAll('button')[0]?.click());

            // Assert
            const replacement = output.querySelector('img');
            expect(replacement?.getAttribute('src')).toBe('blob:replacement');
            expect(replacement?.parentElement).toBe(frame);
            expect(replacement?.getAttribute('width')).toBe('40');
            expect(replacement?.getAttribute('height')).toBe('40');
            expect(replacement?.classList.contains('object-contain')).toBe(true);
            expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:logo');

            // Act
            await act(async () => output.querySelectorAll('button')[1]?.click());

            // Assert
            expect(output.querySelector('svg')?.parentElement).toBe(frame);
            expect(request).toHaveBeenCalledExactlyOnceWith('/logo', { binary: true });
        });
        expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:logo');
    } finally {
        complete.mockRestore();
        create.mockRestore();
        revoke.mockRestore();
    }
});

it('detects an image that failed before attachment and recovers with a new source', async () => {
    // Arrange
    const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    const naturalWidth = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0);
    const request = vi.fn(async () => new Blob());

    function Supplier() {
        const [src, setSrc] = useState('data:image/png;base64,broken');
        return (
            <RequestContext value={request}>
                <button type="button" onClick={() => setSrc('data:image/png;base64,AA==')}>
                    Replace
                </button>
                <Logo src={src} alt="Supplier" />
            </RequestContext>
        );
    }

    try {
        // Act
        await withMounted(<Supplier />, async (output) => {
            // Assert
            expect(output.querySelector('svg')?.getAttribute('aria-label')).toBe('Supplier: Logo unavailable');
            expect(output.querySelector('img')).toBeNull();

            // Act
            naturalWidth.mockReturnValue(40);
            await act(async () => output.querySelector('button')?.click());

            // Assert
            expect(output.querySelector('svg')).toBeNull();
            expect(output.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AA==');
            expect(output.querySelector('img')?.classList.contains('invisible')).toBe(false);
            expect(output.querySelector('[role="status"]')).toBeNull();
            expect(request).not.toHaveBeenCalled();
        });
    } finally {
        complete.mockRestore();
        naturalWidth.mockRestore();
    }
});

it.each(['denied', 'non-image', 'missing'] as const)(
    'uses an unavailable fallback for %s scoped files without exposing their contents',
    async (result) => {
        // Arrange
        const request = vi.fn(async () => {
            if (result === 'denied') throw new Error('Denied');
            return new Blob(['private attachment'], { type: 'text/html' });
        });

        // Act
        await withMounted(
            <RequestContext value={result === 'missing' ? null : request}>
                <Logo src="https://untrusted.example/logo.svg" alt="" />
            </RequestContext>,
            async (output) => {
                await vi.waitFor(async () => {
                    await act(async () => {});
                    expect(output.querySelector('svg:not([data-slot="spinner"])')).not.toBeNull();
                });

                // Assert
                expect(output.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
                expect(output.querySelector('img')).toBeNull();
                expect(output.querySelector('[role="status"]')).toBeNull();
                expect(output.textContent).toBe('');
                if (result === 'missing') expect(request).not.toHaveBeenCalled();
                else
                    expect(request).toHaveBeenCalledExactlyOnceWith('https://untrusted.example/logo.svg', {
                        binary: true
                    });
            }
        );
    }
);
