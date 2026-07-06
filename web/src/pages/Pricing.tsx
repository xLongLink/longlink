import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@ui/button';

const pricingOptions = [
    {
        nameKey: 'pricing.plans.starterName',
        priceKey: 'pricing.plans.starterPrice',
        descriptionKey: 'pricing.plans.starterDescription',
        features: [
            'pricing.plans.starterFeatureOne',
            'pricing.plans.starterFeatureTwo',
            'pricing.plans.starterFeatureThree',
        ],
        actionKey: 'pricing.plans.starterAction',
    },
    {
        nameKey: 'pricing.plans.teamName',
        priceKey: 'pricing.plans.teamPrice',
        descriptionKey: 'pricing.plans.teamDescription',
        features: ['pricing.plans.teamFeatureOne', 'pricing.plans.teamFeatureTwo', 'pricing.plans.teamFeatureThree'],
        actionKey: 'pricing.plans.teamAction',
    },
    {
        nameKey: 'pricing.plans.platformName',
        priceKey: 'pricing.plans.platformPrice',
        descriptionKey: 'pricing.plans.platformDescription',
        features: [
            'pricing.plans.platformFeatureOne',
            'pricing.plans.platformFeatureTwo',
            'pricing.plans.platformFeatureThree',
        ],
        actionKey: 'pricing.plans.platformAction',
    },
] as const;

/** Renders the public pricing page. */
export default function Pricing() {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="min-h-[calc(100vh-9rem)]">
                <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-20 sm:py-28">
                    <div className="max-w-2xl space-y-4">
                        <p className="text-sm font-medium tracking-[0.24em] text-accent uppercase">
                            {t('pricing.eyebrow')}
                        </p>
                        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                            {t('pricing.title')}
                        </h1>
                        <p className="text-lg leading-8 text-muted-foreground">{t('pricing.description')}</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        {pricingOptions.map((option) => {
                            const price = t(option.priceKey);

                            return (
                                <article
                                    key={option.nameKey}
                                    className="flex min-h-96 flex-col rounded-lg border border-border bg-card p-6 shadow-sm"
                                >
                                    <div className="space-y-3">
                                        <h2 className="text-xl font-semibold">{t(option.nameKey)}</h2>
                                        <div className="flex items-end gap-2">
                                            <span className="text-4xl font-semibold tracking-tight">{price}</span>
                                            {option.priceKey === 'pricing.plans.teamPrice' ? (
                                                <span className="pb-1 text-sm text-muted-foreground">
                                                    {t('pricing.month')}
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="min-h-16 text-sm leading-6 text-muted-foreground">
                                            {t(option.descriptionKey)}
                                        </p>
                                    </div>

                                    <ul className="mt-8 flex-1 space-y-3 text-sm text-muted-foreground">
                                        {option.features.map((feature) => (
                                            <li key={feature} className="flex gap-3">
                                                <span className="mt-2 size-1.5 rounded-full bg-accent" />
                                                <span>{t(feature)}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <Button
                                        className="mt-8 w-full"
                                        variant={option.nameKey === 'pricing.plans.teamName' ? 'default' : 'outline'}
                                    >
                                        {t(option.actionKey)}
                                    </Button>
                                </article>
                            );
                        })}
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
