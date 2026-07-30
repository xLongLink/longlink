import { describe, expect, it } from 'vitest';
import { renderNode } from '@/xml/core/node';
import type { ExecutionContext } from '@/xml/types';

describe('renderNode', () => {
    it('rejects styling and event handler attributes on xml nodes', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const cases = [
            { name: 'className', expected: 'className is not supported in XML' },
            { name: 'style', expected: 'style is not supported in XML' },
            { name: 'xstyle', expected: 'xstyle is not supported in XML' },
            { name: 'onClick', expected: 'Event handler attribute "onClick" is not supported in XML' },
        ];

        for (const testCase of cases) {
            expect(() => renderNode([{ name: 'Button', params: { [testCase.name]: 'value' } }], ctx)).toThrow(
                testCase.expected
            );
        }
    });
});
