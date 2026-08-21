import { z } from 'zod';
import type { Props } from '../types';
import { resolveAnchorUrl } from '../core/url';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';
import { Avatar as AstryxAvatar } from '@astryxdesign/core/Avatar';

const avatarPropsSchema = z.object({
    alt: z.string().optional(),
    fallbackSrc: z.string().optional(),
    name: z.string().optional(),
    src: z.string().optional(),
});

export function Avatar({ props }: Props) {
    const { scope: ctx, services } = useXmlRuntime();
    const {
        alt,
        fallbackSrc: fallbackSource,
        name,
        src: source,
    } = resolveXmlProps(
        props,
        ctx,
        { alt: 'scalar', fallbackSrc: 'scalar', name: 'scalar', src: 'scalar' },
        avatarPropsSchema
    );
    const src = resolveAnchorUrl(services.requestBaseUrl, source ?? '');
    const fallbackSrc = resolveAnchorUrl(services.requestBaseUrl, fallbackSource ?? '');

    return <AstryxAvatar alt={alt} fallbackSrc={fallbackSrc || undefined} name={name} src={src || undefined} />;
}
