import { describe, expect, it } from 'vitest';
import { setupContext } from '@/xml/v1/core/context';
import type { XmlRuntime } from '@/xml/v1/types';
import { compileProps } from '../helpers';

describe('State', () => {
    /* Multiple state attributes should seed a proxied object slot. */
    it('seeds multi-field state values', async () => {
        const ctx: XmlRuntime = {
            scope: { bindings: {} },
            services: { invalidate: async () => {}, navigationBaseUrl: '', params: {}, requestBaseUrl: '', setups: {} },
        };

        await setupContext(
            [{ name: 'State', params: compileProps({ id: 'state1', value1: 'first value', score: '10', list: '[]' }) }],
            ctx,
            ''
        );

        expect(ctx.scope.bindings.state1).toEqual({ value1: 'first value', score: 10, list: [] });
    });
});
