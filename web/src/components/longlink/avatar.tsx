import { UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import * as dicebear from '@dicebear/core';
import waves from '@dicebear/styles/waves.json' with { type: 'json' };
import glyphs from '@dicebear/styles/glyphs.json' with { type: 'json' };
import { Avatar as AvatarRoot, AvatarImage, AvatarFallback } from '@/components/shadcn/avatar';

// Use a subdued palette for generated user avatars without altering their shapes.
const glyphsStyle = new dicebear.Style({
    ...glyphs,
    colors: {
        ...glyphs.colors,
        glyph: {
            ...glyphs.colors.glyph,
            values: ['#899bb3', '#858aa5', '#8c8c8c', '#8da58b', '#b5a18b', '#b38d94', '#a18eaf']
        }
    }
});

const wavesStyle = new dicebear.Style(waves);

/* oxlint-disable anti-slop/no-shape-in-symbol-names -- "shape" is the existing public avatar geometry prop. */
type AvatarProps = { shape?: undefined | 'circle' | 'rounded' | 'square' } & {
    name?: string;
    /** Stable identity for generated avatars, independent of the display name. */
    seed?: string;
    /** Organization owners use rounded Waves avatars; user owners retain the supplied geometry or a circle. */
    kind?: 'user' | 'organization';
    src?: string | null;
    alt?: string;
    size?: 'sm' | 'default' | 'lg';
};
/* oxlint-enable anti-slop/no-shape-in-symbol-names */

/** Uses local Waves fallbacks for rounded organization avatars and Glyphs for users. */
export function GeneratedAvatar({ kind, src, name, seed, ...props }: AvatarProps) {
    // Native pages identify the owner; existing Views may still supply the geometry prop.
    props.shape = kind === 'organization' ? 'rounded' : (props.shape ?? 'circle');

    // Prefer stable identities while preserving the artwork selected by the effective geometry.
    const style = props.shape === 'rounded' ? wavesStyle : glyphsStyle;
    const identity = seed?.trim() || name?.trim() || 'avatar';

    // Reuse fallback artwork until its effective style or identity changes.
    const fallbackSrc = useMemo(() => {
        const avatar = new dicebear.Avatar(style, { seed: identity });

        return avatar.toDataUri();
    }, [style, identity]);

    // Failed sources do not prevent a new URL or identity from loading.
    const [erroredSrc, setErroredSrc] = useState<string>();
    const [erroredFallbackSrc, setErroredFallbackSrc] = useState<string>();
    const primarySrc = src?.trim() || undefined;

    const imageSrc =
        primarySrc && primarySrc !== erroredSrc
            ? primarySrc
            : fallbackSrc !== erroredFallbackSrc
              ? fallbackSrc
              : undefined;

    const accessibleName = props.alt?.trim() ? props.alt : name?.trim() ? name : undefined;

    const initials =
        name
            ?.trim()
            .split(/\s+/)
            .flatMap((word) => {
                const index = word.search(/[\p{L}\p{N}\p{Extended_Pictographic}\p{Regional_Indicator}]/u);

                if (index === -1) return [];

                const first = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
                    .segment(word.slice(index))
                    [Symbol.iterator]()
                    .next();

                return first.done ? [] : [first.value.segment];
            }) ?? [];

    const initialsText = (initials.length > 1 ? `${initials[0]}${initials.at(-1)}` : initials[0])?.toUpperCase();

    return (
        <AvatarRoot
            role={accessibleName ? 'img' : 'presentation'}
            aria-label={accessibleName}
            aria-hidden={accessibleName ? undefined : true}
            size={props.size}
            className={[
                'overflow-hidden [&>[data-slot=avatar-image]]:rounded-[inherit] [&>[data-slot=avatar-fallback]]:rounded-[inherit] after:rounded-[inherit]',
                props.shape === 'circle' ? 'rounded-full' : props.shape === 'rounded' ? 'rounded-lg' : 'rounded-none'
            ].join(' ')}
        >
            {imageSrc ? (
                <AvatarImage
                    key={imageSrc}
                    src={imageSrc}
                    alt=""
                    keepMounted
                    onError={() => {
                        if (imageSrc === primarySrc) setErroredSrc(imageSrc);
                        else setErroredFallbackSrc(imageSrc);
                    }}
                />
            ) : (
                <AvatarFallback aria-hidden="true">{initialsText || <UserRound className="size-3/5" />}</AvatarFallback>
            )}
        </AvatarRoot>
    );
}
