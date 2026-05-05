import {
    Dialog as UIDialog,
    DialogContent as UIDialogContent,
    DialogDescription as UIDialogDescription,
    DialogFooter as UIDialogFooter,
    DialogHeader as UIDialogHeader,
    DialogTitle as UIDialogTitle,
    DialogTrigger as UIDialogTrigger,
} from '@/ui/dialog';
import type { XmlComponentProps } from '@/xml';
import { renderNode, useContext } from '@/xml';

export function Dialog({ props: _props, children }: XmlComponentProps) {
    const context = useContext();
    return <UIDialog>{renderNode(children, context.ctx)}</UIDialog>;
}

export function DialogContent({ props: _props, children }: XmlComponentProps) {
    const context = useContext();
    return <UIDialogContent>{renderNode(children, context.ctx)}</UIDialogContent>;
}

export function DialogHeader({ props: _props, children }: XmlComponentProps) {
    const context = useContext();
    return <UIDialogHeader>{renderNode(children, context.ctx)}</UIDialogHeader>;
}

export function DialogTitle({ props: _props, children }: XmlComponentProps) {
    const context = useContext();
    return <UIDialogTitle>{renderNode(children, context.ctx)}</UIDialogTitle>;
}

export function DialogDescription({ props: _props, children }: XmlComponentProps) {
    const context = useContext();
    return <UIDialogDescription>{renderNode(children, context.ctx)}</UIDialogDescription>;
}

export function DialogFooter({ props: _props, children }: XmlComponentProps) {
    const context = useContext();
    return <UIDialogFooter>{renderNode(children, context.ctx)}</UIDialogFooter>;
}

export function DialogTrigger({ props: _props, children }: XmlComponentProps) {
    const context = useContext();
    return <UIDialogTrigger>{renderNode(children, context.ctx)}</UIDialogTrigger>;
}
