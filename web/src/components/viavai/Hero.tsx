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
            <div>
                <div className="flex items-center gap-2">
                    {icon ? (
                        <Icon name={icon} className="h-5 w-5 text-white" />
                    ) : null}
                    <h2 className="text-lg font-semibold text-white">
                        {title}
                    </h2>
                </div>
                {subtitle ? (
                    <p className="text-sm text-white/60">{subtitle}</p>
                ) : null}
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
