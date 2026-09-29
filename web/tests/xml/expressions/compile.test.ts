import { describe, expect, it } from 'vitest';
import { compileAttribute } from '@/xml/expressions/compile';

describe('compileAttribute', () => {
    it('rejects unclosed expression interpolation', () => {
        expect(() => compileAttribute('${name')).toThrow('Unclosed XML expression interpolation');
    });

    it('classifies a dollar-prefixed dotted path as a writable binding', () => {
        expect(compileAttribute('$form.value')).toEqual({ kind: 'path', parts: ['form', 'value'], isBinding: true });
    });

    it('classifies a dotted path without a dollar prefix as read-only', () => {
        expect(compileAttribute('form.value')).toEqual({ kind: 'path', parts: ['form', 'value'] });
    });

    it('keeps a single word without a dollar prefix as plain text', () => {
        expect(compileAttribute('name')).toEqual({ kind: 'text', value: 'name' });
    });

    it.each(['$', '$1bad', '1bad.value'])('keeps an invalid reference as plain text: %s', (value) => {
        // Act
        const attribute = compileAttribute(value);

        // Assert
        expect(attribute).toEqual({ kind: 'text', value });
    });

    it('compiles a whitespace-surrounded interpolation as a single expression', () => {
        expect(compileAttribute('  ${name}  ')).toMatchObject({
            kind: 'expression',
            node: { type: 'Identifier', name: 'name' },
        });
    });

    it('compiles mixed text and expression into interpolation segments', () => {
        expect(compileAttribute('Hello ${name}')).toMatchObject({
            kind: 'interpolation',
            segments: [
                { kind: 'text', value: 'Hello ' },
                { kind: 'expression', node: { type: 'Identifier', name: 'name' } },
            ],
        });
    });
});
