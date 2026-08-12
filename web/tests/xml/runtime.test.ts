import { describe, expect, it } from 'vitest';
import { getXmlRuntimeVersion, parseXML } from '@/xml';

describe('XML runtime compatibility', () => {
    it('selects the Astryx 0.3 runtime', () => {
        const ast = parseXML('<longlink version="0.3"><Text i18n="page.title" /></longlink>');

        expect(getXmlRuntimeVersion(ast)).toBe('0.3');
    });

    it('rejects unavailable runtimes before rendering', () => {
        expect(() => parseXML('<longlink version="0.4"><Text i18n="page.title" /></longlink>')).toThrow(
            'Unsupported LongLink XML runtime version: 0.4'
        );
    });
});
