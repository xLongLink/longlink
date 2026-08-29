import type { ComponentProps } from 'react';
import { Stack as AstryxStack } from '@astryxdesign/core/Stack';

/** Renders an Astryx stack without spacing unless a gap is specified. */
export function Stack({ gap = 0, ...props }: ComponentProps<typeof AstryxStack>) {
    return <AstryxStack {...props} gap={gap} />;
}
