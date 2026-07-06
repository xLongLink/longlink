import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Longlink', () => {
    it('rejects unknown longlink attributes at runtime', () => {
        expect(() => renderXmlToMarkup(parseXML('<longlink hidden="true"><P i18n="longlink.one" /></longlink>'))).toThrow(
            'Unsupported longlink attributes: hidden'
        );
    });
});
