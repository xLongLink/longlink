import { PublicArticle } from '@/components/layouts/Article';
import { NativeText as Text } from '@/components/ui/NativeText';
import { NativeStack as Stack } from '@/components/ui/NativeStack';
import { NativeHeading as Heading } from '@/components/ui/NativeHeading';

const article = {
    description:
        'LongLink provides a shared foundation for building, deploying, and operating process-specific Python applications.',
    toc: [{ id: 'why-longlink', label: 'Why LongLink', level: 1 }],
    lastUpdated: '2026-09-30',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/blog/WhyLongLink.tsx',
    title: 'Why LongLink | LongLink Blog',
};

/** Introduces LongLink and the relationship between Solutions and the Platform. */
export default function WhyLongLink() {
    return (
        <PublicArticle article={article}>
            <Stack
                className="[--text-body-leading:var(--leading-relaxed)] [--text-body-size:var(--font-size-lg)]"
                gap={5}
            >
                <Heading id="why-longlink" level={1} textWrap="balance">
                    Why LongLink
                </Heading>

                <Stack className="[&_p]:opacity-90" gap={10}>
                    <Stack as="section" gap={4}>
                        <Text as="p" textWrap="pretty">
                            Today, the flow of data in companies is distributed across many systems. This creates
                            inefficiencies, and a single request might even take days to be resolved. Custom software
                            can close these gaps by organizing data, rules, and decisions.
                        </Text>
                        <Text as="p" textWrap="pretty">
                            Traditional software was made for many customers, allowing the cost to be divided among all
                            of them. Dedicated software has different economics. It exists for a specific need, so
                            unnecessary complexity translates directly into maintenance costs.
                        </Text>
                        <Text as="p" textWrap="pretty">
                            Every application needs a basic set of features to operate, such as user management,
                            permissions, storage, databases, logging, and deployment. But the true value sits at the
                            center, where domain knowledge is translated into logic.
                        </Text>
                        <Text as="p" textWrap="pretty">
                            We call this a <Text weight="bold">Solution</Text>: the simplest practical representation of
                            a business process expressed as code.
                        </Text>
                        <Text as="p" textWrap="pretty">
                            LongLink provides everything else needed to build, run, and manage those Solutions.
                        </Text>
                        <div className="relative min-w-0 overflow-hidden rounded-(--radius-container) bg-transparent">
                            <img
                                alt="Core application logic surrounded by services and deployment infrastructure"
                                className="aspect-video w-full object-contain"
                                src="/images/platform.png"
                            />
                            <Text
                                className="absolute start-3/10 top-1/5 -translate-x-1/2 text-sm sm:text-xl md:text-2xl"
                                hasCapsize
                                textWrap="nowrap"
                                type="display-3"
                                weight="semibold"
                            >
                                Services
                            </Text>
                            <Text
                                className="absolute bottom-1/5 start-7/10 -translate-x-1/2 text-sm sm:text-xl md:text-2xl"
                                hasCapsize
                                textWrap="nowrap"
                                type="display-3"
                                weight="semibold"
                            >
                                Deployment
                            </Text>
                        </div>
                    </Stack>
                </Stack>
            </Stack>
        </PublicArticle>
    );
}
