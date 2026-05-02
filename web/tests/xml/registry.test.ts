import { describe, expect, it } from 'bun:test';
import { createContext, createRegistry } from '../../src/xml/registry';

describe('createContext', () => {
    it('builds default empty context', () => {
        expect(createContext()).toEqual({
            state: {},
            queries: {},
            scope: {},
            baseUrl: '',
        });
    });

    it('keeps provided partial values', () => {
        expect(
            createContext({
                scope: { item: 1 },
                baseUrl: '/api',
            })
        ).toEqual({
            state: {},
            queries: {},
            scope: { item: 1 },
            baseUrl: '/api',
        });
    });
});

describe('createRegistry', () => {
    it('merges defaults with custom components', () => {
        const Custom = () => null;
        const merged = createRegistry({ Custom });

        expect(merged.Custom).toBe(Custom);
        expect(merged.Page).toBeDefined();
    });

    it('lets custom components override defaults', () => {
        const OverridePage = () => null;
        const merged = createRegistry({ Page: OverridePage });

        expect(merged.Page).toBe(OverridePage);
    });
});
