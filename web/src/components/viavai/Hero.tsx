import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

type HeroProps = {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    element?: ReactNode;
};

export function Hero({ title, subtitle, icon: Icon, element }: HeroProps) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
                {Icon ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30">
                        <Icon className="h-5 w-5" />
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
            {element ? <div>{element}</div> : null}
        </div>
    );
}

export default Hero;
