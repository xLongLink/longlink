import { parseXML } from '@/xml/core/parser';
import type { ExecutionContext } from '@/xml/types';
import { describe, expect, it } from 'bun:test';
import { proxy } from 'valtio';
import { renderXmlToMarkup } from '../helpers';

describe('Select', () => {
    /* Nested state bindings should seed Select values from form state objects. */
    it('renders nested state binding values', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {
                form: proxy({ team: 'ops' }),
            },
        };
        const output = renderXmlToMarkup(
            parseXML(
                '<Select value="$form.team"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="ops" i18n="select.operations" /></SelectGroup></SelectContent></Select>'
            ),
            ctx
        );

        expect(output).toContain('value="ops"');
        expect(output).toContain('ops');
    });
});
