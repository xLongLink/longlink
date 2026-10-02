import { act } from 'react';
import type { createRoot } from 'react-dom/client';

/** Unmounts a test root created with createRoot. */
export async function cleanupMountedRoot(root: ReturnType<typeof createRoot> | undefined): Promise<void> {
    // Keep mounted-root lifetime in one owner so suites only handle their own globals.
    if (root) {
        const mountedRoot = root;
        await act(async () => mountedRoot.unmount());
    }
}
