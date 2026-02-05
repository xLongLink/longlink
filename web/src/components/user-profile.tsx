import { Building2, Code2, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type UserProfileProps = {
    username?: string;
    fullName?: string;
    avatarUrl?: string;
};

const defaultUser = {
    username: 'Sau1707',
    fullName: 'Leonardo Saurwein',
    avatarUrl: '',
};

export function UserProfile({
    username = defaultUser.username,
    fullName = defaultUser.fullName,
    avatarUrl = defaultUser.avatarUrl,
}: UserProfileProps) {
    const navigate = useNavigate();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="group flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30">
                <Avatar className="size-8">
                    <AvatarImage src={avatarUrl} alt={`${username} profile`} />
                    <AvatarFallback>
                        {username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="flex items-center gap-2">
                        <Avatar className="size-9">
                            <AvatarImage
                                src={avatarUrl}
                                alt={`${username} profile`}
                            />
                            <AvatarFallback>
                                {username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="">
                            <p className="text-sm font-semibold text-white">
                                {username}
                            </p>
                            <p className="text-xs text-white/60">{fullName}</p>
                        </div>
                    </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem
                    className="cursor-pointer transition-colors hover:bg-white/10 p-2"
                    onSelect={(event) => {
                        event.preventDefault();
                        navigate('/settings/profile');
                    }}
                >
                    <User className="mr-2 h-4 w-4 text-white/70" />
                    Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="cursor-pointer transition-colors hover:bg-white/10 p-2"
                    onSelect={(event) => {
                        event.preventDefault();
                        navigate('/settings/organizations');
                    }}
                >
                    <Building2 className="mr-2 h-4 w-4 text-white/70" />
                    Organizations
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="cursor-pointer transition-colors hover:bg-white/10 p-2"
                    onSelect={(event) => {
                        event.preventDefault();
                        navigate('/settings/developer');
                    }}
                >
                    <Code2 className="mr-2 h-4 w-4 text-white/70" />
                    Developer
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem className="text-red-300 focus:text-red-200 cursor-pointer transition-colors hover:bg-white/10 p-2">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
