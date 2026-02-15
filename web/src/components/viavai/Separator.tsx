import { Separator as UISeparator } from '@/components/ui/separator';

type SeparatorProps = {
    orientation?: 'horizontal' | 'vertical';
};

export function Separator({ orientation = 'horizontal' }: SeparatorProps) {
    return <UISeparator orientation={orientation} />;
}

export default Separator;
