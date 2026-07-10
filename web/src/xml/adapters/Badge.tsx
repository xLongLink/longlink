import { Badge as UIBadge, badgeVariants } from '@/components/ui/badge';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { renderNode } from '@/xml/core/node';
import type { Props } from '@/xml/types';
import type { VariantProps } from 'class-variance-authority';
import { resolveXmlString, resolveXmlValue } from './props';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

/** Renders a shadcn-backed badge for short status labels and tags. */
export function Badge({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const value = props.i18n ? undefined : resolveXmlValue(props, 'value', ctx);
    const text = value != null ? String(value) : props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);
    const variant = resolveBadgeVariant(resolveXmlString(props, 'variant', ctx, 'default'));

    return <UIBadge variant={variant}>{text}</UIBadge>;
}


/** Resolves a validated XML badge variant. */
function resolveBadgeVariant(value: string): BadgeVariant {
    // Accept only badge variants supported by the UI component.
    switch (value) {
        case 'default':
        case 'destructive':
        case 'outline':
        case 'ghost':
        case 'link':
            return value;
        default:
            throw new Error(`Unsupported Badge variant '${value}'`);
    }
}
