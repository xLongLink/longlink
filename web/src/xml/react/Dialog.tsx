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
    const { ctx } = useRuntime();
    return <UIDialog>{renderNode(children, ctx)}</UIDialog>;
}

export function DialogContent({ children }: BaseProps) {
    const { ctx } = useRuntime();
    return <UIDialogContent>{renderNode(children, ctx)}</UIDialogContent>;
}

export function DialogHeader({ children }: BaseProps) {
    const { ctx } = useRuntime();
    return <UIDialogHeader>{renderNode(children, ctx)}</UIDialogHeader>;
}

export function DialogTitle({ children }: BaseProps) {
    const { ctx } = useRuntime();
    return <UIDialogTitle>{renderNode(children, ctx)}</UIDialogTitle>;
}

export function DialogDescription({ children }: BaseProps) {
    const { ctx } = useRuntime();
    return <UIDialogDescription>{renderNode(children, ctx)}</UIDialogDescription>;
}

export function DialogFooter({ children }: BaseProps) {
    const { ctx } = useRuntime();
    return <UIDialogFooter>{renderNode(children, ctx)}</UIDialogFooter>;
}

export function DialogTrigger({ children }: BaseProps) {
    const { ctx } = useRuntime();
    return <UIDialogTrigger>{renderNode(children, ctx)}</UIDialogTrigger>;
}
