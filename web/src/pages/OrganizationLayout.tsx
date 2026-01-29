import {
    BarChart3,
    BookOpen,
    Briefcase,
    Building2,
    FolderKanban,
    LayoutGrid,
    MapPin,
    Newspaper,
    Settings,
    Users,
} from 'lucide-react';
import { NavLink, Outlet, useParams } from 'react-router';

export function OrganizationLayout() {
    const { org = '' } = useParams();
    const organizationName = formatOrganizationName(org || 'org');
    const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
        [
            'relative flex items-center gap-2 px-1 py-3 text-sm font-medium transition',
            isActive
                ? 'text-white after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:bg-blue-500'
                : 'text-white/70 hover:text-white',
        ].join(' ');

    return (
        <div className="min-h-screen bg-[#0b0f14] text-white">
            <div className="relative">
                <header className="border-b border-white/10">
                    <div className="mx-auto w-full max-w-6xl px-6 pb-2 pt-4">
                        <div className="flex items-center justify-between gap-6">
                            <div className="flex items-center gap-4 text-white/80">
                                <NavLink
                                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-blue-300 transition hover:bg-white/10"
                                    to="/"
                                >
                                    <BarChart3 className="h-5 w-5" />
                                </NavLink>
                                <span className="text-sm font-semibold text-white/70">
                                    {organizationName}
                                </span>
                            </div>
                        </div>
                    </div>
                    <nav className="flex w-full flex-wrap items-center gap-6 px-6 pb-2 text-sm">
                        <NavLink className={navLinkClasses} end to={`/${org}`}>
                            <LayoutGrid className="h-4 w-4" />
                            Overview
                        </NavLink>
                        <NavLink
                            className={navLinkClasses}
                            to={`/${org}/projects`}
                        >
                            <FolderKanban className="h-4 w-4" />
                            Projects
                        </NavLink>
                        <NavLink
                            className={navLinkClasses}
                            to={`/${org}/offering`}
                        >
                            <Briefcase className="h-4 w-4" />
                            Offerings
                        </NavLink>
                        <NavLink
                            className={navLinkClasses}
                            to={`/${org}/careers`}
                        >
                            <Building2 className="h-4 w-4" />
                            Careers
                        </NavLink>
                        <NavLink className={navLinkClasses} to={`/${org}/news`}>
                            <Newspaper className="h-4 w-4" />
                            News
                        </NavLink>
                        <NavLink
                            className={navLinkClasses}
                            to={`/${org}/people`}
                        >
                            <Users className="h-4 w-4" />
                            People
                        </NavLink>
                        <NavLink
                            className={navLinkClasses}
                            to={`/${org}/documents`}
                        >
                            <BookOpen className="h-4 w-4" />
                            Documents
                        </NavLink>
                    </nav>
                </header>

                <main className="mx-auto grid w-full max-w-6xl gap-8 px-6 pb-16 pt-10 lg:grid-cols-[320px_1fr]">
                    <aside className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                        <div className="flex flex-col items-center text-center">
                            <div className="relative">
                                <div className="flex h-40 w-40 items-center justify-center rounded-full bg-blue-600 text-5xl font-semibold">
                                    {getOrganizationInitials(organizationName)}
                                </div>
                                <button className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#0b0f14]/80 text-white/70 shadow-lg">
                                    <Settings className="h-4 w-4" />
                                </button>
                            </div>
                            <h2 className="mt-5 text-2xl font-semibold">
                                {organizationName}
                            </h2>
                            <p className="text-sm text-white/60">
                                org-{org || 'workspace'}
                            </p>
                            <p className="mt-3 text-sm text-white/60">
                                Your organization workspace
                            </p>
                            <button className="mt-5 w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/40 transition hover:bg-blue-500">
                                Edit profile
                            </button>
                            <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-white/70">
                                <Users className="h-4 w-4 text-blue-400" />5
                                followers · 0 following
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-xs text-white/60">
                                <MapPin className="h-4 w-4" />
                                Switzerland
                            </div>
                        </div>
                    </aside>

                    <section className="space-y-6">
                        <Outlet />
                    </section>
                </main>
            </div>
        </div>
    );
}

function formatOrganizationName(value: string) {
    return value
        .split('-')
        .map((segment) =>
            segment.length > 0
                ? segment[0].toUpperCase() + segment.slice(1)
                : segment
        )
        .join(' ');
}

function getOrganizationInitials(name: string) {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) {
        return 'OO';
    }
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default OrganizationLayout;
