import { Link } from '@astryxdesign/core/Link';
import { useSearchParams } from 'react-router';
import { Center } from '@astryxdesign/core/Center';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Wordmark } from '@/components/Wordmark';
import { SignInCard } from '@/components/SignInCard';
import TopLayout from '@/components/layouts/TopLayout';

/** Renders the standalone account sign-in page. */
export default function Login() {
    const [searchParams] = useSearchParams();

    return (
        <TopLayout
            topMenu={
                <TopNav
                    className="min-h-11 px-7"
                    endContent={
                        <Link href="/docs" color="secondary" isStandalone rel="noopener noreferrer" target="_blank">
                            Documentation
                        </Link>
                    }
                    heading={
                        <Link href="/" label="LongLink home" color="inherit">
                            <Wordmark />
                        </Link>
                    }
                    label="Main navigation"
                />
            }
        >
            <Center minHeight="calc(100dvh - var(--appshell-header-height, 0px))" width="100%">
                <SignInCard initialEmail={searchParams.get('email') ?? ''} />
            </Center>
        </TopLayout>
    );
}
