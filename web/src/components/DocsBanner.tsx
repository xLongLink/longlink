import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { Stack } from '@astryxdesign/core/Stack';

// Map each documentation section to its dedicated crop-free banner.
const banners = {
    agents: {
        label: 'LongLink agents connecting Platform infrastructure and Applications',
        src: '/images/docs-agents-banner.png',
    },
    applications: {
        label: 'LongLink Application buildings',
        src: '/images/docs-applications-banner.png',
    },
    organizations: {
        label: 'LongLink Organization infrastructure',
        src: '/images/docs-organizations-banner.png',
    },
    overview: {
        label: 'LongLink Platform infrastructure and Application buildings',
        src: '/images/docs-overview-banner.png',
    },
} as const;

/** Renders a crop-free illustration for a LongLink documentation section. */
export function DocsBanner({ variant }: { variant: keyof typeof banners }) {
    // Resolve the requested section's accessible label and asset.

    const banner = banners[variant];

    // Keep the container and source image at the same fixed ratio.

    return (
        <Stack
            as="figure"
            aria-label={banner.label}
            role="img"
            className="overflow-hidden rounded-lg border border-emphasized bg-body"
            width="100%"
        >
            <AspectRatio ratio={4} fit="contain">
                <img alt="" aria-hidden="true" src={banner.src} />
            </AspectRatio>
        </Stack>
    );
}
