import { viewComponent } from '../props';
import * as avatar from '@/components/shadcn/avatar';
import * as generated from '@/components/custom/generated-avatar';

export const GeneratedAvatar = viewComponent(generated.GeneratedAvatar);

export const Avatar = viewComponent(avatar.Avatar);

export const AvatarImage = viewComponent(avatar.AvatarImage);

export const AvatarFallback = viewComponent(avatar.AvatarFallback);

export const AvatarBadge = viewComponent(avatar.AvatarBadge);

export const AvatarGroup = viewComponent(avatar.AvatarGroup);

export const AvatarGroupCount = viewComponent(avatar.AvatarGroupCount);
