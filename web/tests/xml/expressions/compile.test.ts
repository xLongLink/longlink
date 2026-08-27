import { describe, expect, it } from 'vitest';
import { compileAttribute } from '@/xml/expressions/compile';

describe('compileAttribute', () => {
    it.each(['${name', 'Hello ${name'])('rejects unclosed expression interpolation: %s', (value) => {
        expect(() => compileAttribute(value)).toThrow('Unclosed XML expression interpolation');
    });
});
