import { useState, type ComponentProps, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { Button as UIButton } from '@/ui/button';
import { Dialog } from '@/ui/dialog';
import { apiFetch } from '@/lib/api';

type ButtonProps = {
    text: string;
    variant?: ComponentProps<typeof UIButton>['variant'];
    url?: string;
    children?: ReactNode;
};

const normalizePath = (path: string) => path.replace(/^\/+|\/+$/g, '');

export function Button({
    text,
    variant = 'default',
    url,
    children,
}: ButtonProps) {
    const [open, setOpen] = useState(false);
    const { app } = useParams();
    const hasDialog = Boolean(children);
    const normalizedUrl = normalizePath(url ?? '');

    const handleClick = async () => {
        if (hasDialog) {
            setOpen(true);
        }

        if (!app || !normalizedUrl) {
            return;
        }

        await apiFetch(`/apps/${app}/${normalizedUrl}`, {
            method: 'POST',
        });
    };

    return (
        <>
            <UIButton
                variant={variant}
                onClick={() => {
                    void handleClick();
                }}
                className="cursor-pointer"
            >
                {text}
            </UIButton>

            {hasDialog && (
                <Dialog open={open} onOpenChange={setOpen}>
                    {children}
                </Dialog>
            )}
        </>
    );
}

export default Button;
