import { describe, expect, it } from 'vitest';
import type { XmlRuntime } from '@/xml/runtimes/0.3/types';
import { renderNode } from '@/xml/runtimes/0.3/core/node';
import { compileProps } from '../helpers';

describe('renderNode', () => {
    it('rejects styling and event handler attributes on xml nodes', () => {
        const ctx: XmlRuntime = {
            scope: { bindings: {} },
            services: { invalidate: async () => {}, navigationBaseUrl: '', requestBaseUrl: '', setups: {} },
        };
        const cases = [
            { name: 'className', expected: 'className is not supported in XML' },
            { name: 'onClick', expected: 'Event handler attribute "onClick" is not supported in XML' },
        ];

        for (const testCase of cases) {
            expect(() =>
                renderNode(
                    [{ name: 'Button', params: compileProps({ [testCase.name]: 'value' }), children: [] }],
                    ctx.scope
                )
            ).toThrow(testCase.expected);
        }
    });
});
