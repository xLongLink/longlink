// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import { Stack } from '@/components/longlink/layout/stack';

it('preserves semantic elements and zero spacing overrides', () => {
    const output = renderStatic(
        <Stack as="section" gap={0} padding={4} paddingInline={0}>
            Sized
        </Stack>
    );

    const sized = output.querySelector('section');

    if (!sized) throw new Error('Expected native layout container');

    expect(sized.style.gap).toBe('calc(var(--spacing) * 0)');
    expect(sized.style.paddingInline).toBe('calc(var(--spacing) * 0)');
    expect(sized.style.paddingBlock).toBe('calc(var(--spacing) * 4)');
});
