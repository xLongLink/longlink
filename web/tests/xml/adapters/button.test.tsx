// @vitest-environment happy-dom
import { act } from 'react';
import { RenderXML } from '@/xml/renderers';
import { parseXML } from '@/xml/core/parser';
import { createRoot } from 'react-dom/client';
import { createContext } from '@/xml/core/context';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Button', () => {
    let root: ReturnType<typeof createRoot> | undefined;

    afterEach(async () => {
        if (root) {
            const mountedRoot = root;
            await act(async () => mountedRoot.unmount());
        }
        root = undefined;
        vi.unstubAllGlobals();
    });

    it('navigates to its destination resolved against the navigation base URL', async () => {
        const ctx = createContext();
        ctx.services.navigate = vi.fn();
        ctx.services.navigationBaseUrl = '/orgs/acme/solutions/tracker';
        const container = document.createElement('div');
        root = createRoot(container);
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

        await act(async () => {
            root?.render(
                <RenderXML
                    ast={parseXML('<longlink><Button to="/issues/123">Issue</Button></longlink>')[0]}
                    ctx={ctx}
                />
            );
        });

        const button = container.querySelector('button');
        if (!button) throw new Error('Button did not render');

        await act(async () => button.click());

        expect(ctx.services.navigate).toHaveBeenCalledWith('/orgs/acme/solutions/tracker/issues/123');
    });
});
