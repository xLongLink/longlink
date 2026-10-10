import { describe, expect, it } from 'vitest';
import { commandSchema } from '@/views/protocol';

describe('Solution request body admission', () => {
    it.each([{ method: 'GET' }, { method: 'POST', json: null }, { method: 'POST', form: [] }])(
        'accepts a valid request: %j',
        (request) => {
            // Arrange
            const command = { type: 'request', id: 0, path: '/items', ...request };

            // Act
            const parsed = commandSchema.parse(command);

            // Assert
            expect(parsed).toEqual(command);
        }
    );

    it.each([{ json: null }, { form: [] }])('rejects an explicit GET body: %j', (body) => {
        // Arrange
        const command = { type: 'request', id: 0, path: '/items', method: 'GET', ...body };

        // Act
        const result = commandSchema.safeParse(command);

        // Assert
        expect(result).toMatchObject({
            success: false,
            error: { issues: [{ path: ['method'], message: 'GET requests cannot send a body' }] },
        });
    });

    it('rejects simultaneous JSON and form bodies even when both are empty', () => {
        // Arrange
        const command = { type: 'request', id: 0, path: '/items', method: 'POST', json: null, form: [] };

        // Act
        const result = commandSchema.safeParse(command);

        // Assert
        expect(result).toMatchObject({
            success: false,
            error: { issues: [{ path: ['form'], message: 'Choose JSON or form data' }] },
        });
    });
});
