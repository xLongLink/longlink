import { toast } from 'sonner';
import type { ExternalToast } from 'sonner';
import { createContext, useContext } from 'react';

export const NotificationContext = createContext<((message: string) => void) | null>(null);

/** Returns the mounted API provider's normal-message notification channel. */
export function useNotification() {
    const showMessage = useContext(NotificationContext);

    if (!showMessage) throw new Error('Notifications require ApiProvider');

    return showMessage;
}

/** Limits the global Sonner store to notifications owned by one mounted API provider. */
export function createNotifications(toasterId: string) {
    let active = true;
    let generation = 0;
    const notifications = new Set<string | number>();

    const dismiss = () => {
        for (const id of notifications) toast.dismiss(id);
        notifications.clear();
    };

    const publish = (kind: 'error' | 'message', message: string) => {
        if (!active) return;

        const options: ExternalToast = {
            toasterId,
            onDismiss: ({ id }) => notifications.delete(id),
            onAutoClose: ({ id }) => notifications.delete(id)
        };

        const id = kind === 'error' ? toast.error(message, options) : toast(message, options);
        notifications.add(id);
    };

    return {
        notify: (message: string) => publish('error', message),
        showMessage: (message: string) => publish('message', message),
        dismiss,
        activate: () => {
            active = true;
            generation++;
        },
        dispose: () => {
            active = false;
            const disposedGeneration = ++generation;

            // StrictMode reconnects the same owner before microtasks; a real unmount does not.
            queueMicrotask(() => {
                if (generation === disposedGeneration) dismiss();
            });
        }
    };
}
