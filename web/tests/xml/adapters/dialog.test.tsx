import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Dialog', () => {
    /* The runtime should render the trigger; portal content is client-side. */
    it('renders the dialog trigger in static markup', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Dialog open="${true}"><DialogTrigger><Button variant="outline"><P i18n="dialogs.open" /></Button></DialogTrigger><DialogContent><DialogTitle><P i18n="dialogs.deleteIssue" /></DialogTitle><DialogDescription><P i18n="dialogs.cannotUndo" /></DialogDescription><Button i18n="dialogs.actions" /></DialogContent></Dialog>'
            )
        );

        expect(output).toContain('Open dialog');
        expect(output).not.toContain('<button><button');
    });

    /* The runtime should render direct i18n labels on trigger buttons. */
    it('renders a direct i18n button trigger label', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Dialog open="${true}"><DialogTrigger><Button i18n="dialogs.createItem" /></DialogTrigger><DialogContent><DialogTitle i18n="dialogs.createInventoryItem" /><DialogDescription i18n="dialogs.createOneItem" /></DialogContent></Dialog>'
            )
        );

        expect(output).toContain('Create item');
    });

    /* The runtime should support anchor-style dialog triggers. */
    it('renders an anchor trigger in static markup', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Dialog open="${true}"><DialogTrigger><A href="/quotes/edit" active="hover"><P i18n="dialogs.editQuote" /></A></DialogTrigger><DialogContent><DialogTitle><P i18n="dialogs.editQuote" /></DialogTitle><DialogDescription><P i18n="dialogs.reviewQuote" /></DialogDescription><Button i18n="dialogs.actions" /></DialogContent></Dialog>'
            )
        );

        expect(output).toContain('href="/quotes/edit"');
        expect(output).toContain('Edit quote');
    });
});
