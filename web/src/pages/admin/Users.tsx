import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Users } from 'lucide-react';

/** Renders the admin users page. */
export default function AdminUsers() {
    return (
        <Hero icon={<Users />}>
            <div>
                <HeroTitle>Users</HeroTitle>
                <HeroDescription>Review account access, elevated users, and admin onboarding.</HeroDescription>
            </div>
        </Hero>
    );
}
