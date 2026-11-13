import { Circle, Check } from 'lucide-react';
import { accentColors } from '@/lib/appearance';
import { Button } from '@/components/shadcn/button';
import { useUpdateUser } from '@/lib/hooks/use-user';
import { useAppearance } from '@/lib/hooks/use-appearance';
import { Card, CardContent } from '@/components/shadcn/card';
import { NativeText as Text } from '@/components/custom/native-text';
import { InteractiveCard } from '@/components/custom/interactive-card';
import { NativeHeading as Heading } from '@/components/custom/native-heading';

/** Previews and saves personal appearance without changing any Solution configuration. */
export default function AppearanceSettings() {
    const { appearance } = useAppearance();
    const userUpdate = useUpdateUser();

    return (
        <div className="flex flex-col gap-(--spacing-6)">
            <div className="flex flex-col gap-(--spacing-3)" role="group" aria-label="Theme">
                <Heading level={4} accessibilityLevel={3}>
                    Theme
                </Heading>
                <div className="flex flex-wrap gap-(--spacing-3)">
                    {(
                        [
                            { value: 'system', label: 'System', image: 'theme_auto.png' },
                            { value: 'light', label: 'Light', image: 'theme_light.png' },
                            { value: 'dark', label: 'Dark', image: 'theme_dark.png' }
                        ] as const
                    ).map(({ value, label, image }) => (
                        <InteractiveCard
                            key={value}
                            label={label}
                            size="sm"
                            isSelected={appearance.theme === value}
                            isDisabled={userUpdate.isPending}
                            onChange={() => {
                                if (!userUpdate.isPending && appearance.theme !== value)
                                    userUpdate.mutate({ theme: value });
                            }}
                        >
                            <CardContent className="flex flex-col gap-2">
                                <Text>{label}</Text>
                                <img
                                    src={`/images/${image}`}
                                    alt=""
                                    width={1536}
                                    height={1024}
                                    className="aspect-3/2 w-40 max-w-full rounded-md object-cover"
                                />
                            </CardContent>
                        </InteractiveCard>
                    ))}
                </div>
            </div>
            <div className="flex flex-col gap-(--spacing-3)">
                <Heading level={4} accessibilityLevel={3}>
                    Appearance
                </Heading>
                <Card size="sm">
                    <CardContent className="flex flex-col gap-2" role="group" aria-label="Accent color">
                        <Text>Accent color</Text>
                        <div className="flex flex-wrap gap-(--spacing-2)">
                            {accentColors.map((accent) => (
                                <Button
                                    key={accent}
                                    type="button"
                                    variant="outline"
                                    aria-pressed={appearance.accent === accent}
                                    disabled={userUpdate.isPending}
                                    onClick={() => {
                                        if (!userUpdate.isPending && appearance.accent !== accent)
                                            userUpdate.mutate({ accent });
                                    }}
                                >
                                    {appearance.accent === accent ? (
                                        <Check size={16} data-accent-swatch={accent} aria-hidden="true" />
                                    ) : (
                                        <Circle
                                            size={16}
                                            data-accent-swatch={accent}
                                            fill="currentColor"
                                            aria-hidden="true"
                                        />
                                    )}
                                    {accent.charAt(0).toUpperCase() + accent.slice(1)}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
            {userUpdate.isPending && (
                <Text type="supporting" color="secondary" role="status">
                    Saving appearance…
                </Text>
            )}
        </div>
    );
}
