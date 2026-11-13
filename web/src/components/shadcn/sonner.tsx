import { Toaster as Sonner } from 'sonner';
import type { ComponentProps, CSSProperties } from 'react';
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from 'lucide-react';

const style: CSSProperties & Record<`--${string}`, string> = {
    '--normal-bg': 'var(--popover)',
    '--normal-text': 'var(--popover-foreground)',
    '--normal-border': 'var(--border)',
    '--border-radius': 'var(--radius)'
};

function Toaster({ ...props }: ComponentProps<typeof Sonner>) {
    return (
        <Sonner
            theme="system"
            className="toaster group"
            icons={{
                success: <CircleCheckIcon className="size-4" aria-hidden="true" />,
                info: <InfoIcon className="size-4" aria-hidden="true" />,
                warning: <TriangleAlertIcon className="size-4" aria-hidden="true" />,
                error: <OctagonXIcon className="size-4" aria-hidden="true" />,
                loading: <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
            }}
            style={style}
            toastOptions={{ classNames: { toast: 'cn-toast' } }}
            {...props}
        />
    );
}

export { Toaster };
