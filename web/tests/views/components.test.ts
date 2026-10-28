import { it, expect } from 'vitest';
import * as components from '@/views/components';

it('exposes the authored View API without privileged host providers', () => {
    // Assert
    expect(components).toHaveProperty('Form');
    expect(components).toHaveProperty('Stack');
    expect(Object.hasOwn(components, 'Root')).toBe(false);
    expect(Object.hasOwn(components, 'FileRequestContext')).toBe(false);
    expect(Object.hasOwn(components, 'FormRequestContext')).toBe(false);
});
