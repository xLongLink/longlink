import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';
import { renderXmlToMarkup } from '../helpers';

describe('Action', () => {
    it('requires one terminal Button or Link trigger', () => {
        expect(() =>
            renderXmlToMarkup(parseXML('<Action><Button label="Save" /><Link to="/profile">Profile</Link></Action>'))
        ).toThrow('Action requires exactly one direct Button or Link trigger');
    });

    it('rejects effects after its trigger', () => {
        expect(() =>
            renderXmlToMarkup(
                parseXML('<Action><Button label="Save" /><Request url="/profile" method="PATCH" /></Action>')
            )
        ).toThrow('Action effects must precede its Button or Link trigger');
    });
});
