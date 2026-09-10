import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';

/** Renders the presentation title image. */
export function TitleSlide() {
    return (
        <Stack align="center" className="relative" height="100%" justify="center" width="100%">
            <img
                alt="Human and robot hands reaching toward each other"
                className="h-full w-full pointer-events-none select-none object-contain"
                draggable={false}
                src="/images/human-robot-hands.png"
            />
            <Stack className="absolute bottom-16 start-16 text-7xl [&>span]:items-end">
                <Wordmark size="inherit" />
            </Stack>
        </Stack>
    );
}
