import { parseXML } from '@/xml/core/parser';
import { describe, expect, it } from 'vitest';
import { renderXmlToMarkup } from '../helpers';

describe('Action', () => {
    it.each([
        {
            error: 'Action requires exactly one direct Button or Link trigger',
            xml: '<Action><Button>Save</Button><Link to="/profile">Profile</Link></Action>',
        },
        {
            error: 'Action effects must precede its Button or Link trigger',
            xml: '<Action><Button>Save</Button><Request url="/profile" method="PATCH" /></Action>',
        },
    ])('rejects invalid structure: $error', ({ error, xml }) => {
        expect(() => renderXmlToMarkup(parseXML(xml))).toThrow(error);
    });
});
