import { parseXML } from '@xml/core/parser';
import { describe, expect, it } from 'bun:test';
import { renderXmlToMarkup } from '../helpers';

describe('Avatar', () => {
    /* The compiler should preserve the full avatar composition. */
    it('compiles avatar xml into nested avatar ast nodes', () => {
        expect(
            parseXML(
                '<AvatarGroup><Avatar size="sm"><AvatarImage src="/ada.png" alt="Ada Lovelace" /><AvatarFallback>AL</AvatarFallback><AvatarBadge>1</AvatarBadge></Avatar><AvatarGroupCount>+2</AvatarGroupCount></AvatarGroup>'
            )
        ).toEqual([
            {
                name: 'AvatarGroup',
                children: [
                    {
                        name: 'Avatar',
                        params: { size: 'sm' },
                        children: [
                            { name: 'AvatarImage', params: { src: '/ada.png', alt: 'Ada Lovelace' } },
                            { name: 'AvatarFallback', children: [{ name: 'Text', params: { value: 'AL' } }] },
                            { name: 'AvatarBadge', children: [{ name: 'Text', params: { value: '1' } }] },
                        ],
                    },
                    {
                        name: 'AvatarGroupCount',
                        children: [{ name: 'Text', params: { value: '+2' } }],
                    },
                ],
            },
        ]);
    });

    /* The runtime should render the avatar group and each avatar slot. */
    it('renders the avatar composition end to end', () => {
        const output = renderXmlToMarkup(
            parseXML(
                '<AvatarGroup><Avatar size="sm"><AvatarImage src="/ada.png" alt="Ada Lovelace" /><AvatarFallback>AL</AvatarFallback><AvatarBadge>1</AvatarBadge></Avatar><AvatarGroupCount>+2</AvatarGroupCount></AvatarGroup>'
            )
        );

        expect(output).toContain('data-slot="avatar-group"');
        expect(output).toContain('data-slot="avatar"');
        expect(output).toContain('data-slot="avatar-fallback"');
        expect(output).toContain('data-slot="avatar-badge"');
        expect(output).toContain('data-slot="avatar-group-count"');
        expect(output).toContain('AL');
        expect(output).toContain('1');
        expect(output).toContain('+2');
    });
});
