import { Circle, Check } from 'lucide-react';
import { accentColors } from '@/lib/appearance';
import { Button } from '@/components/shadcn/button';
import { useUpdateUser } from '@/lib/hooks/use-user';
import { useAppearance } from '@/lib/hooks/use-appearance';
import { Card, CardContent } from '@/components/shadcn/card';
import { InteractiveCard } from '@/components/custom/interactive-card';

/** Previews and saves personal appearance without changing any Solution configuration. */
export default function AppearanceSettings() {
    const appearance = useAppearance();
    const userUpdate = useUpdateUser();

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3" role="group" aria-label="Theme">
                <h4 className="font-semibold tracking-tight text-xl" aria-level={3}>
                    Theme
                </h4>
                <div className="flex flex-wrap gap-3">
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
                                <span>{label}</span>
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
            <div className="flex flex-col gap-3">
                <h4 className="font-semibold tracking-tight text-xl" aria-level={3}>
                    Appearance
                </h4>
                <Card size="sm">
                    <CardContent className="flex flex-col gap-2" role="group" aria-label="Accent color">
                        <span>Accent color</span>
                        <div className="flex flex-wrap gap-2">
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
                <span role="status" className="text-xs text-muted-foreground">
                    Saving appearance…
                </span>
            )}
        </div>
    );
}
