type HeroProps = {
    title: string;
    subtitle?: string | null;
};

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
