import {
    BarChart3, BookOpen, FolderKanban, LayoutGrid,
    Users, Settings, MapPin
} from 'lucide-react';

import {
    Link, Outlet, useLocation, useNavigate, useParams,
} from 'react-router';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';


export function Organization() {
    const { org = '' } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const organizationName = formatOrganizationName(org || 'org');

    const activeTab = (() => {
        const base = `/${org}`;
        const path = location.pathname;

        if (path === base) return 'overview';
        if (path.startsWith(`${base}/projects`)) return 'projects';
        if (path.startsWith(`${base}/people`)) return 'people';
        if (path.startsWith(`${base}/documents`)) return 'documents';

        return 'overview';
    })();

    return (
        <div className="min-h-screen text-white">
            <header className="border-b border-white/10">
                <div className="mx-auto w-full px-6 pb-2 pt-4">
                    <div className="flex items-center gap-4 text-white/80">
                        <Link
                            to="/"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-blue-300 transition hover:bg-white/10"
                        >
                            <BarChart3 className="h-5 w-5" />
                        </Link>
                        <span className="text-sm font-semibold text-white/70">
                            {organizationName}
                        </span>
                    </div>
                </div>

                {/* Tabs navigation */}
                <div className="mx-auto w-full px-6 pb-2">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => {
                            switch (value) {
                                case 'overview':
                                    navigate(`/${org}`);
                                    break;
                                case 'projects':
                                    navigate(`/${org}/projects`);
                                    break;
                                case 'people':
                                    navigate(`/${org}/people`);
                                    break;
                                case 'documents':
                                    navigate(`/${org}/documents`);
                                    break;
                            }
                        }}
                    >
                        <TabsList variant="line">
                            <TabsTrigger value="overview">
                                <LayoutGrid className="h-4 w-4" />
                                Overview
                            </TabsTrigger>
                            <TabsTrigger value="projects">
                                <FolderKanban className="h-4 w-4" />
                                Projects
                            </TabsTrigger>
                            <TabsTrigger value="people">
                                <Users className="h-4 w-4" />
                                People
                            </TabsTrigger>
                            <TabsTrigger value="documents">
                                <BookOpen className="h-4 w-4" />
                                Documents
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </header>

            <main className="mx-auto grid w-full max-w-6xl gap-8 px-6 pb-16 pt-10 lg:grid-cols-[320px_1fr]">
                <aside className="p-6">
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

                        <a
                            className="mt-3 text-sm text-blue-300 transition hover:text-blue-200"
                            href="https://longlink.ch"
                            rel="noreferrer"
                            target="_blank"
                        >
                            longlink.ch
                        </a>

                        <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-white/70">
                            <Users className="h-4 w-4 text-blue-400" />
                            5 followers · 0 following
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

export default Organization;
