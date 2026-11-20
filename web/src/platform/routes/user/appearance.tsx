import { Card } from '@/components/longlink/layout/card';
import { useUpdateUser } from '@/platform/hooks/use-user';
import { useAppearance } from '@/lib/hooks/use-appearance';

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
                        <Card
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
                            <div className="flex flex-col gap-2">
                                <span>{label}</span>
                                <img
                                    src={`/images/${image}`}
                                    alt=""
                                    width={1536}
                                    height={1024}
                                    className="aspect-3/2 w-40 max-w-full rounded-md object-cover"
                                />
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
            {userUpdate.isPending && (
                <span role="status" className="text-xs text-muted-foreground">
                    Saving theme…
                </span>
            )}
        </div>
    );
}
