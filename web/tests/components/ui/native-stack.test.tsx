// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
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
