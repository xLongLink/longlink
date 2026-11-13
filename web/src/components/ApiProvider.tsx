import { ApiErrorContext } from '@/lib/errors';
import { createQueryRuntime } from '@/lib/react-query';
import { NativeToaster } from '@/components/NativeToaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { createNotifications, NotificationContext } from '@/lib/notifications';

/** Connects cache and direct-request failures to the notification layer. */
export function ApiProvider({ children }: { children: ReactNode }) {
    const toasterId = useId();

    // Keep notifications and deduplication local to this document's API runtime.
    const [runtime] = useState(() => {
        const notifications = createNotifications(toasterId);
        const query = createQueryRuntime(notifications.notify, import.meta.env.MODE !== 'sdk', notifications.dismiss);

        return { ...query, notifications };
    });

    // Late direct requests must not publish after this provider unmounts.
    useEffect(() => {
        runtime.notifications.activate();

        return runtime.notifications.dispose;
    }, [runtime]);

    return (
        <ApiErrorContext value={runtime.reportError}>
            <NotificationContext value={runtime.notifications.showMessage}>
                <QueryClientProvider client={runtime.client}>{children}</QueryClientProvider>
            </NotificationContext>
            <NativeToaster id={toasterId} onReady={runtime.notifications.connect} />
        </ApiErrorContext>
    );
}
