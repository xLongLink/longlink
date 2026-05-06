import { Input as UIInput } from '@/ui/input';
import type { XmlComponentProps } from '@/xml';
import { evaluate, useContext } from '@/xml';

/** Renders a minimal XML input control. */
export function Input({ props }: XmlComponentProps) {
    const { ctx } = useContext();
    const valueProp = props.value ?? '';
    const placeholder = String(evaluate(props.placeholder ?? '', ctx) ?? '');
    const value = String(evaluate(valueProp, ctx) ?? '');

    return <UIInput type="text" placeholder={placeholder} value={value} readOnly />;
}
