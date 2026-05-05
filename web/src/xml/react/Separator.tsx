import { Separator as UISeparator } from '@/ui/separator';
import type { ComponentProps } from 'react';

type SeparatorProps = ComponentProps<typeof UISeparator>;

export function Separator(props: SeparatorProps) {
    return <UISeparator orientation="horizontal" {...props} />;
}

export default Separator;
