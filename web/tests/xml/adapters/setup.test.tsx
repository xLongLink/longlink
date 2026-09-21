import { parseFragment } from '../helpers';
import { describe, expect, it } from 'vitest';
import { getSetupNodes } from '@/xml/core/context';

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
    ])('rejects invalid declarations: %s', (xml) => {
        expect(() => getSetupNodes(parseFragment(xml))).toThrow();
    });
});
