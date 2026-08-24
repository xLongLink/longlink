import { Link } from '@astryxdesign/core/Link';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';
import { Center } from '@astryxdesign/core/Center';
import { Divider } from '@astryxdesign/core/Divider';

/** Renders the fixed LongLink header for public side navigation. */
export function SideNavHeader() {
    return (
        <Stack className="-my-2">
            <Center className="lg:mt-2" height={64} width="100%">
                <Link href="/" label="LongLink home" color="inherit">
                    <Wordmark size="heading" />
                </Link>
            </Center>
            <Stack paddingInline={2}>
                <Divider />
            </Stack>
        </Stack>
    );
}
