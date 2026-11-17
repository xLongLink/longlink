import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/shadcn/button';

/** Keeps action labels and focus stable while the caller owns pending work. */
export function PendingButton({
    label,
    pending,
    variant,
    onClick
}: {
    label: string;
    pending: boolean;
    variant: 'primary' | 'destructive';
    onClick: () => void;
}) {
    return (
        <Button
            type="button"
            variant={variant}
            className="relative min-w-0"
            disabled={pending}
            focusableWhenDisabled
            aria-busy={pending || undefined}
            aria-label={pending ? label : undefined}
            onClick={onClick}
        >
            <span
                className="flex min-w-0 max-w-full flex-1 items-center justify-center gap-[inherit] transition-opacity duration-0 aria-hidden:opacity-0 aria-hidden:delay-200 motion-reduce:aria-hidden:delay-0"
                aria-hidden={pending || undefined}
            >
                <span className="min-w-0 overflow-hidden text-ellipsis">{label}</span>
            </span>
            {pending && (
                <LoaderCircle
                    aria-hidden="true"
                    className="absolute inset-0 m-auto size-3.5 transition-opacity duration-0 delay-200 motion-safe:animate-spin motion-reduce:delay-0 starting:opacity-0"
                />
            )}
        </Button>
    );
}
