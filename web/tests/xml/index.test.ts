import { describe, expect, it } from 'bun:test';
import { compileExpression, evaluate, fromXml, renderNode, RenderXML } from '../../src/xml';

describe('xml index', () => {
    it('re-exports the main xml runtime helpers', () => {
        expect(typeof compileExpression).toBe('function');
        expect(typeof evaluate).toBe('function');
        expect(typeof fromXml).toBe('function');
        expect(typeof renderNode).toBe('function');
        expect(RenderXML).toBeDefined();
    });
});
