import { describe, expect, it } from 'vitest';
import type { ASTNode, XmlRuntime } from '@/xml/v1/types';
import { compileProps, renderXmlToMarkup } from './helpers';

describe('renderNode', () => {
    it('resolves localized text through XML adapters', () => {
        const ctx: XmlRuntime = {
            scope: { bindings: { count: 7 } },
            services: {
                invalidate: async () => {},
                navigationBaseUrl: '',
                requestBaseUrl: '',
                setups: {},
                translations: { 'copy.count': { defaultMessage: 'Count {count}' } },
            },
        };
        expect(
            renderXmlToMarkup(
                [{ name: 'Text', params: compileProps({ values: '${{ count }}', i18n: 'copy.count' }), children: [] }],
                ctx
            )
        ).toContain('Count 7');
    });

    it('skips nodes when if condition is false', () => {
        const node: ASTNode = { name: 'Button', params: compileProps({ if: '${false}' }), children: [] };
        expect(renderXmlToMarkup([node])).not.toContain('<button');
    });

    it('throws on unknown component', () => {
        expect(() => renderXmlToMarkup([{ name: 'Unknown', children: [] }])).toThrow('Unknown component "Unknown"');
    });

    it('resolves input props from expressions', () => {
        const ctx: XmlRuntime = {
            scope: { bindings: { form: { value: 'Ada' } } },
            services: { invalidate: async () => {}, navigationBaseUrl: '', requestBaseUrl: '', setups: {} },
        };
        const node: ASTNode = {
            name: 'TextInput',
            params: compileProps({ label: 'Name', value: 'form.value' }),
            children: [],
        };
        const output = renderXmlToMarkup([node], ctx);

        expect(output).toContain('value="Ada"');
    });
});
