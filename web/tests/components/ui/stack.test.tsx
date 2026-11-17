// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import { Stack } from '@/components/longlink/layout/stack';

it('preserves semantic elements, default spacing, and zero overrides after consolidating Stack', () => {
    const output = renderStatic(
        <>
            <Stack className="p-6">Default</Stack>
            <Stack as="section" gap={0} padding={4} paddingInline={0}>
                Sized
            </Stack>
        </>
    );

    const plain = output.querySelector<HTMLElement>('.p-6');
    const sized = output.querySelector('section');

    if (!plain || !sized) throw new Error('Expected native layout containers');

    expect(plain.style.gap).toBe('');
    expect(plain.classList.contains('gap-3')).toBe(true);
    expect(plain.style.paddingInline).toBe('');
    expect(plain.style.paddingBlock).toBe('');
    expect(sized.style.gap).toBe('calc(var(--spacing) * 0)');
    expect(sized.style.paddingInline).toBe('calc(var(--spacing) * 0)');
    expect(sized.style.paddingBlock).toBe('calc(var(--spacing) * 4)');
});
