import { isObject } from '@/lib/utils';

export type HeroElement = {
    type: 'hero';
    title: string;
    subtitle?: string | null;
};

type HeroProps = {
    title: string;
    subtitle?: string;
};

export function isHero(element: unknown): element is HeroElement {
    if (!isObject(element)) {
        return false;
    }

    return element.type === 'hero' && typeof element.title === 'string';
}

export function Hero({ title, subtitle }: HeroProps) {
    return (
        <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {subtitle ? (
                <p className="text-sm text-white/60">{subtitle}</p>
            ) : null}
        </div>
    );
}

export default Hero;
