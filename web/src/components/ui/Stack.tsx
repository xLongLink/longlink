import type { ComponentProps } from 'react';
import { Stack as AstryxStack } from '@astryxdesign/core/Stack';

type StackProps = ComponentProps<typeof AstryxStack>;

/** Renders an Astryx stack without spacing unless a gap is specified. */
export function Stack({ gap = 0, ...props }: StackProps) {
    return <AstryxStack {...props} gap={gap} />;
}
