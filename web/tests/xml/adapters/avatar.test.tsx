import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Avatar', () => {
    /* The compiler should preserve the single avatar composition. */
    it('compiles avatar xml into nested avatar ast nodes', () => {
        expect(
            parseXML(
                '<Avatar><AvatarImage src="/ada.png" alt="Ada Lovelace" /><AvatarFallback>AL</AvatarFallback><AvatarBadge>1</AvatarBadge></Avatar>'
            )
        ).toEqual([
            {
                name: 'Avatar',
                children: [
                    { name: 'AvatarImage', params: { src: '/ada.png', alt: 'Ada Lovelace' }, children: [] },
                    { name: 'AvatarFallback', children: [{ name: 'Text', params: { value: 'AL' } }] },
                    { name: 'AvatarBadge', children: [{ name: 'Text', params: { value: '1' } }] },
                ],
            },
        ]);
    });

    /* The runtime should render the single avatar and its badge slot. */
    it('renders the avatar composition end to end', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<Avatar><AvatarImage src="/ada.png" alt="Ada Lovelace" /><AvatarFallback>AL</AvatarFallback><AvatarBadge>1</AvatarBadge></Avatar>'
            )
        );

        expect(output).toContain('data-slot="avatar"');
        expect(output).toContain('data-slot="avatar-fallback"');
        expect(output).toContain('data-slot="avatar-badge"');
        expect(output).toContain('AL');
        expect(output).toContain('1');
    });
});
