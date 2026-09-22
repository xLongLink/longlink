import { stoneTheme } from '@/theme';
import { ApiErrorContext } from '@/lib/errors';
import { Theme } from '@astryxdesign/core/theme';
import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { useToast } from '@astryxdesign/core/Toast';
import { createQueryRuntime } from '@/lib/react-query';
import { LinkProvider } from '@astryxdesign/core/Link';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { QueryClientProvider } from '@tanstack/react-query';

/** Provides isolated query state with the shared application provider tree. */
export function RootProvider({ children }: { children: ReactNode }) {
    return (
        <Theme theme={stoneTheme} mode="dark">
            <LinkProvider component={RouterLink}>
                <LayerProvider toast={{ position: 'bottomEnd' }}>
                    <ApiProvider>{children}</ApiProvider>
                </LayerProvider>
            </LinkProvider>
        </Theme>
    );
}

/** Connects cache and direct-request failures to the shared notification layer. */
export function ApiProvider({ children }: { children: ReactNode }) {
    const toast = useToast();
    const [runtime] = useState(() => {
        return createQueryRuntime(
            (body) => {
                toast({ body, type: 'error', isAutoHide: true });

                // Re-promote the shared viewport after React renders the toast so it remains above an open dialog.
                requestAnimationFrame(() => {
                    for (const viewport of document.querySelectorAll<HTMLElement>('[popover="manual"]')) {
                        if (!viewport.querySelector('[data-toast-id]')) continue;
                        if (typeof viewport.hidePopover !== 'function' || typeof viewport.showPopover !== 'function')
                            return;

                        if (viewport.matches(':popover-open')) viewport.hidePopover();
                        viewport.showPopover();
                        return;
                    }
                });
            },
            import.meta.env.MODE !== 'sdk'
        );
    });

    return (
        <ApiErrorContext value={runtime.reportError}>
            <QueryClientProvider client={runtime.client}>{children}</QueryClientProvider>
        </ApiErrorContext>
    );
}
