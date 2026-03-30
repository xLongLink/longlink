import {
    useEffect,
    useState,
    type ComponentProps,
    type ReactNode,
} from 'react';
import { useParams } from 'react-router';
import { Button as UIButton } from '@/ui/button';
import { Dialog } from '@/ui/dialog';
import { apiFetch } from '@/lib/api';

type ButtonProps = {
    text: string;
    variant?: ComponentProps<typeof UIButton>['variant'];
    url?: string;
    children?: ReactNode;
    closeSignal?: number;
};

const normalizePath = (path: string) => path.replace(/^\/+|\/+$/g, '');

export function Button({
    text,
    variant = 'default',
    url,
    children,
    closeSignal,
}: ButtonProps) {
    const [open, setOpen] = useState(false);
    const { appId } = useParams();
    const hasDialog = Boolean(children);
    const normalizedUrl = normalizePath(url ?? '');

    useEffect(() => {
        if (hasDialog) {
            setOpen(false);
        }
    }, [closeSignal, hasDialog]);

    const handleClick = async () => {
        if (hasDialog) {
            setOpen(true);
        }

        if (!appId || !normalizedUrl) {
            return;
        }

        await apiFetch(`/apps/${appId}/${normalizedUrl}`, {
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
