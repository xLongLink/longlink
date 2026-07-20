import { describe, expect, it } from 'bun:test';
import type { ASTNode, ExecutionContext } from '@/xml/types';
import { renderXmlToMarkup } from './helpers';

describe('renderNode', () => {
    it('resolves localized text through XML adapters', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            translations: { copy: { count: 'Count {{count}}' } },
            values: {},
            count: 7,
        };
        expect(renderXmlToMarkup([{ name: 'Text', params: { count: '${count}', i18n: 'copy.count' } }], ctx)).toContain(
            'Count 7'
        );
    });

    it('skips nodes when if condition is false', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        const node: ASTNode = { name: 'Button', params: { if: '${false}' } };
        expect(renderXmlToMarkup([node], ctx)).toBe('<div></div>');
    });

    it('throws on unknown component', () => {
        const ctx: ExecutionContext = { setups: {}, invalidate: async () => {}, values: {} };
        expect(() => renderXmlToMarkup([{ name: 'Unknown' }], ctx)).toThrow('Unknown component "Unknown"');
    });

    it('resolves input props from expressions', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {},
            form: { value: 'Ada', placeholder: 'Enter name' },
        };
        const node: ASTNode = {
            name: 'TextInput',
            params: { label: 'Name', value: 'form.value', placeholder: 'form.placeholder' },
        };
        const output = renderXmlToMarkup([node], ctx);
        expect(output).toContain('value="Ada"');
        expect(output).toContain('placeholder="Enter name"');
    });
});
