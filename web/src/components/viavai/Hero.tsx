import type { ReactNode } from 'react';
import Button from '@/components/viavai/Button';
import { Icon } from '@/components/viavai/Icon';

type HeroProps = {
    icon?: string | null;
    title: string;
    action?: string | null;
    subtitle?: string | null;
    children?: ReactNode;
};


/* 
    A Hero component, it allows to to display a basic information about a page.
    It can be used with a single title, with a subtitle, with an action button that opens a dialog (with a form)
    It supports an icon
*/
export function Hero({ title, subtitle, action, icon, children }: HeroProps) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
                {icon ? (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border">
                        <Icon
                            name={icon}
                            className="h-5 w-5"
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
