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
            error: { issues: [{ path: ['method'], message: 'GET requests cannot send a body' }] }
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
            error: { issues: [{ path: ['form'], message: 'Choose JSON or form data' }] }
        });
    });

    it.each([{ headers: { Authorization: 'Bearer attacker' } }, { credentials: 'include' }, { redirect: 'follow' }])(
        'rejects sandbox-supplied host fetch options: %j',
        (options) => {
            // Arrange
            const command = { type: 'request', id: 0, path: '/items', method: 'POST', ...options };

            // Act
            const result = commandSchema.safeParse(command);

            // Assert
            expect(result.success).toBe(false);
        }
    );
});

describe('Solution download filename admission', () => {
    it.each(['report.csv', 'Résumé 2026.csv', 'x'.repeat(256)])('accepts a valid filename: %j', (filename) => {
        // Arrange
        const command = { type: 'download', id: 0, path: '/export', filename };

        // Act
        const parsed = commandSchema.parse(command);

        // Assert
        expect(parsed).toEqual(command);
    });

    it.each(['', '../report.csv', '..\\report.csv', 'report\n.csv', 'report\u0000.csv', 'x'.repeat(257)])(
        'rejects an invalid filename: %j',
        (filename) => {
            // Arrange
            const command = { type: 'download', id: 0, path: '/export', filename };

            // Act
            const result = commandSchema.safeParse(command);

            // Assert
            expect(result.success).toBe(false);
            expect(result.error?.issues.map((issue) => issue.path)).toContainEqual(['filename']);
        }
    );
});
