import { describe, expect, it } from 'vitest';
import { commandSchema, MAX_MESSAGE_SIZE, messageSize } from '@/views/protocol';

describe('request command admission', () => {
    it.each([
        { name: 'exactly at the limit', extraBytes: 0 },
        { name: 'one byte over the limit', extraBytes: 1 },
    ])('measures a schema-valid Blob form $name', ({ extraBytes }) => {
        // Arrange: four characters for null, ten for title/Issue, and six for upload count toward the limit.
        const blob = new Blob([new Uint8Array(MAX_MESSAGE_SIZE - 20 + extraBytes)], { type: 'application/pdf' });
        const command = {
            type: 'request',
            id: 1,
            path: '/items',
            method: 'POST',
            form: [
                ['title', 'Issue'],
                ['upload', blob],
            ],
        };

        // Act
        const parsed = commandSchema.parse(command);
        if (parsed.type !== 'request') throw new Error('Expected a request command');
        const size = messageSize(parsed);

        // Assert
        expect(parsed).toEqual(command);
        expect(parsed.form?.[1]?.[1]).toBe(blob);
        expect(size).toBe(MAX_MESSAGE_SIZE + extraBytes);
    });

    it.each([
        { name: 'bodyless GET', body: { method: 'GET' } },
        { name: 'JSON POST', body: { method: 'POST', json: { title: 'Issue' } } },
        { name: 'form POST', body: { method: 'POST', form: [['title', 'Issue']] } },
    ])('accepts $name', ({ body }) => {
        // Arrange
        const command = { type: 'request', id: 1, path: '/items', ...body };

        // Act
        const parsed = commandSchema.parse(command);

        // Assert
        expect(parsed).toEqual(command);
    });

    it('rejects simultaneous JSON and form bodies', () => {
        // Arrange
        const command = {
            type: 'request',
            id: 1,
            path: '/items',
            method: 'POST',
            json: { title: 'Issue' },
            form: [['title', 'Issue']],
        };

        // Act
        const result = commandSchema.safeParse(command);

        // Assert
        expect(result).toMatchObject({
            success: false,
            error: { issues: [{ code: 'custom', path: ['form'], message: 'Choose JSON or form data' }] },
        });
    });

    it.each([
        { name: 'JSON', body: { json: { title: 'Issue' } } },
        { name: 'form', body: { form: [['title', 'Issue']] } },
    ])('rejects a GET with a $name body', ({ body }) => {
        // Arrange
        const command = { type: 'request', id: 1, path: '/items', method: 'GET', ...body };

        // Act
        const result = commandSchema.safeParse(command);

        // Assert
        expect(result).toMatchObject({
            success: false,
            error: { issues: [{ code: 'custom', path: ['method'], message: 'GET requests cannot send a body' }] },
        });
    });

    it.each([
        { field: 'headers', value: { Authorization: 'Bearer untrusted' } },
        { field: 'credentials', value: 'include' },
    ])('rejects caller-controlled $field', ({ field, value }) => {
        // Arrange
        const command = { type: 'request', id: 1, path: '/items', method: 'GET', [field]: value };

        // Act
        const result = commandSchema.safeParse(command);

        // Assert
        expect(result).toMatchObject({
            success: false,
            error: { issues: [{ code: 'unrecognized_keys', path: [], keys: [field] }] },
        });
    });
});
