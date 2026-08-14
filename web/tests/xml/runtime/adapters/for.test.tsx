import { describe, expect, it } from 'vitest';
import { parseXML } from '@/xml/runtime/core/parser';
import { createContext } from '@/xml/runtime/core/context';
import { renderXmlToMarkup } from '../helpers';

describe('For', () => {
    it('preserves parent bindings while nested aliases and indexes shadow', () => {
        const ctx = createContext();
        ctx.scope.bindings = {
            groups: [{ items: [{ name: 'Alpha' }] }],
            params: { issue: '123' },
            title: 'Issue',
        };

        const output = renderXmlToMarkup(
            parseXML(
                '<For each="$groups" as="item"><For each="$item.items" as="item"><Text value="${title + \' #\' + params.issue + \' \' + item.name + \' \' + index}" /></For></For>'
            ),
            ctx
        );

        expect(output).toContain('Issue #123 Alpha 0');
    });
});
