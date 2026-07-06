import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { useTranslation } from '@/lib/i18n';
import { buttonVariants } from '@ui/button';
import { ArrowRight, Braces, CheckCircle2, Code2, Fingerprint, Mail, Rocket, Wrench } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';

const homepageCards = [
    {
        titleKey: 'home.cards.realTitle',
        descriptionKey: 'home.cards.realDescription',
        conceptKeys: ['home.cards.realConceptOne', 'home.cards.realConceptTwo', 'home.cards.realConceptThree'],
        icon: Code2,
    },
    {
        titleKey: 'home.cards.foundationTitle',
        descriptionKey: 'home.cards.foundationDescription',
        conceptKeys: [
            'home.cards.foundationConceptOne',
            'home.cards.foundationConceptTwo',
            'home.cards.foundationConceptThree',
            'home.cards.foundationConceptFour',
        ],
        icon: Fingerprint,
    },
    {
        titleKey: 'home.cards.pythonTitle',
        descriptionKey: 'home.cards.pythonDescription',
        conceptKeys: [
            'home.cards.pythonConceptOne',
            'home.cards.pythonConceptTwo',
            'home.cards.pythonConceptThree',
            'home.cards.pythonConceptFour',
        ],
        icon: Braces,
    },
    {
        titleKey: 'home.cards.localTitle',
        descriptionKey: 'home.cards.localDescription',
        conceptKeys: [
            'home.cards.localConceptOne',
            'home.cards.localConceptTwo',
            'home.cards.localConceptThree',
            'home.cards.localConceptFour',
        ],
        icon: Rocket,
    },
    {
        titleKey: 'home.cards.costTitle',
        descriptionKey: 'home.cards.costDescription',
        conceptKeys: [
            'home.cards.costConceptOne',
            'home.cards.costConceptTwo',
            'home.cards.costConceptThree',
            'home.cards.costConceptFour',
        ],
        icon: CheckCircle2,
    },
    {
        titleKey: 'home.cards.evolveTitle',
        descriptionKey: 'home.cards.evolveDescription',
        conceptKeys: ['home.cards.evolveConceptOne', 'home.cards.evolveConceptTwo', 'home.cards.evolveConceptThree'],
        icon: Wrench,
    },
] as const;

