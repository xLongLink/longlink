import { describe, expect, it } from 'vitest';
import { createContext } from '@/xml/core/context';
import { parseFragment, renderXmlToMarkup } from '../helpers';

describe('For', () => {
    it.each([
        ['as', '<For each="$items">$item</For>', 'For requires an "as" parameter'],
        ['each', '<For as="item">$item</For>', 'For requires an "each" parameter'],
    ])('requires an %s parameter', (_, xml, error) => {
        expect(() => renderXmlToMarkup(parseFragment(xml))).toThrow(error);
    });

    it('does not render children for a non-array source', () => {
        const ctx = createContext();
        ctx.scope.bindings.items = { name: 'Alpha' };

        expect(renderXmlToMarkup(parseFragment('<For each="$items" as="item">Rendered</For>'), ctx)).not.toContain(
            'Rendered'
        );
    });

    it('preserves parent bindings while nested aliases and indexes shadow', () => {
        // Arrange
        const ctx = createContext();
        ctx.scope.bindings = {
            groups: [{ items: [{ name: 'Alpha' }, { name: 'Beta' }] }],
            params: { issue: '123' },
            title: 'Issue',
        };

        // Act
        const output = renderXmlToMarkup(
            parseFragment(
                '<For each="$groups" as="item"><For each="$item.items" as="item">${title + \' #\' + params.issue + \' \' + item.name + \' \' + index}</For></For>'
            ),
            ctx
        );

        // Assert
        expect(output).toContain('Issue #123 Alpha 0');
        expect(output).toContain('Issue #123 Beta 1');
    });
});
