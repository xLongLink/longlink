import { useSearchParams } from 'react-router';
import { Center } from '@astryxdesign/core/Center';
import { SignInCard } from '@/components/SignInCard';

/** Renders the standalone account sign-in page. */
export default function Login() {
    const [searchParams] = useSearchParams();

    return (
        <Center minHeight="calc(100dvh - var(--appshell-header-height, 0px))" width="100%">
            <SignInCard initialEmail={searchParams.get('email') ?? ''} />
        </Center>
    );
}
