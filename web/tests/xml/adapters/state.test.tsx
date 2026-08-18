import { describe, expect, it } from 'vitest';
import { createContext, setupContext } from '@/xml/core/context';
import { compileProps } from '../helpers';

describe('State', () => {
    it('seeds multi-field state values', async () => {
        const ctx = createContext();

        await setupContext(
            [
                {
                    name: 'State',
                    params: compileProps({ id: 'state1', value1: 'first value', score: '10', list: '[]' }),
                    children: [],
                },
            ],
            ctx,
            ''
        );

        expect(ctx.scope.bindings.state1).toEqual({ value1: 'first value', score: '10', list: '[]' });
    });
});
