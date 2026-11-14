// @vitest-environment happy-dom
import { createRef } from 'react';
import { it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { NativeStack } from '@/components/custom/native-stack';

it('preserves native spacing defaults, zero overrides, and pixel sizing during Stack migration', () => {
    const output = renderStatic(
        <>
            <NativeStack className="p-6">Default</NativeStack>
            <NativeStack
                as="section"
                gap={0}
                padding={4}
                paddingInline={0}
                width={320}
                minHeight="100vh"
                style={{ width: 640 }}
            >
                Sized
            </NativeStack>
        </>
    );

    const plain = output.querySelector<HTMLElement>('.p-6');
    const sized = output.querySelector('section');

    if (!plain || !sized) throw new Error('Expected native layout containers');

    expect(plain.style.gap).toBe('');
    expect(plain.style.paddingInline).toBe('');
    expect(plain.style.paddingBlock).toBe('');
    expect(sized.style.gap).toBe('calc(var(--spacing) * 0)');
    expect(sized.style.paddingInline).toBe('calc(var(--spacing) * 0)');
    expect(sized.style.paddingBlock).toBe('calc(var(--spacing) * 4)');
    expect(sized.style.width).toBe('640px');
    expect(sized.style.minHeight).toBe('100vh');
});

it('keeps preview reset capture and native element refs working through the layout boundary', async () => {
    const ref = createRef<HTMLElement>();
    const user = userEvent.setup();
    let resets = 0;

    await withMounted(
        <NativeStack as="section" ref={ref} aria-label="Preview" onResetCapture={() => resets++}>
            <form>
                <button type="reset">Reset preview</button>
            </form>
        </NativeStack>,
        async (output) => {
            expect(ref.current).toBe(output.querySelector('section'));
            expect(ref.current?.getAttribute('aria-label')).toBe('Preview');

            const reset = output.querySelector('button');

            if (!reset) throw new Error('Expected preview reset');

            await user.click(reset);
            expect(resets).toBe(1);
        }
    );

    expect(ref.current).toBeNull();
});
