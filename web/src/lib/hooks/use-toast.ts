import { useToast as useAstryxToast, type ShowToastFn } from '@astryxdesign/core/Toast';

/** Return the shared LongLink toast function with automatic dismissal enabled by default. */
export function useToast(): ShowToastFn {
    const toast = useAstryxToast();

    return (options) =>
        toast({
            ...options,
            isAutoHide: options.isAutoHide ?? true,
        });
}
