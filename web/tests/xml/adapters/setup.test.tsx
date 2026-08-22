import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';
import { renderXmlToMarkup } from '../helpers';

describe('setup adapters', () => {
    it.each([
        ['<State id="filter" value="day"><Button>Ready</Button></State>', 'State cannot have children'],
        ['<State value="x" />', 'State requires a string id'],
        ['<Query id="user" path="/api/user"><Button>Ready</Button></Query>', 'Query cannot have children'],
        ['<Query path="/api/user" />', 'Query requires a string id'],
    ])('renders validation error: %s', (xml, expectedError) => {
        expect(renderXmlToMarkup(parseXML(xml))).toContain(expectedError);
    });
});
