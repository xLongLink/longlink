import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Cpu } from 'lucide-react';

/** Renders the admin compute page. */
export default function AdminCompute() {
    return (
        <Hero icon={<Cpu />}>
            <div>
                <HeroTitle>Compute</HeroTitle>
                <HeroDescription>Inspect runtime workloads, node capacity, and orchestration status.</HeroDescription>
            </div>
        </Hero>
    );
}
