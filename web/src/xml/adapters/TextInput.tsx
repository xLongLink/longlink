import type { Props } from '../types';
import { TEXT_INPUT_TYPES } from '../constants';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';
import { TextInput as AstryxTextInput } from '@astryxdesign/core/TextInput';

export function TextInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
    const type = resolveXml(props, 'type', ctx);
    const description = resolveXml(props, 'description', ctx);

    if (!isXmlEnum(type, [undefined, ...TEXT_INPUT_TYPES])) {
        throw new Error(`Unsupported TextInput type '${String(type)}'`);
    }

    return (
        <AstryxTextInput
            type={type}
            label={requireXmlString(props, 'label', ctx, 'TextInput')}
            value={binding.value}
            onChange={binding.setValue}
            description={typeof description === 'string' ? description : undefined}
        />
    );
}
