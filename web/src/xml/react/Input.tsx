import { Input as UIInput } from '@/ui/input';
import type { XMLComponent } from '@/xml';

/** Props accepted by the XML Input component. */
export interface InputProps {
    placeholder?: unknown;
    value?: unknown;
}

/** Renders a minimal XML input control. */
export const Input: XMLComponent<InputProps> = ({ props }) => {
    const { value: rawValue, placeholder } = props;
    const valueText = String(rawValue ?? '');
    const placeholderText = String(placeholder ?? '');

    return <UIInput type="text" placeholder={placeholderText} value={valueText} readOnly />;
};
