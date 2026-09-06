import { z } from 'zod';
import type { Props } from '../types';
import { resolveAnchorUrl } from '../core/url';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import { Avatar as UiAvatar } from '@/components/ui/Avatar';

const avatarPropsSchema = z.object({
    alt: z.string().optional(),
    kind: z.enum(['organization', 'user']).optional(),
    name: z.string().optional(),
    src: z.string().optional(),
});

export function Avatar({ props }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const {
        alt,
        kind,
        name,
        src: source,
    } = resolveXmlProps(
        props,
        ctx,
        { alt: 'scalar', kind: 'scalar', name: 'scalar', src: 'scalar' },
        avatarPropsSchema
    );
    const src = resolveAnchorUrl(services.requestBaseUrl, source ?? '') || undefined;
    if (kind === 'organization') {
        return <UiAvatar kind="organization" name={name ?? ''} src={src} />;
    }

    return <UiAvatar alt={alt} name={name} src={src} />;
}
