import { Input as UIInput } from '@/ui/input';

/** Props accepted by the XML Input component. */
export interface InputProps {
    placeholder?: unknown;
    value?: unknown;
}

/** Renders a minimal XML input control. */
export function Input({ props }: { props: InputProps }) {
    const valueProp = props.value ?? '';
    const placeholder = String(props.placeholder ?? '');
    const value = String(valueProp ?? '');

    return <UIInput type="text" placeholder={placeholder} value={value} readOnly />;
}
