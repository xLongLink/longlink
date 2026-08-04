import { Stack } from '@astryxdesign/core/Stack';

/** Renders the compact LongLink city scene. */
export function DocsCityBanner() {
    return (
        <Stack
            as="figure"
            aria-label="LongLink city infrastructure"
            role="img"
            className="relative h-40 overflow-hidden rounded-lg border border-emphasized bg-body sm:h-48"
            width="100%"
        >
            <img
                alt=""
                aria-hidden="true"
                className="size-full object-cover object-center"
                src="/images/after-longlink.png"
            />
        </Stack>
    );
}
