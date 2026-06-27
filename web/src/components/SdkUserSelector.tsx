import { useSdkUser } from '@/hooks/use-sdk-user';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@ui/dropdown-menu';

const sdkUserDropdownItemClassName =
    'cursor-pointer items-center gap-3 p-2 text-muted-foreground transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground data-highlighted:[&_p]:text-accent-foreground';

/** Renders the SDK-only local user selector. */
export function SdkUserSelector() {
    const { user, users, selectUser } = useSdkUser();
    const fallback = user.name.slice(0, 2).toUpperCase();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="group flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background/70 transition hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                <Avatar className="size-8">
                    <AvatarImage src={user.avatar} alt={`${user.name} profile`} />
                    <AvatarFallback>{fallback}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
                <DropdownMenuGroup>
                    <div className="flex items-center gap-3 p-2">
                        <Avatar className="size-9">
                            <AvatarImage src={user.avatar} alt={`${user.name} profile`} />
                            <AvatarFallback>{fallback}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                            <p className="truncate text-xs capitalize text-muted-foreground">
                                {user.permission} permission
                            </p>
                        </div>
                    </div>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuRadioGroup value={String(user.id)} onValueChange={selectUser}>
                    {users.map((option) => (
                        <DropdownMenuRadioItem
                            key={option.id}
                            value={String(option.id)}
                            className={sdkUserDropdownItemClassName}
                        >
                            <Avatar className="size-8">
                                <AvatarImage src={option.avatar} alt={`${option.name} profile`} />
                                <AvatarFallback>{option.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">{option.name}</p>
                                <p className="truncate text-xs capitalize text-muted-foreground">
                                    {option.permission} permission
                                </p>
                            </div>
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
