import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Building2 } from 'lucide-react';

/** Renders the admin organizations page. */
export default function AdminOrganization() {
    return (
        <Hero icon={<Building2 />}>
            <div>
                <HeroTitle>Organizations</HeroTitle>
                <HeroDescription>Review organization lifecycle, ownership, and access boundaries.</HeroDescription>
            </div>
        </Hero>
    );
}
