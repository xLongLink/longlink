import { describe, expect, it } from 'vitest';
import { parseXML } from '@/xml';

describe('XML runtime compatibility', () => {
    it('rejects unavailable runtimes before rendering', () => {
        expect(() => parseXML('<longlink version="0.4"><Text value="Page title" /></longlink>')).toThrow(
            'Unsupported LongLink XML runtime version: 0.4'
        );
    });
});
