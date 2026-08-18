import { describe, expect, it } from 'vitest';
import { parseXML } from '@/xml/core/parser';

describe('parseXML', () => {
    it('rejects styling and event handler attributes on xml nodes', () => {
        const cases = [
            { name: 'className', expected: 'className is not supported in XML' },
            { name: 'onClick', expected: 'Event handler attribute "onClick" is not supported in XML' },
        ];

        for (const testCase of cases) {
            expect(() => parseXML(`<Button ${testCase.name}="value" />`)).toThrow(testCase.expected);
        }
    });
});
