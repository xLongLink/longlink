import { Input as UIInput } from '@/ui/input';
import type { RenderableASTNode, XMLComponent } from '@xml';

/** Props accepted by the XML Input component. */
export interface InputProps {
    placeholder?: string | number | boolean;
    value?: RenderableASTNode | string | number | boolean;
    type?: string;
}

/** Renders a minimal XML input control. */
export const Input: XMLComponent<InputProps> = ({ value: rawValue, placeholder, type = 'text' }) => {
    const valueText = String(rawValue ?? '');
    const placeholderText = String(placeholder ?? '');

    return <UIInput type={type} placeholder={placeholderText} value={valueText} readOnly />;
};
