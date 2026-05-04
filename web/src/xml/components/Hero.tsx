import type { ReactNode } from 'react';
import { Icon } from '@/xml/components/Icon';
import { Button } from '@/ui/button';
import { Dialog, DialogTrigger } from '@/ui/dialog';

type HeroProps = {
    icon?: string | null;
    title: string;
    subtitle?: string | null;
    action?: string | null;
    children?: ReactNode;
};

export function Hero({ title, subtitle, icon, action, children }: HeroProps) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
                {icon ? (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border">
                        <Icon name={icon} className="h-5 w-5" />
                    </div>
                ) : null}

                <div>
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                    {subtitle ? <p className="text-sm text-white/60">{subtitle}</p> : null}
                </div>
            </div>

            {action ? (
                children ? (
                    <Dialog>
                        <DialogTrigger render={<Button variant="outline" className="cursor-pointer" />}>
                            {action}
                        </DialogTrigger>
                        {children}
                    </Dialog>
                ) : (
                    <Button variant="outline">{action}</Button>
                )
            ) : children ? (
                <div className="shrink-0">{children}</div>
            ) : null}
        </div>
    );
}

export default Hero;
