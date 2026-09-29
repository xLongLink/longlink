import { parseFragment } from '../helpers';
import { describe, expect, it } from 'vitest';
import { getSetupNodes } from '@/xml/core/context';

describe('setup adapters', () => {
    it.each([
        ['<State id="filter" value="day"><Button>Ready</Button></State>', 'State cannot have children'],
        ['<State value="x" />', 'State requires a string id'],
        ['<State id="${name}" />', 'State id must be literal text'],
        ['<State id="__proto__" />', 'State id must be a safe property name'],
        ['<State id="params" />', 'State id params is reserved'],
        ['<State id="state" constructor="value" />', 'State attributes must be safe property names: constructor'],
        ['<Query id="user" path="/api/user"><Button>Ready</Button></Query>', 'Query cannot have children'],
        ['<Query id="user" />', 'Query requires a string path'],
        ['<State id="data" value="first" /><Query id="data" path="/api/data" />', 'Duplicate State or Query id "data"'],
    ])('rejects invalid declarations: %s', (xml, message) => {
        expect(() => getSetupNodes(parseFragment(xml))).toThrow(message);
    });
});
