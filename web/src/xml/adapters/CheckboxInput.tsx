import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { resolveXmlProps, xmlLabelPropsSchema } from '../core/props';
import { CheckboxInput as AstryxCheckboxInput } from '@astryxdesign/core/CheckboxInput';

export function CheckboxInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => value === true || value === 'true');
    const { label } = resolveXmlProps(props, ctx, { label: 'raw' }, xmlLabelPropsSchema);

    return <AstryxCheckboxInput label={label} size="sm" value={binding.value} onChange={binding.setValue} />;
}
