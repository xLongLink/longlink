import { TextInput as AstryxTextInput } from '@astryxdesign/core-0-3/TextInput';
import type { Props } from '../types';
import { TEXT_INPUT_TYPES } from '../constants';
import { useXmlRuntime } from '../core/context';
import { useBindableValue } from '../core/binding';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';

/**
 * checked: 2026-08-13
 * https://astryx.atmeta.com/components/TextInput?tab=properties
 * - label: string
 * - description: string
 * - value: string
 * - type: str
 * - isDisabled: bool
 * - isRequired: bool
 */
export function TextInput({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => String(value ?? ''));
    const type = resolveXml(props, 'type', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isRequired = resolveXml(props, 'isRequired', ctx);
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
            isDisabled={typeof isDisabled === 'boolean' ? isDisabled : undefined}
            isRequired={typeof isRequired === 'boolean' ? isRequired : undefined}
            description={typeof description === 'string' ? description : undefined}
        />
    );
}
