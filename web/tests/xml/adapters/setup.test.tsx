import { describe, expect, it } from 'vitest';
import { parseFragment, renderXmlToMarkup } from '../helpers';

describe('setup adapters', () => {
    it.each([
        '<State id="filter" value="day"><Button>Ready</Button></State>',
        '<State value="x" />',
        '<State id="${name}" />',
        '<State id="__proto__" />',
        '<State id="params" />',
        '<State id="state" constructor="value" />',
        '<Query id="user" path="/api/user"><Button>Ready</Button></Query>',
        '<Query id="user" />',
        '<Query id="params" path="/api/params" />',
        '<State id="data" value="first" /><Query id="data" path="/api/data" />',
    ])('renders validation error: %s', (xml) => {
        expect(renderXmlToMarkup(parseFragment(xml))).toContain('Unable to initialize this view');
    });
});
