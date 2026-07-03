import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Avatar', () => {
    /* The runtime should render the single avatar and its badge slot. */
    it('renders the avatar composition end to end', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Avatar><AvatarImage src="/ada.png" alt="Ada Lovelace" /><AvatarFallback><P i18n="AL" /></AvatarFallback><AvatarBadge><P i18n="1" /></AvatarBadge></Avatar>'
            )
        );

        expect(output).toContain('AL');
        expect(output).toContain('1');
    });
});