/** Renders the public home page. */
export default function Home() {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen overflow-hidden bg-background text-foreground">
            <Navbar />
            <main className="relative -mt-[84px] flex min-h-screen w-full items-center justify-center px-6 pb-10 pt-28">
                <div
                    aria-hidden="true"
                    className="absolute inset-0 overflow-hidden"
                    style={
                        {
                            '--horizon-accent': 'var(--accent)',
                            '--horizon-background': 'var(--background)',
                        } as CSSProperties
                    }
                >
                    <div
                        className="absolute inset-0"
                        style={
                            {
                                background:
                                    'radial-gradient(68% 18% at 50% 74%, color-mix(in oklch, var(--horizon-accent) 34%, var(--horizon-background) 66%) 0 4%, color-mix(in oklch, var(--horizon-accent) 20%, transparent) 24%, transparent 72%), radial-gradient(98% 30% at 50% 82%, color-mix(in oklch, var(--horizon-accent) 20%, var(--horizon-background) 80%) 0 8%, color-mix(in oklch, var(--horizon-accent) 16%, transparent) 34%, transparent 76%), linear-gradient(180deg, var(--horizon-background) 0 54%, color-mix(in oklch, var(--horizon-accent) 10%, var(--horizon-background)) 76%, var(--horizon-background) 100%)',
                            } as CSSProperties
                        }
                    />
                    <div
                        className="absolute"
                        style={
                            {
                                background: 'var(--horizon-background)',
                                boxShadow:
                                    '0 -1px 0 color-mix(in oklch, var(--horizon-accent) 50%, var(--horizon-background) 50%), 0 -18px 54px color-mix(in oklch, var(--horizon-accent) 36%, transparent), 0 -44px 130px color-mix(in oklch, var(--horizon-accent) 18%, transparent)',
                                right: '-16%',
                                bottom: '-17%',
                                left: '-16%',
                                height: '45%',
                                borderRadius: '50% 50% 0 0',
                                transform: 'perspective(900px) rotateX(12deg)',
                                transformOrigin: 'center bottom',
                            } as CSSProperties
                        }
                    />
                    <div
                        className="absolute"
                        style={
                            {
                                right: '8%',
                                bottom: '11%',
                                left: '8%',
                                height: '24%',
                                background:
                                    'radial-gradient(50% 54% at 50% 100%, color-mix(in oklch, var(--horizon-accent) 22%, var(--horizon-background) 78%) 0 2%, color-mix(in oklch, var(--horizon-accent) 26%, transparent) 18%, transparent 72%)',
                                filter: 'blur(22px)',
                                opacity: 0.9,
                            } as CSSProperties
                        }
                    />
                </div>
                <section className="relative z-10 mx-auto flex w-full max-w-5xl -translate-y-16 flex-col items-center text-center sm:-translate-y-24">
                    <div className="space-y-5">
                        <h1 className="mx-auto flex max-w-4xl flex-col items-center text-center text-[1.875rem] font-medium leading-[1.02] text-foreground min-[420px]:text-[2.25rem] sm:text-6xl lg:text-7xl">
                            <span className="block whitespace-nowrap text-center">{t('home.heroLineOne')}</span>
                            <span className="mt-1 block whitespace-nowrap text-center">{t('home.heroLineTwo')}</span>
                        </h1>
                        <p className="mx-auto text-sm leading-6 text-muted-foreground sm:text-lg">
                            <span className="mx-auto block">{t('home.heroIntroOne')}</span>
                            <span className="mx-auto block">{t('home.heroIntroTwo')}</span>
                            <span className="mx-auto block">{t('home.heroIntroThree')}</span>
                            <span className="mx-auto block">{t('home.heroIntroFour')}</span>
                            <span className="mx-auto block">{t('home.heroIntroFive')}</span>
                        </p>
                    </div>
                </section>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-24 bg-gradient-to-t from-background to-transparent" />
            </main>
            <section className="relative z-10 bg-background px-6 py-10">
                <div className="mx-auto grid w-full max-w-[1000px] auto-rows-[minmax(190px,auto)] grid-cols-1 gap-3 md:grid-cols-3">
                    {homepageCards.map(({ titleKey, descriptionKey, conceptKeys, icon: Icon }) => (
                        <article
                            key={titleKey}
                            className="group relative overflow-hidden rounded-lg border border-border bg-card/80 p-5 text-card-foreground shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-md transition-colors hover:border-accent/50"
                        >
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent opacity-60" />
                            <div className="absolute -right-16 -top-20 size-44 rounded-full bg-accent/10 blur-3xl transition-opacity group-hover:opacity-80" />

                            <div className="relative flex h-full flex-col justify-between gap-8">
                                <div className="flex size-9 items-center justify-center rounded-md border border-border bg-background/70 text-accent">
                                    <Icon className="size-4" aria-hidden="true" />
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-medium text-card-foreground">{t(titleKey)}</h3>
                                        <p className="max-w-md text-sm leading-6 text-muted-foreground">
                                            {t(descriptionKey)}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {conceptKeys.map((conceptKey) => (
                                            <span
                                                key={conceptKey}
                                                className="rounded-full border border-border bg-background/70 px-2 py-1 text-[11px] font-medium text-muted-foreground"
                                            >
                                                {t(conceptKey)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
            <section className="relative z-10 bg-background px-6 py-16 text-center">
                <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
                    <div className="space-y-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
                            {t('home.ctaEyebrow')}
                        </p>
                        <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-4xl">
                            {t('home.ctaTitle')}
                        </h2>
                        <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                            {t('home.ctaDescription')}
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3">
                        <Link to="/docs/sdk" className={buttonVariants({ size: 'lg', className: 'px-4' })}>
                            {t('actions.getStarted')}
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                        <a
                            href="mailto:info@longlink.ch"
                            className={buttonVariants({ variant: 'outline', size: 'lg', className: 'px-4' })}
                        >
                            <Mail className="size-4" aria-hidden="true" />
                            {t('home.ctaContact')}
                        </a>
                    </div>
                </div>
            </section>
            <div className="relative z-10 bg-background">
                <Footer />
            </div>
        </div>
    );
}
