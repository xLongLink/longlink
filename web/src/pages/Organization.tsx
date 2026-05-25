import Layout from '@/Layout';
import { useOrg } from '@/hooks/use-org';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Menu, MenuSection } from '@ui/menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table';
import { Boxes, Building2, Mail, Settings2, Users } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useParams } from 'react-router';
import NotFound from './NotFound';

/** Renders the organization page shell and tab-specific hero content. */
export default function Organization() {
    const { org = '' } = useParams();
    const { pathname } = useLocation();
    const section = pathname.split('/')[2] ?? '';
    const [peopleSection, setPeopleSection] = useState<'members' | 'invitations'>('members');
    const { people, isLoading, error } = useOrg(org);

    // Hide missing or inaccessible orgs behind the shared 404 page.
    if (error?.status === 404) {
        return <NotFound />;
    }

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
            <section className="space-y-8">
                {content}

                {section === 'people' ? (
                    <Menu
                        value={peopleSection}
                        onValueChange={(value) => setPeopleSection(value as 'members' | 'invitations')}
                        defaultValue="members"
                        className="items-start"
                        ariaLabel="People menu"
                    >
                        <MenuSection value="members" label="Members" icon={Users}>
                            <div className="w-full overflow-hidden rounded-2xl border border-border bg-card/80">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={1} className="py-8 text-sm text-muted-foreground">
                                                    Loading people...
                                                </TableCell>
                                            </TableRow>
                                        ) : error ? (
                                            <TableRow>
                                                <TableCell colSpan={1} className="py-8 text-sm text-destructive">
                                                    Failed to load people.
                                                </TableCell>
                                            </TableRow>
                                        ) : people.length ? (
                                            people.map((user) => (
                                                <TableRow key={user.id}>
                                                    <TableCell className="whitespace-normal">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="size-8">
                                                                <AvatarImage
                                                                    src={user.avatar ?? ''}
                                                                    alt={`${user.name} avatar`}
                                                                />
                                                                <AvatarFallback>
                                                                    {user.name.slice(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0 space-y-0.5">
                                                                <p className="text-sm font-medium text-foreground">
                                                                    {user.name}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {user.email}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={1} className="py-8 text-sm text-muted-foreground">
                                                    No people found.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </MenuSection>

                        <MenuSection value="invitations" label="Invitations" icon={Mail}>
                            <div className="w-full overflow-hidden rounded-2xl border border-border bg-card/80">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invitation</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="py-8 text-sm text-muted-foreground">
                                                No invitations yet.
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </MenuSection>
                    </Menu>
                ) : null}
            </section>
        </Layout>
    );
}
