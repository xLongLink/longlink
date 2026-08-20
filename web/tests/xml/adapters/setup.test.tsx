import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';
import { renderXmlToMarkup } from '../helpers';

describe('setup adapters', () => {
    it('renders setup validation errors', () => {
        const cases = [
            {
                xml: '<State id="filter" value="day"><Button>Ready</Button></State>',
                expectedError: 'State cannot have children',
            },
            {
                xml: '<State value="x" />',
                expectedError: 'State requires a string id',
            },
            {
                xml: '<Query id="user" path="/api/user"><Button>Ready</Button></Query>',
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
