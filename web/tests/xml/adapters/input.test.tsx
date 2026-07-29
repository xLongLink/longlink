import { proxy } from 'valtio';
import { describe, expect, it } from 'vitest';
import { parseXML } from '@/xml/core/parser';
import type { ExecutionContext } from '@/xml/types';
import { renderXmlToMarkup } from '../helpers';

describe('FileInput', () => {
    /* File inputs cannot be controlled with a value attribute in React. */
    it('renders bound file input without a controlled value', () => {
        const ctx: ExecutionContext = {
            setups: {},
            invalidate: async () => {},
            values: {
                document: proxy({ file: null }),
            },
        };
        const ast = parseXML('<FileInput label="Document" accept=".pdf" value="$document.file" />');
        const output = renderXmlToMarkup(ast, ctx);

        expect(output).toContain('type="file"');
        expect(output).toContain('accept=".pdf"');
        expect(output).not.toContain('value=');
    });
});
