import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { requireXmlString } from '../core/props';
import { TextArea as AstryxTextArea } from '@astryxdesign/core/TextArea';

export function TextArea({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));

    return (
        <AstryxTextArea
            label={requireXmlString(props, 'label', ctx, 'TextArea')}
            value={binding.value}
            onChange={binding.setValue}
        />
    );
}
