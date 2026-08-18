import { describe, expect, it } from 'vitest';
import { parseXML } from '@/xml/core/parser';
import { renderXmlToMarkup } from '../helpers';

describe('setup adapters', () => {
    it('renders setup validation errors', () => {
        const cases = [
            {
                xml: '<State id="filter" value="day"><Button label="Ready" /></State>',
                expectedError: 'State cannot have children',
            },
            {
                xml: '<State value="x" />',
                expectedError: 'State requires a string id',
            },
            {
                xml: '<Query id="user" path="/api/user"><Button label="Ready" /></Query>',
                expectedError: 'Query cannot have children',
            },
            {
                xml: '<Query path="/api/user" />',
                expectedError: 'Query requires a string id',
            },
        ];

        for (const testCase of cases) {
            expect(renderXmlToMarkup(parseXML(testCase.xml))).toContain(testCase.expectedError);
        }
    });
});
