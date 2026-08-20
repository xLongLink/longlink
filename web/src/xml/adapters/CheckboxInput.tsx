import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { requireXmlString } from '../core/props';
import { useBindableValue } from '../core/binding';
import { CheckboxInput as AstryxCheckboxInput } from '@astryxdesign/core/CheckboxInput';

export function CheckboxInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue<boolean>(props, 'value', ctx, (value) => value === true || value === 'true');
    return (
        <AstryxCheckboxInput
            label={requireXmlString(props, 'label', ctx, 'CheckboxInput')}
            value={binding.value}
            onChange={binding.setValue}
        />
    );
}
