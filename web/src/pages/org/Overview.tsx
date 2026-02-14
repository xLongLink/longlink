import { MapPin, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Overview() {
    return (
        <div className="space-y-8">
            <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
                <div className="flex flex-col items-start">
                    <div className="relative">
                        <div className="flex h-44 w-44 items-center justify-center rounded-full bg-blue-600 text-5xl font-semibold text-white shadow-lg shadow-blue-600/30">
                            LO
                        </div>
                        <Button
                            size="icon"
                            variant="secondary"
                            className="absolute bottom-2 right-2 h-10 w-10 rounded-full"
                        >
                            <Settings className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="mt-6 space-y-1">
                        <h2 className="text-2xl font-semibold text-white">
                            LongLink
                        </h2>
                        <p className="text-sm text-white/60">org-longlink</p>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-white/60">
                        <MapPin className="h-4 w-4" />
                        <span>Switzerland</span>
                    </div>
                    <div className="mt-6 h-px w-full bg-white/10" />
                </div>

                <Card className="border-white/10 bg-white/5 p-8">
                    <h2 className="text-xl font-semibold text-white">
                        Mission, Vision &amp; Values
                    </h2>
                    <div className="mt-6 space-y-6 text-sm leading-relaxed text-white/70">
                        <p>
                            <span className="font-semibold text-blue-400">
                                Our Mission:
                            </span>{' '}
                            We empower organizations to build better software,
                            faster. By streamlining collaboration and providing
                            cutting-edge tools, we enable teams to focus on what
                            truly matters—creating exceptional products that
                            delight users.
                        </p>
                        <p>
                            <span className="font-semibold text-blue-400">
                                Our Vision:
                            </span>{' '}
                            To become the most trusted platform for modern
                            software development, where innovation meets
                            simplicity. We envision a future where every team,
                            regardless of size, has access to world-class
                            development infrastructure.
                        </p>
                        <p>
                            <span className="font-semibold text-blue-400">
                                Our Values:
                            </span>{' '}
                            We believe in transparency, continuous learning, and
                            putting our community first. We&apos;re committed to
                            building sustainable solutions that respect both our
                            users and the environment, while fostering a culture
                            of inclusivity and excellence.
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
