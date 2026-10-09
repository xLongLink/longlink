import * as icons from '@/lib/icons';
import { ApiErrorContext } from '@/lib/errors';
import { Theme } from '@astryxdesign/core/theme';
import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { useToast } from '@astryxdesign/core/Toast';
import { stoneTheme } from '@/lib/generated/stone.js';
import { createQueryRuntime } from '@/lib/react-query';
import { LinkProvider } from '@astryxdesign/core/Link';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { IconRequestContext } from '@/components/ui/Icon';
import { QueryClientProvider } from '@tanstack/react-query';

/** Provides isolated query state with the shared application provider tree. */
export function RootProvider({ children }: { children: ReactNode }) {
    // Keep shared theme, link, layer, and API ownership independent of Platform-only navigation.
    return (
        <Theme theme={stoneTheme} mode="dark">
            <LinkProvider component={RouterLink}>
                <LayerProvider toast={{ position: 'bottomEnd' }}>
                    <IconRequestContext value={icons.load}>
                        <ApiProvider>{children}</ApiProvider>
                    </IconRequestContext>
                </LayerProvider>
            </LinkProvider>
        </Theme>
    );
}

/** Connects cache and direct-request failures to the shared notification layer. */
function ApiProvider({ children }: { children: ReactNode }) {
    const toast = useToast();

    const [runtime] = useState(() =>
        createQueryRuntime(
            (body) => {
                toast({ body, type: 'error', isAutoHide: true });

                // Re-promote the shared viewport after React renders the toast so it remains above an open dialog.
                requestAnimationFrame(() => {
                    for (const viewport of document.querySelectorAll<HTMLElement>('[popover="manual"]')) {
                        if (!viewport.querySelector('[data-toast-id]')) continue;

                        // Older browsers may not implement the native popover capability.
                        if (!('hidePopover' in viewport) || !('showPopover' in viewport)) return;

                        if (viewport.matches(':popover-open')) viewport.hidePopover();
                        viewport.showPopover();

                        return;
                    }
                });
            },
            import.meta.env.MODE !== 'sdk'
        )
    );

    return (
        <ApiErrorContext value={runtime.reportError}>
            <QueryClientProvider client={runtime.client}>{children}</QueryClientProvider>
        </ApiErrorContext>
    );
}
