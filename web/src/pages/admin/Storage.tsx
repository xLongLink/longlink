import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { HardDrive } from 'lucide-react';

/** Renders the admin storage page. */
export default function AdminStorage() {
    return (
        <Hero icon={<HardDrive />}>
            <div>
                <HeroTitle>Storage</HeroTitle>
                <HeroDescription>Review file storage integrations and object storage configuration.</HeroDescription>
            </div>
        </Hero>
    );
}
