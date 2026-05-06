import { Input as UIInput } from '@/ui/input';
import type { XmlComponentProps } from '@/xml';
import { evaluate, resolveBinding, useContext } from '@/xml';

/** Renders a minimal XML input control. */
export function Input({ props: rawProps }: XmlComponentProps) {
    const { ctx } = useContext();
    const valueProp = rawProps.value ?? '';
    const placeholder = String(evaluate(rawProps.placeholder ?? '', ctx) ?? '');
    const isBound = typeof valueProp === 'string' && valueProp.startsWith('$');
    const value = String(isBound ? resolveBinding(valueProp.slice(1).trim(), ctx) : (evaluate(valueProp, ctx) ?? ''));

    /* Resolve the binding target once for direct updates. */
    let bindingState: Record<string, unknown> | undefined;
    let bindingPath: string[] = [];
    if (isBound) {
        try {
            const normalized = valueProp.slice(1).trim();
            const dotIndex = normalized.indexOf('.');
            const stateKey = dotIndex === -1 ? normalized : normalized.slice(0, dotIndex);
            bindingState = ctx[stateKey] as Record<string, unknown> | undefined;
            bindingPath = dotIndex === -1 ? [] : normalized.slice(dotIndex + 1).split('.');
        } catch {
            bindingState = undefined;
        }
    }

    /* Write the latest text value into bound state. */
    const updateBinding = (nextValue: string) => {
        if (!bindingState) return;

        if (bindingPath.length === 0) {
            bindingState.value = nextValue;
            return;
        }

        let current: Record<string, unknown> = bindingState;
        for (let index = 0; index < bindingPath.length - 1; index += 1) {
            const key = bindingPath[index]!;
            const next = current[key];
            current[key] = next && typeof next === 'object' ? (next as Record<string, unknown>) : {};
            current = current[key] as Record<string, unknown>;
        }

        current[bindingPath[bindingPath.length - 1]!] = nextValue;
    };

    return (
        <UIInput
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(event) => {
                updateBinding(event.currentTarget.value);
            }}
        />
    );
}
