import { useLayoutEffect, useState } from 'react';
import { Avatar } from '@/components/longlink/display/avatar';
import { SidebarMenuButton } from '@/components/shadcn/sidebar';
import { BookOpen, ChevronsUpDown, ExternalLink } from 'lucide-react';
import { developmentUsers, getDevelopmentUser, setDevelopmentUser } from '@/solution/development';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/shadcn/dropdown-menu';

/** Switches local request identity without exposing production account controls. */
export function DevelopmentProfile() {
    const [profile] = useState(getDevelopmentUser);
    const { user } = profile;

    // Install the initial persona before the isolated View can make business requests.
    useLayoutEffect(() => {
        setDevelopmentUser(profile);
    }, [profile]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger type="button" render={<SidebarMenuButton size="lg" />} aria-label={user.name}>
                <Avatar name={user.name} size="sm" />
                <span className="flex min-w-0 flex-1 flex-col text-start leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </span>
                <ChevronsUpDown
                    aria-hidden="true"
                    className="text-muted-foreground group-data-[collapsible=icon]:hidden"
                    size={16}
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" aria-label="Development user">
                <DropdownMenuGroup aria-label="Development users">
                    <DropdownMenuLabel>Development users</DropdownMenuLabel>
                    {developmentUsers.map((candidate) => (
                        <DropdownMenuItem
                            key={candidate.user.id}
                            aria-current={candidate.role === profile.role ? 'true' : undefined}
                            onClick={() => {
                                setDevelopmentUser(candidate);

                                // Dispose the old View, requests, and cached data together.
                                window.location.reload();
                            }}
                        >
                            <Avatar name={candidate.user.name} size="sm" />
                            <span className="flex min-w-0 flex-1 flex-col text-start leading-tight">
                                <span className="truncate text-sm font-medium">{candidate.user.name}</span>
                                <span className="truncate text-xs text-muted-foreground">{candidate.user.email}</span>
                            </span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    render={<a href="https://www.longlink.dev/docs/" target="_blank" rel="noopener noreferrer" />}
                >
                    <BookOpen aria-hidden="true" className="text-muted-foreground" size={16} />
                    Documentation
                    <ExternalLink aria-hidden="true" className="ms-auto text-muted-foreground" size={12} />
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
