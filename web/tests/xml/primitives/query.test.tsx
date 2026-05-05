import { xmlToAST } from '@/xml/compiler';
import { Query } from '@/xml/react/Query';
import { describe, expect, it } from 'bun:test';

describe('Query', () => {
    /* The compiler should preserve query attributes and nested content. */
    it('compiles query xml into a query ast node', () => {
        expect(xmlToAST('<Query id="user" path="/api/user"><p>Ready</p></Query>')).toEqual([
            {
                name: 'Query',
                params: { id: 'user', path: '/api/user' },
                children: [{ name: 'p', children: [{ name: 'text', value: 'Ready' }] }],
            },
        ]);
    });

    /* Query should reject missing ids so invalid XML fails fast. */
    it('throws when id is missing', () => {
        expect(() => Query({ path: '/api/user', children: null })).toThrow('Query requires an "id" parameter');
    });
});
