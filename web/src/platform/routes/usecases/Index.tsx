import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Seo } from '@/platform/components/Seo';
import { Stack } from '@astryxdesign/core/Stack';
import { useCasePages } from '@/platform/usecases';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';

/** Introduces the showcase and links to the Real Estate example. */
export default function UseCasesIndex() {
    // Reuse Pricing's page width, centered introduction, and square transparent card styling.
    return (
        <>
            <Seo
                description="Explore an illustrative Real Estate Solution for property acquisition screening with LongLink."
                title="Use Cases | LongLink"
            />
            <main className="flex-1">
                <Section variant="transparent" padding={6}>
                    <Stack className="mx-auto" width="100%" maxWidth={1120} gap={10} align="center">
                        <Stack className="text-center" gap={3} hAlign="center" width="100%">
                            <Heading
                                className="font-(family-name:--font-family-handwritten) tracking-wide uppercase"
                                justify="center"
                                level={1}
                                type="display-2"
                                textWrap="balance"
                            >
                                Use Cases
                            </Heading>
                            <Text as="p" className="text-lg sm:text-xl" color="secondary" textWrap="pretty">
                                Explore business workflows you can build with LongLink.
                            </Text>
                        </Stack>
                        <Grid columns={{ minWidth: 280, max: 3, repeat: 'fill' }} gap={6} width="100%">
                            <ClickableCard
                                href={`${useCasePages[0].path}/`}
                                label={useCasePages[0].label}
                                className="rounded-none bg-transparent"
                                variant="default"
                                padding={6}
                            >
                                <Stack gap={4} align="center">
                                    <Stack width="100%" maxWidth={160}>
                                        <img
                                            src="/images/property-screening.png"
                                            alt="Property screening illustration with a house, magnifying glass, checklist, map, and financial chart."
                                            className="h-auto w-full object-contain"
                                            width={1312}
                                            height={1199}
                                            decoding="async"
                                        />
                                    </Stack>
                                    <Heading level={3} accessibilityLevel={2} justify="center" textWrap="balance">
                                        {useCasePages[0].label}
                                    </Heading>
                                </Stack>
                            </ClickableCard>
                        </Grid>
                    </Stack>
                </Section>
            </main>
        </>
    );
}
