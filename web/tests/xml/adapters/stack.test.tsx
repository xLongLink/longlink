import { describe, expect, it } from 'vitest';
import { parseFragment, renderXmlToMarkup } from '../helpers';

describe('Stack', () => {
    it('rejects invalid spacing', () => {
        expect(() => renderXmlToMarkup(parseFragment('<Stack gap="7">Content</Stack>'))).toThrow('Invalid XML props');
    });
});
