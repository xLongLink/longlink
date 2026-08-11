import { describe, expect, it } from 'vitest';
import { resolveTranslation } from '@/xml/v1/core/i18n';
import { compileAttribute } from '@/xml/v1/expressions';
import type { RuntimeServices, Scope } from '@/xml/v1/types';

describe('resolveTranslation', () => {
    it('passes only values to the translator', () => {
        const scope: Scope = { bindings: { count: 7, name: 'Ada' } };
        const services: RuntimeServices = {
            invalidate: async () => {},
            navigationBaseUrl: '',
            requestBaseUrl: '',
            setups: {},
            translations: { 'copy.count': { defaultMessage: 'Count {count}' } },
            translate: (_key, values) => JSON.stringify(values),
        };

        expect(
            resolveTranslation(
                {
                    count: compileAttribute('${count}'),
                    i18n: compileAttribute('copy.count', true),
                    values: compileAttribute('${{ name }}'),
                },
                scope,
                services
            )
        ).toBe('{"name":"Ada"}');
    });
});
