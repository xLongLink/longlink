// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import * as dicebear from '@dicebear/core';
import { act, useRef, useState } from 'react';
import { Avatar } from '@/components/longlink/display/avatar';

it('defers artwork until failure, uses the latest profile, and retries a newly supplied source', async () => {
    // Arrange
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

    const serialize = vi.spyOn(dicebear.Avatar.prototype, 'toDataUri');

    try {
        // Act
        await withMounted(<Owner />, async (output) => {
            const image = output.querySelector('img');
            const root = output.querySelector('#owner-avatar');
            const buttons = output.querySelectorAll('button');

            expect(image?.getAttribute('src')).toBe('https://images.example/first.png');
            expect(root?.getAttribute('aria-label')).toBe('ACME Studio');
            await act(async () => buttons[0]?.click());
            expect(output.querySelector('img')?.getAttribute('src')).toBe('https://images.example/first.png');
            expect(root?.getAttribute('aria-label')).toBe('ACME Ink');
            expect(serialize).not.toHaveBeenCalled();
            await act(async () => image?.dispatchEvent(new Event('error')));

            // Assert
            expect(serialize).toHaveBeenCalledOnce();
            expect(output.querySelector('img')?.getAttribute('src')).toMatch(/^data:image\/svg\+xml[;,]/);
            expect(root?.getAttribute('aria-label')).toBe('ACME Ink');
            expect(output.querySelector('img')).toBe(image);
            await act(async () => buttons[1]?.click());
            expect(output.querySelector('img')?.getAttribute('src')).toBe('https://images.example/second.png');
            expect(output.querySelector('img')).toBe(image);
            expect(document.activeElement).toBe(root);
        });
    } finally {
        serialize.mockRestore();
    }
});
