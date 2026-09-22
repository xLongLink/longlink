import { describe, expect, it } from 'vitest';
import { compileAttribute } from '@/xml/expressions/compile';

describe('compileAttribute', () => {
    it.each(['${name'])('rejects unclosed expression interpolation: %s', (value) => {
        expect(() => compileAttribute(value)).toThrow('Unclosed XML expression interpolation');
    });

    it('classifies a dollar-prefixed dotted path as a writable binding', () => {
        // Arrange
        const value = '$form.value';

        // Act
        const attribute = compileAttribute(value);

        // Assert
        expect(attribute).toEqual({ kind: 'path', parts: ['form', 'value'], isBinding: true });
    });

    it('classifies a dotted path without a dollar prefix as read-only', () => {
        // Arrange
        const value = 'form.value';

        // Act
        const attribute = compileAttribute(value);

        // Assert
        expect(attribute).toEqual({ kind: 'path', parts: ['form', 'value'] });
    });

    it('keeps a single word without a dollar prefix as plain text', () => {
        // Arrange
        const value = 'name';

        // Act
        const attribute = compileAttribute(value);

        // Assert
        expect(attribute).toEqual({ kind: 'text', value: 'name' });
    });

    it.each(['$', '$1bad', '1bad.value'])('keeps an invalid reference as plain text: %s', (value) => {
        // Arrange
        const input = value;

        // Act
        const attribute = compileAttribute(input);

        // Assert
        expect(attribute).toEqual({ kind: 'text', value });
    });

    it('compiles a whitespace-surrounded interpolation as a single expression', () => {
        // Arrange
        const value = '  ${name}  ';

        // Act
        const attribute = compileAttribute(value);

        // Assert
        expect(attribute.kind).toBe('expression');
    });

    it('compiles mixed text and expression into interpolation segments', () => {
        // Arrange
        const value = 'Hello ${name}';

        // Act
        const attribute = compileAttribute(value);

        // Assert
        expect(attribute.kind).toBe('interpolation');

        if (attribute.kind === 'interpolation') {
            expect(attribute.segments).toHaveLength(2);
            expect(attribute.segments[0]).toEqual({ kind: 'text', value: 'Hello ' });
            expect(attribute.segments[1].kind).toBe('expression');
        }
    });
});
