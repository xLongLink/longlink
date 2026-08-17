import { describe, expect, it } from 'vitest';
import { parseXML } from '@/xml';

describe('XML page roots', () => {
    it('accepts root metadata attributes', () => {
        expect(() => parseXML('<longlink name="Page"><Text value="Page title" /></longlink>')).not.toThrow();
    });
});
