import { describe, expect, it } from 'vitest';
import { parseXML } from '@/xml/v1/core/parser';
import type { XmlRuntime } from '@/xml/v1/types';
import { renderXmlToMarkup } from '../helpers';

describe('For', () => {
    /* Loop children should keep access to the scoped item value. */
    it('renders children with the scoped item value', () => {
        const ctx: XmlRuntime = {
            scope: { bindings: { items: [{ name: 'Alpha' }] } },
            services: {
                invalidate: async () => {},
                navigationBaseUrl: '',
                requestBaseUrl: '',
                setups: {},
            },
        };

        expect(
            renderXmlToMarkup(parseXML('<For each="$items" as="item"><Text value="${item.name}" /></For>'), ctx)
        ).toContain('Alpha');
    });

    it('preserves parent bindings while nested aliases and indexes shadow', () => {
        const ctx: XmlRuntime = {
            scope: {
                bindings: {
                    groups: [{ items: [{ name: 'Alpha' }] }],
                    params: { issue: '123' },
                    title: 'Issue',
                },
            },
            services: {
                invalidate: async () => {},
                navigationBaseUrl: '',
                requestBaseUrl: '',
                setups: {},
            },
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
