import * as Toast from '@astryxdesign/core/Toast';

/** Return the shared LongLink toast function with automatic dismissal enabled by default. */
export function useToast(): Toast.ShowToastFn {
    const toast = Toast.useToast();

    return (options) =>
        toast({
            ...options,
            isAutoHide: options.isAutoHide ?? true,
        });
}
