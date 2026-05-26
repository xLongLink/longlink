import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Database } from 'lucide-react';

/** Renders the admin database page. */
export default function AdminDatabase() {
    return (
        <Hero icon={<Database />}>
            <div>
                <HeroTitle>Database</HeroTitle>
                <HeroDescription>Monitor control-plane data, schema health, and persistence state.</HeroDescription>
            </div>
        </Hero>
    );
}
