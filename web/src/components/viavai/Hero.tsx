import type { ReactNode } from 'react';
import Button from '@/components/viavai/Button';
import { Icon } from '@/components/viavai/Icon';

type HeroProps = {
    title: string;
    subtitle?: string | null;
    action?: string | null;
    icon?: string | null;
    children?: ReactNode;
};

export function Hero({ title, subtitle, action, icon, children }: HeroProps) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
                {icon ? (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
                        <Icon
                            name={icon}
                            className="h-5 w-5 text-emerald-300"
                        />
                    </div>
                ) : null}

                <div>
                    <h2 className="text-lg font-semibold text-white">
                        {title}
                    </h2>
                    {subtitle ? (
                        <p className="text-sm text-white/60">{subtitle}</p>
                    ) : null}
                </div>
            </div>

            {action ? (
                <Button variant="outline" text={action}>
                    {children}
                </Button>
            ) : null}
        </div>
    );
}

export default Hero;
