import { parseXML } from '@xml/core/parser';
import type { ExecutionContext } from '@xml/types';
import { describe, expect, it } from 'bun:test';
import { proxy } from 'valtio';
import { renderXmlToMarkup } from '../helpers';

describe('Select', () => {
    /* The runtime should render the trigger, selected value, and hidden input. */
    it('renders the select shell in static markup', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Select defaultValue="overview"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectLabel i18n="Views" /><SelectItem value="overview" i18n="Overview" /><SelectItem value="settings" i18n="Settings" /></SelectGroup><SelectSeparator /><SelectGroup><SelectLabel i18n="Status" /><SelectItem value="active" i18n="Active" /><SelectItem value="archived" i18n="Archived" /></SelectGroup></SelectContent></Select>'
            )
        );

        expect(output).toContain('value="overview"');
        expect(output).toContain('overview');
    });

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
                '<Select value="$form.team"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="ops" i18n="Operations" /></SelectGroup></SelectContent></Select>'
            ),
            ctx
        );

        expect(output).toContain('value="ops"');
        expect(output).toContain('ops');
    });
});
