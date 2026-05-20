import { useSignOut, useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@ui/dropdown-menu';
import { BookOpen, Building2, ExternalLink, LogOut, Settings2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

/** Renders a user profile dropdown with authentication actions. */
export function UserProfile() {
    const navigate = useNavigate();
    const { data: user } = useUser();
    const { mutateAsync: signOut } = useSignOut();

    if (!user) {
        return null;
    }

    const username = user.name;
    const fullName = user.email;
    const avatarUrl = user.avatar ?? '';

    /**
     * Signs the current user out and redirects to home.
     */
    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="group flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30">
                <Avatar className="size-8">
                    <AvatarImage src={avatarUrl} alt={`${username} profile`} />
                    <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="flex items-center gap-2">
                        <Avatar className="size-9">
                            <AvatarImage src={avatarUrl} alt={`${username} profile`} />
                            <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="">
                            <p className="text-sm font-semibold text-white">{username}</p>
                            <p className="text-xs text-white/60">{fullName}</p>
                        </div>
                    </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuGroup>
                    <DropdownMenuItem className="cursor-pointer p-2 text-white/75 transition-colors hover:bg-white/5 hover:text-white focus:text-white">
                        <Link to="/organizations" className="flex w-full items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Organizations
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer p-2 text-white/75 transition-colors hover:bg-white/5 hover:text-white focus:text-white">
                        <Link to="/settings" className="flex w-full items-center gap-2">
                            <Settings2 className="h-4 w-4" />
                            Settings
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer p-2 text-white/75 transition-colors hover:bg-white/5 hover:text-white focus:text-white">
                        <a
                            href="https://docs.longlink.dev"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex w-full items-center gap-2"
                        >
                            <BookOpen className="h-4 w-4" />
                            Documentation
                            <ExternalLink className="ml-auto h-3.5 w-3.5 text-white/40" />
                        </a>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem className="cursor-pointer p-2 text-red-300 transition-colors hover:bg-white/10 focus:text-red-200">
                    <button type="button" className="flex w-full items-center" onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                    </button>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
