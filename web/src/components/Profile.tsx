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
import { BookOpen, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';

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
     * Signs the current user out and redirects to login.
     */
    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
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
                    <DropdownMenuItem className="cursor-pointer p-2 text-white/80 transition-colors hover:bg-white/10 focus:text-white">
                        <a
                            href="https://docs.longlink.dev"
                            target="_blank"
                            rel="noreferrer"
                            className="flex w-full items-center"
                        >
                            <BookOpen className="mr-2 h-4 w-4" />
                            Documentation
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
