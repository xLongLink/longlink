import { describe, expect, it } from 'vitest';
import { parseXML } from '@/xml';

describe('XML page roots', () => {
    it('accepts version attributes', () => {
        expect(() => parseXML('<longlink version="0.3"><Text value="Page title" /></longlink>')).not.toThrow();
    });
});
