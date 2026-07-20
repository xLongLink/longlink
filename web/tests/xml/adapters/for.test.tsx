import { describe, expect, it } from 'bun:test';
import type { ASTNode, ExecutionContext } from '@/xml/types';
import { parseXML } from '@/xml/core/parser';
import { renderXmlToMarkup } from '../helpers';

describe('For', () => {
    /* Non-array results should render nothing instead of crashing. */
    it('returns null when each resolves to a non-array value', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {}, items: 'not-an-array' };
        const node: ASTNode = {
            name: 'For',
            params: { each: 'items', as: 'item' },
            children: [{ name: 'Text', params: { i18n: 'for.ignored' } }],
        };

        const output = renderXmlToMarkup([node], ctx);

        expect(output).toBe('<div></div>');
    });

    /* Loop children should keep access to the scoped item value. */
    it('renders children with the scoped item value', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            translations: { items: { name: '{{name}}' } },
            values: { items: [{ name: 'Alpha' }] },
        };
        const ast = parseXML(
            '<For each="$items" as="item"><Text i18n="items.name" values="${{ name: item.name }}" /></For>'
        );

        expect(renderXmlToMarkup(ast, ctx)).toContain('Alpha');
    });

    /* Missing loop parameters should be rejected immediately. */
    it('throws when each or as is missing', () => {
        const cases: Array<{ node: ASTNode; expectedError: string }> = [
            {
                node: { name: 'For', params: { as: 'item' } },
                expectedError: 'For requires an "each" parameter',
            },
            {
                node: { name: 'For', params: { each: '[]' } },
                expectedError: 'For requires an "as" parameter',
            },
        ];
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };

        for (const testCase of cases) {
            expect(() => renderXmlToMarkup([testCase.node], ctx)).toThrow(testCase.expectedError);
        }
    });
});
