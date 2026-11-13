import { toast } from 'sonner';
import type { ExternalToast } from 'sonner';
import { createContext, createElement, useContext } from 'react';
import { NativeNotificationMessage } from '@/components/native-notification-message';

type Notification = { kind: 'error' | 'message'; message: string };

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
    let connected = false;
    let generation = 0;
    let pending: Notification[] = [];
    const notifications = new Set<string | number>();

    const dismiss = () => {
        pending = [];

        for (const id of notifications) toast.dismiss(id);
        notifications.clear();
    };

    const publish = ({ kind, message }: Notification) => {
        const options: ExternalToast = {
            toasterId,
            onDismiss: ({ id }) => notifications.delete(id),
            onAutoClose: ({ id }) => notifications.delete(id)
        };

        const title = createElement(NativeNotificationMessage, {
            message,
            priority: kind === 'error' ? 'assertive' : 'polite'
        });

        const id = kind === 'error' ? toast.error(title, options) : toast(title, options);
        notifications.add(id);
    };

    const enqueue = (kind: Notification['kind'], message: string) => {
        if (!active) return;

        const notification = { kind, message };

        if (!connected) {
            pending.push(notification);

            return;
        }

        publish(notification);
    };

    return {
        notify: (message: string) => enqueue('error', message),
        showMessage: (message: string) => enqueue('message', message),
        connect: () => {
            connected = true;

            for (const message of pending) publish(message);
            pending = [];
        },
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
