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
import { renderXml } from '@/xml';

export function Dialog({ props: _props, children }: XmlComponentProps) {
    return <UIDialog>{renderXml(children)}</UIDialog>;
}

export function DialogContent({ props: _props, children }: XmlComponentProps) {
    return <UIDialogContent>{renderXml(children)}</UIDialogContent>;
}

export function DialogHeader({ props: _props, children }: XmlComponentProps) {
    return <UIDialogHeader>{renderXml(children)}</UIDialogHeader>;
}

export function DialogTitle({ props: _props, children }: XmlComponentProps) {
    return <UIDialogTitle>{renderXml(children)}</UIDialogTitle>;
}

export function DialogDescription({ props: _props, children }: XmlComponentProps) {
    return <UIDialogDescription>{renderXml(children)}</UIDialogDescription>;
}

export function DialogFooter({ props: _props, children }: XmlComponentProps) {
    return <UIDialogFooter>{renderXml(children)}</UIDialogFooter>;
}

export function DialogTrigger({ props: _props, children }: XmlComponentProps) {
    return <UIDialogTrigger>{renderXml(children)}</UIDialogTrigger>;
}
