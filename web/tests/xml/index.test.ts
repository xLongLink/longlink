import { Column, Columns, compileExpression, evaluate, fromXml, renderNode } from '@xml';
import { describe, expect, it } from 'bun:test';

describe('xml index', () => {
    it('re-exports the main xml runtime helpers', () => {
        expect(typeof compileExpression).toBe('function');
        expect(typeof evaluate).toBe('function');
        expect(typeof fromXml).toBe('function');
        expect(typeof renderNode).toBe('function');
        expect(Column).toBeDefined();
        expect(Columns).toBeDefined();
    });
});
