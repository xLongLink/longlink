// @vitest-environment happy-dom
import { act } from 'react';
import type { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createContext, cleanupMountedRoot, mountXml } from '../helpers';

describe('Button', () => {
    let root: ReturnType<typeof createRoot> | undefined;

    afterEach(async () => {
        await cleanupMountedRoot(root);
        root = undefined;
        vi.unstubAllGlobals();
    });

    it('navigates to its destination resolved against the navigation base URL', async () => {
        const ctx = createContext({
            navigate: vi.fn(),
            navigationBaseUrl: '/orgs/acme/solutions/tracker',
        });

        // Mount through the shared helper so ACT and root lifetime stay in one owner.
        const mounted = await mountXml('<Button to="/issues/123">Issue</Button>', ctx);
        root = mounted.root;
        const container = mounted.container;

        const button = container.querySelector('button');
        if (!button) throw new Error('Button did not render');

        await act(async () => button.click());

        expect(ctx.services.navigate).toHaveBeenCalledWith('/orgs/acme/solutions/tracker/issues/123');
    });
});
