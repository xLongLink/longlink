// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { act, useRef, useState } from 'react';
import { renderStatic, withMounted } from '../../render';
import { Avatar } from '@/components/longlink/display/avatar';

it('recovers failed URLs to stable artwork and retries a newly supplied source', async () => {
    function Owner() {
        const [src, setSrc] = useState('https://images.example/first.png');
        const ref = useRef<HTMLSpanElement>(null);

        return (
            <>
                <Avatar
                    ref={ref}
                    id="owner-avatar"
                    tabIndex={0}
                    className="owner-avatar"
                    name="Acme"
                    shape="rounded"
                    src={src}
                />
                <button
                    onClick={() => {
                        setSrc('https://images.example/second.png');
                        ref.current?.focus();
                    }}
                >
                    Change source
                </button>
            </>
        );
    }

    const generated = renderStatic(<Avatar name="Acme" shape="rounded" />)
        .querySelector('img')
        ?.getAttribute('src');

    await withMounted(<Owner />, async (output) => {
        const image = output.querySelector('img');
        const root = output.querySelector('#owner-avatar');
        expect(image?.getAttribute('src')).toBe('https://images.example/first.png');
        expect(root?.classList.contains('owner-avatar')).toBe(true);
        await act(async () => image?.dispatchEvent(new Event('error')));
        expect(output.querySelector('img')?.getAttribute('src')).toBe(generated);
        await act(async () => output.querySelector('button')?.click());
        expect(output.querySelector('img')?.getAttribute('src')).toBe('https://images.example/second.png');
        expect(document.activeElement).toBe(root);
        await act(async () => output.querySelector('img')?.dispatchEvent(new Event('load')));
        expect(output.querySelector('img')?.hasAttribute('data-error')).toBe(false);
    });
});

it('uses the name for stable artwork and updates it when the name changes', async () => {
    function Owner() {
        const [name, setName] = useState('ACME Studio');

        return (
            <>
                <Avatar name={name} shape="rounded" />
                <Avatar name=" ACME Studio " shape="rounded" />
                <Avatar name="ACME Ink" shape="rounded" />
                <button onClick={() => setName('ACME Ink')}>Rename</button>
            </>
        );
    }

    await withMounted(<Owner />, async (output) => {
        const images = output.querySelectorAll('img');
        const studio = images[0]?.getAttribute('src');
        const ink = images[2]?.getAttribute('src');

        expect(studio).toMatch(/^data:image\/svg\+xml/);
        expect(ink).toMatch(/^data:image\/svg\+xml/);
        expect(studio).toBe(images[1]?.getAttribute('src'));
        expect(studio).not.toBe(ink);

        await act(async () => output.querySelector('button')?.click());

        expect(output.querySelector('img')?.getAttribute('src')).toBe(ink);
    });
});

it('retains geometry, generated artwork choice, and named versus decorative semantics', () => {
    const rounded = renderStatic(<Avatar name="Acme logo" shape="rounded" size="lg" />);

    const root = rounded.querySelector('[data-slot="avatar"]');
    expect(root?.getAttribute('aria-label')).toBe('Acme logo');
    expect(root?.getAttribute('data-size')).toBe('lg');
    expect(root?.classList.contains('rounded-lg')).toBe(true);
    const square = renderStatic(<Avatar name="Acme" shape="square" />);
    expect(square.querySelector('[data-slot="avatar"]')?.classList.contains('rounded-none')).toBe(true);
    expect(square.querySelector('img')?.getAttribute('src')).not.toBe(
        rounded.querySelector('img')?.getAttribute('src')
    );
    const decorative = renderStatic(<Avatar name="  " size="sm" />).querySelector('[data-slot="avatar"]');
    expect(decorative?.getAttribute('role')).toBe('presentation');
    expect(decorative?.getAttribute('aria-hidden')).toBe('true');
    expect(decorative?.getAttribute('data-size')).toBe('sm');
    const labelled = renderStatic(<Avatar aria-label="Account" />).querySelector('[data-slot="avatar"]');
    expect(labelled?.getAttribute('role')).toBe('img');
    expect(labelled?.hasAttribute('aria-hidden')).toBe(false);
});
