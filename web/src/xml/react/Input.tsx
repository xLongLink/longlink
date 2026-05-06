import { Input as UIInput } from '@/ui/input';
import type { XmlComponentProps } from '@/xml';
import { evaluate, useContext } from '@/xml';

/** Renders a minimal XML input control. */
export function Input({ props: rawProps }: XmlComponentProps) {
    const { ctx } = useContext();
    const valueProp = rawProps.value ?? '';
    const placeholder = String(evaluate(rawProps.placeholder ?? '', ctx) ?? '');
    const value = String(evaluate(valueProp, ctx) ?? '');

    return (
        <UIInput
            type="text"
            placeholder={placeholder}
            value={value}
            readOnly
        />
    );
}
