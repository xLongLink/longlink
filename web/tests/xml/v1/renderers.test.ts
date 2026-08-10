import { describe, expect, it } from 'vitest';
import type { ASTNode, ExecutionContext } from '@/xml/v1/types';
import { renderXmlToMarkup } from './helpers';

describe('renderNode', () => {
    it('resolves localized text through XML adapters', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            translations: { 'copy.count': { defaultMessage: 'Count {count}' } },
            values: {},
            count: 7,
        };
        expect(renderXmlToMarkup([{ name: 'Text', params: { count: '${count}', i18n: 'copy.count' } }], ctx)).toContain(
            'Count 7'
        );
    });

    it('skips nodes when if condition is false', () => {
        const node: ASTNode = { name: 'Button', params: { if: '${false}' } };
        expect(renderXmlToMarkup([node])).not.toContain('<button');
    });

    it('throws on unknown component', () => {
        expect(() => renderXmlToMarkup([{ name: 'Unknown' }])).toThrow('Unknown component "Unknown"');
    });

    it('resolves input props from expressions', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            form: { value: 'Ada' },
        };
        const node: ASTNode = {
            name: 'TextInput',
            params: { label: 'Name', value: 'form.value' },
        };
        const output = renderXmlToMarkup([node], ctx);

        expect(output).toContain('value="Ada"');
    });
});
