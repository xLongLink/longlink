import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';
import { renderXmlToMarkup } from '../helpers';
import { createContext } from '@/xml/core/context';

describe('For', () => {
    it.each([
        ['as', '<For each="$items">$item</For>', 'For requires an "as" parameter'],
        ['each', '<For as="item">$item</For>', 'For requires an "each" parameter'],
    ])('requires an %s parameter', (_, xml, error) => {
        expect(() => renderXmlToMarkup(parseXML(xml))).toThrow(error);
    });

    it('does not render children for a non-array source', () => {
        const ctx = createContext();
        ctx.scope.bindings.items = { name: 'Alpha' };

        expect(renderXmlToMarkup(parseXML('<For each="$items" as="item">Rendered</For>'), ctx)).not.toContain(
            'Rendered'
        );
    });

    it('preserves parent bindings while nested aliases and indexes shadow', () => {
        const ctx = createContext();
        ctx.scope.bindings = {
            groups: [{ items: [{ name: 'Alpha' }] }],
            params: { issue: '123' },
            title: 'Issue',
        };

        const output = renderXmlToMarkup(
            parseXML(
                '<For each="$groups" as="item"><For each="$item.items" as="item">${title + \' #\' + params.issue + \' \' + item.name + \' \' + index}</For></For>'
            ),
            ctx
        );

        expect(output).toContain('Issue #123 Alpha 0');
    });
});
