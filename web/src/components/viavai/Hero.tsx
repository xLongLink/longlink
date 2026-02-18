import type { ReactNode } from 'react';
import Button from '@/components/viavai/Button';

type HeroProps = {
    title: string;
    subtitle?: string | null;
    action?: string | null;
    children?: ReactNode;
};

export function Hero({ title, subtitle, action, children }: HeroProps) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div>
                <h2 className="text-lg font-semibold text-white">{title}</h2>
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
