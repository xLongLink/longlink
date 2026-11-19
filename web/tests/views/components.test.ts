import { it, expect } from 'vitest';
import * as components from '@/views';

it('exposes the authored View API without privileged host providers', () => {
    // Assert
    expect(components).toHaveProperty('Stack');
    expect(Object.hasOwn(components, 'Root')).toBe(false);
    expect(Object.hasOwn(components, 'FileRequestContext')).toBe(false);
    expect(Object.hasOwn(components, 'RequestContext')).toBe(false);
});
