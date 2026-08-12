import { describe, expect, it } from 'vitest';
import { renderNode } from '@/xml/runtimes/0.3/core/node';
import { compileProps } from '../helpers';

describe('renderNode', () => {
    it('rejects styling and event handler attributes on xml nodes', () => {
        const scope = { bindings: {} };
        const cases = [
            { name: 'className', expected: 'className is not supported in XML' },
            { name: 'onClick', expected: 'Event handler attribute "onClick" is not supported in XML' },
        ];

        for (const testCase of cases) {
            expect(() =>
                renderNode(
                    [{ name: 'Button', params: compileProps({ [testCase.name]: 'value' }), children: [] }],
                    scope
                )
            ).toThrow(testCase.expected);
        }
    });
});
