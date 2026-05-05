import {
    Dialog as UIDialog,
    DialogContent as UIDialogContent,
    DialogDescription as UIDialogDescription,
    DialogFooter as UIDialogFooter,
    DialogHeader as UIDialogHeader,
    DialogTitle as UIDialogTitle,
    DialogTrigger as UIDialogTrigger,
} from '@/ui/dialog';
import { renderNode, useRuntime } from '@/xml';
import type { ComponentProps, ReactNode } from 'react';

type BaseProps = { children?: ReactNode };

export function Dialog({ children, ...props }: BaseProps & ComponentProps<typeof UIDialog>) {
    const { registry, ctx } = useRuntime();
    return <UIDialog {...props}>{renderNode(children as any, registry, ctx)}</UIDialog>;
}
export function DialogContent({ children, ...props }: BaseProps & ComponentProps<typeof UIDialogContent>) {
    const { registry, ctx } = useRuntime();
    return <UIDialogContent {...props}>{renderNode(children as any, registry, ctx)}</UIDialogContent>;
}
export function DialogHeader({ children, ...props }: BaseProps & ComponentProps<typeof UIDialogHeader>) {
    const { registry, ctx } = useRuntime();
    return <UIDialogHeader {...props}>{renderNode(children as any, registry, ctx)}</UIDialogHeader>;
}
export function DialogTitle({ children, ...props }: BaseProps & ComponentProps<typeof UIDialogTitle>) {
    const { registry, ctx } = useRuntime();
    return <UIDialogTitle {...props}>{renderNode(children as any, registry, ctx)}</UIDialogTitle>;
}
export function DialogDescription({ children, ...props }: BaseProps & ComponentProps<typeof UIDialogDescription>) {
    const { registry, ctx } = useRuntime();
    return <UIDialogDescription {...props}>{renderNode(children as any, registry, ctx)}</UIDialogDescription>;
}
export function DialogFooter({ children, ...props }: BaseProps & ComponentProps<typeof UIDialogFooter>) {
    const { registry, ctx } = useRuntime();
    return <UIDialogFooter {...props}>{renderNode(children as any, registry, ctx)}</UIDialogFooter>;
}
export function DialogTrigger({ children, ...props }: BaseProps & ComponentProps<typeof UIDialogTrigger>) {
    const { registry, ctx } = useRuntime();
    return <UIDialogTrigger {...props}>{renderNode(children as any, registry, ctx)}</UIDialogTrigger>;
}

export default Dialog;
