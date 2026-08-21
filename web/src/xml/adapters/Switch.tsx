import { z } from 'zod';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import { useBindableValue } from '../core/binding';
import { Switch as AstryxSwitch } from '@astryxdesign/core/Switch';

const switchPropsSchema = z.object({
    label: z
        .union([z.string(), z.number(), z.boolean()])
        .transform(String)
        .refine((value) => value.trim().length > 0),
});

type SwitchProps = z.infer<typeof switchPropsSchema>;

export function Switch({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const binding = useBindableValue(props, 'value', ctx, (value) => value !== 'false' && Boolean(value));
    const { label }: SwitchProps = resolveXmlProps(props, ctx, { label: 'raw' }, switchPropsSchema);

    return <AstryxSwitch label={label} size="sm" value={binding.value} onChange={binding.setValue} />;
}
