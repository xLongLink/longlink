import { it, expect } from 'vitest';
import * as components from '@/views';
import { Card } from '@/components/longlink/layout/card';

it('exposes one Card API without separate compound parts or an interactive variant', () => {
    expect(components.Card).toBe(Card);
    expect(Object.hasOwn(components, 'CardHeader')).toBe(false);
    expect(Object.hasOwn(components, 'CardFooter')).toBe(false);
    expect(Object.hasOwn(components, 'InteractiveCard')).toBe(false);
});

it('exposes the authored View API without privileged host providers', () => {
    // Assert
    expect(components).toHaveProperty('Stack');
    expect(Object.hasOwn(components, 'Root')).toBe(false);
    expect(Object.hasOwn(components, 'FileRequestContext')).toBe(false);
    expect(Object.hasOwn(components, 'FormRequestContext')).toBe(false);
    expect(Object.hasOwn(components, 'ViewRequestContext')).toBe(false);
});
