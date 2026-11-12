// @vitest-environment happy-dom
/* oxlint-disable anti-slop/no-shape-in-symbol-names -- The existing public avatar prop is named shape. */
import { it, expect } from 'vitest';
import { act, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { renderStatic, withMounted } from '../../render';

it('retains a caller-supplied image rather than replacing it with generated artwork', () => {
    // Act
    const output = renderStatic(<Avatar name="Acme" kind="organization" src="https://images.example/acme.png" />);

    // Assert
    expect(output.querySelector('img')?.getAttribute('src')).toBe('https://images.example/acme.png');
});

it('recovers failed URLs to stable artwork and retries a newly supplied source', async () => {
    function Owner() {
        const [src, setSrc] = useState('https://images.example/first.png');

        return (
            <>
                <Avatar name="Acme" seed="owner-1" src={src} />
                <button onClick={() => setSrc('https://images.example/second.png')}>Change source</button>
            </>
        );
    }

    const generated = renderStatic(<Avatar name="Renamed" seed="owner-1" />)
        .querySelector('img')
        ?.getAttribute('src');

    await withMounted(<Owner />, async (output) => {
        const image = output.querySelector('img');
        expect(image?.getAttribute('src')).toBe('https://images.example/first.png');
        await act(async () => image?.dispatchEvent(new Event('error')));
        expect(output.querySelector('img')?.getAttribute('src')).toBe(generated);
        await act(async () => output.querySelector('button')?.click());
        expect(output.querySelector('img')?.getAttribute('src')).toBe('https://images.example/second.png');
        await act(async () => output.querySelector('img')?.dispatchEvent(new Event('load')));
        expect(output.querySelector('img')?.hasAttribute('data-error')).toBe(false);
    });
});

it('retains geometry, generated artwork choice, and named versus decorative semantics', () => {
    const organization = renderStatic(
        <Avatar name="Acme" kind="organization" shape="square" size="lg" alt="Acme logo" />
    );

    const root = organization.querySelector('[data-slot="avatar"]');
    expect(root?.getAttribute('aria-label')).toBe('Acme logo');
    expect(root?.classList.contains('size-12')).toBe(true);
    expect(root?.classList.contains('rounded-(--radius-element)')).toBe(true);
    expect(organization.querySelector('img')?.getAttribute('src')).toBe(
        renderStatic(<Avatar name="Acme" shape="rounded" />)
            .querySelector('img')
            ?.getAttribute('src')
    );
    const decorative = renderStatic(<Avatar name="  " size="sm" />).querySelector('[data-slot="avatar"]');
    expect(decorative?.getAttribute('role')).toBe('presentation');
    expect(decorative?.getAttribute('aria-hidden')).toBe('true');
    expect(decorative?.classList.contains('size-6')).toBe(true);
});

it('falls back to initials if generated artwork also fails', async () => {
    await withMounted(<Avatar name="Jane Doe" />, async (output) => {
        await act(async () => output.querySelector('img')?.dispatchEvent(new Event('error')));
        expect(output.querySelector('img')).toBeNull();
        expect(output.querySelector('[data-slot="avatar-fallback"]')?.textContent).toBe('JD');
        expect(output.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Jane Doe');
    });
});

it('retries artwork when identity changes after a fallback failure', async () => {
    function Owner() {
        const [seed, setSeed] = useState('first-owner');

        return (
            <>
                <Avatar name="(👩‍💻) Doe" seed={seed} />
                <button onClick={() => setSeed('second-owner')}>Change owner</button>
            </>
        );
    }

    const generated = renderStatic(<Avatar seed="second-owner" />)
        .querySelector('img')
        ?.getAttribute('src');

    await withMounted(<Owner />, async (output) => {
        await act(async () => output.querySelector('img')?.dispatchEvent(new Event('error')));
        expect(output.querySelector('[data-slot="avatar-fallback"]')?.textContent).toBe('👩‍💻D');
        await act(async () => output.querySelector('button')?.click());
        expect(output.querySelector('img')?.getAttribute('src')).toBe(generated);
    });
});
