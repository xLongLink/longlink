import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { resolveXmlProps, xmlLabelPropsSchema } from '../core/props';
import { TextArea as AstryxTextArea } from '@astryxdesign/core/TextArea';

export function TextArea({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
    const { label } = resolveXmlProps(props, ctx, { label: 'raw' }, xmlLabelPropsSchema);

    return <AstryxTextArea label={label} value={binding.value} onChange={binding.setValue} />;
}
