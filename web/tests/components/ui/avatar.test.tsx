// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import * as dicebear from '@dicebear/core';
import { act, useRef, useState } from 'react';
import { renderStatic, withMounted } from '../../render';
import { Avatar } from '@/components/longlink/display/avatar';

it('defers artwork until failure, uses the latest profile, and retries a newly supplied source', async () => {
    function Owner() {
        const [src, setSrc] = useState('https://images.example/first.png');
        const [updated, setUpdated] = useState(false);
        const ref = useRef<HTMLSpanElement>(null);

        return (
            <>
                <Avatar
                    ref={ref}
                    id="owner-avatar"
                    tabIndex={0}
                    name={updated ? 'ACME Ink' : 'ACME Studio'}
                    shape={updated ? 'rounded' : 'circle'}
                    src={src}
                />
                <button onClick={() => setUpdated(true)}>Update profile</button>
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

    const generated = renderStatic(<Avatar name="ACME Ink" shape="rounded" />)
        .querySelector('img')
        ?.getAttribute('src');
    const serialize = vi.spyOn(dicebear.Avatar.prototype, 'toDataUri');

    try {
        await withMounted(<Owner />, async (output) => {
            const image = output.querySelector('img');
            const root = output.querySelector('#owner-avatar');
            const buttons = output.querySelectorAll('button');

            expect(image?.getAttribute('src')).toBe('https://images.example/first.png');
            await act(async () => buttons[0]?.click());
            expect(output.querySelector('img')?.getAttribute('src')).toBe('https://images.example/first.png');
            expect(serialize).not.toHaveBeenCalled();
            await act(async () => image?.dispatchEvent(new Event('error')));
            expect(serialize).toHaveBeenCalledOnce();
            expect(output.querySelector('img')?.getAttribute('src')).toBe(generated);
            await act(async () => buttons[1]?.click());
            expect(output.querySelector('img')?.getAttribute('src')).toBe('https://images.example/second.png');
            expect(document.activeElement).toBe(root);
        });
    } finally {
        serialize.mockRestore();
    }
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

it('retains named versus decorative semantics', () => {
    const rounded = renderStatic(<Avatar name="Acme logo" shape="rounded" size="lg" />);

    const root = rounded.querySelector('[data-slot="avatar"]');
    expect(root?.getAttribute('aria-label')).toBe('Acme logo');
    const decorative = renderStatic(<Avatar name="  " size="sm" />).querySelector('[data-slot="avatar"]');
    expect(decorative?.getAttribute('role')).toBe('presentation');
    expect(decorative?.getAttribute('aria-hidden')).toBe('true');
    const labelled = renderStatic(<Avatar aria-label="Account" />).querySelector('[data-slot="avatar"]');
    expect(labelled?.getAttribute('role')).toBe('img');
    expect(labelled?.hasAttribute('aria-hidden')).toBe(false);
});
