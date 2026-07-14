import { describe, expect, it } from 'bun:test';
import { parseXML } from '@/xml/core/parser';
import { renderXmlToMarkup } from '../helpers';

describe('Query', () => {
    /* Query nodes must render a scoped setup error when invalid layouts include children. */
    it('renders an error when children are present', () => {
        const ast = parseXML('<Query id="user" path="/api/user"><P i18n="query.ready" /></Query>');

        expect(renderXmlToMarkup(ast)).toContain('Query cannot have children');
    });

    /* Query should render a clear scoped runtime error when ids are missing. */
    it('renders an error when id is missing', () => {
        const ast = parseXML('<Query path="/api/user" />');

        expect(renderXmlToMarkup(ast)).toContain('Query requires a string id');
    });
});
