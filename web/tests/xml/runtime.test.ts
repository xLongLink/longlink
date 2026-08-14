import { describe, expect, it } from 'vitest';
import { parseXML } from '@/xml';

describe('XML page roots', () => {
    it('rejects version attributes', () => {
        expect(() => parseXML('<longlink version="0.4"><Text value="Page title" /></longlink>')).toThrow(
            'XML page version attributes are not supported'
        );
    });
});
