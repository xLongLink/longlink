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
import { renderNode, useContext } from '@/xml';

type BaseProps = { children?: RenderableASTNode };

export function Dialog({ children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    return <UIDialog>{renderNode(children, context.ctx)}</UIDialog>;
}

export function DialogContent({ children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    return <UIDialogContent>{renderNode(children, context.ctx)}</UIDialogContent>;
}

export function DialogHeader({ children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    return <UIDialogHeader>{renderNode(children, context.ctx)}</UIDialogHeader>;
}

export function DialogTitle({ children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    return <UIDialogTitle>{renderNode(children, context.ctx)}</UIDialogTitle>;
}

export function DialogDescription({ children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    return <UIDialogDescription>{renderNode(children, context.ctx)}</UIDialogDescription>;
}

export function DialogFooter({ children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    return <UIDialogFooter>{renderNode(children, context.ctx)}</UIDialogFooter>;
}

export function DialogTrigger({ children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    return <UIDialogTrigger>{renderNode(children, context.ctx)}</UIDialogTrigger>;
}
