import { xmlComponentRegistry } from '@xml/core/registry';
import { describe, expect, it } from 'bun:test';

describe('xmlComponentRegistry', () => {
    it('registers representative XML render tags', () => {
        expect(xmlComponentRegistry).toHaveProperty('longlink');
        expect(xmlComponentRegistry).toHaveProperty('P');
        expect(xmlComponentRegistry).toHaveProperty('Button');
        expect(xmlComponentRegistry).toHaveProperty('Input');
        expect(xmlComponentRegistry).toHaveProperty('DataTable');
    });

    it('keeps setup-only tags out of the render registry', () => {
        expect(xmlComponentRegistry).not.toHaveProperty('For');
        expect(xmlComponentRegistry).not.toHaveProperty('Query');
        expect(xmlComponentRegistry).not.toHaveProperty('State');
    });
});
