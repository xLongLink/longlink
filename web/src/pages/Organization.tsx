import Layout from '@/Layout';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Boxes, Building2, Settings2, Users } from 'lucide-react';
import { useLocation, useParams } from 'react-router';

/** Renders the organization page shell and tab-specific hero content. */
export default function Organization() {
    const { org = '' } = useParams();
    const { pathname } = useLocation();
    const section = pathname.split('/')[2] ?? '';

    let content = (
        <Hero icon={<Building2 />}>
            <div>
                <HeroTitle>Overview</HeroTitle>
                <HeroDescription>High-level workspace details will live here.</HeroDescription>
            </div>
        </Hero>
    );

    // Swap the hero based on the active path segment.
    if (section === 'apps') {
        content = (
            <Hero icon={<Boxes />}>
                <div>
                    <HeroTitle>Applications</HeroTitle>
                    <HeroDescription>Manage the apps attached to this organization.</HeroDescription>
                </div>
            </Hero>
        );
    } else if (section === 'people') {
        content = (
            <Hero icon={<Users />}>
                <div>
                    <HeroTitle>People</HeroTitle>
                    <HeroDescription>See the members and collaborators in this workspace.</HeroDescription>
                </div>
            </Hero>
        );
    } else if (section === 'settings') {
        content = (
            <Hero icon={<Settings2 />}>
                <div>
                    <HeroTitle>Settings</HeroTitle>
                    <HeroDescription>Configure the organization and its runtime defaults.</HeroDescription>
                </div>
            </Hero>
        );
    }

    return (
        <Layout
            tabs={{
                Overview: `/${org}`,
                Applications: `/${org}/apps`,
                People: `/${org}/people`,
                Settings: `/${org}/settings`,
            }}
        >
            {content}
        </Layout>
    );
}
