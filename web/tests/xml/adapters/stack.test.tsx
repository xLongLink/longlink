import { describe, expect, it } from 'vitest';
import { parseFragment, renderXmlToMarkup } from '../helpers';

describe('Stack', () => {
    it('renders scroll region content', () => {
        const output = renderXmlToMarkup(parseFragment('<Stack gap="3" isScrollable="true" height="50dvh">Content</Stack>'));

        expect(output).toContain('Content');
    });

    it('rejects invalid spacing', () => {
        expect(() => renderXmlToMarkup(parseFragment('<Stack gap="7">Content</Stack>'))).toThrow('Invalid XML props');
    });
});
