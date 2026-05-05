import {
    Dialog as UIDialog,
    DialogContent as UIDialogContent,
    DialogDescription as UIDialogDescription,
    DialogFooter as UIDialogFooter,
    DialogHeader as UIDialogHeader,
    DialogTitle as UIDialogTitle,
    DialogTrigger as UIDialogTrigger,
} from '@/ui/dialog';
import type { RenderableASTNode } from '@/xml';
import { renderNode, useRuntime } from '@/xml';

type BaseProps = { children?: RenderableASTNode };

export function Dialog({ children }: BaseProps) {
    const { registry, ctx } = useRuntime();
    return <UIDialog>{renderNode(children, registry, ctx)}</UIDialog>;
}

export function DialogContent({ children }: BaseProps) {
    const { registry, ctx } = useRuntime();
    return <UIDialogContent>{renderNode(children, registry, ctx)}</UIDialogContent>;
}

export function DialogHeader({ children }: BaseProps) {
    const { registry, ctx } = useRuntime();
    return <UIDialogHeader>{renderNode(children, registry, ctx)}</UIDialogHeader>;
}

export function DialogTitle({ children }: BaseProps) {
    const { registry, ctx } = useRuntime();
    return <UIDialogTitle>{renderNode(children, registry, ctx)}</UIDialogTitle>;
}

export function DialogDescription({ children }: BaseProps) {
    const { registry, ctx } = useRuntime();
    return <UIDialogDescription>{renderNode(children, registry, ctx)}</UIDialogDescription>;
}

export function DialogFooter({ children }: BaseProps) {
    const { registry, ctx } = useRuntime();
    return <UIDialogFooter>{renderNode(children, registry, ctx)}</UIDialogFooter>;
}

export function DialogTrigger({ children }: BaseProps) {
    const { registry, ctx } = useRuntime();
    return <UIDialogTrigger>{renderNode(children, registry, ctx)}</UIDialogTrigger>;
}
