import { PublicArticle } from '@/components/layouts/article';
import { NativeStack as Stack } from '@/components/custom/native-stack';

const article = {
    description:
        'LongLink provides a shared foundation for building, deploying, and operating process-specific Python applications.',
    toc: [{ id: 'why-longlink', label: 'Why LongLink', level: 1 }],
    lastUpdated: '2026-09-30',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/blog/why-long-link.tsx',
    title: 'Why LongLink | LongLink Blog'
};

/** Introduces LongLink and the relationship between Solutions and the Platform. */
export default function WhyLongLink() {
    return (
        <PublicArticle article={article}>
            <Stack className="text-lg leading-relaxed" gap={5}>
                <h1 id="why-longlink" className="font-semibold tracking-tight text-4xl text-balance">
                    Why LongLink
                </h1>

                <Stack className="[&_p]:opacity-90" gap={10}>
                    <Stack as="section" gap={4}>
                        <p className="text-pretty">
                            Today, the flow of data in companies is distributed across many systems. This creates
                            inefficiencies, and a single request might even take days to be resolved. Custom software
                            can close these gaps by organizing data, rules, and decisions.
                        </p>
                        <p className="text-pretty">
                            Traditional software was made for many customers, allowing the cost to be divided among all
                            of them. Dedicated software has different economics. It exists for a specific need, so
                            unnecessary complexity translates directly into maintenance costs.
                        </p>
                        <p className="text-pretty">
                            Every application needs a basic set of features to operate, such as user management,
                            permissions, storage, databases, logging, and deployment. But the true value sits at the
                            center, where domain knowledge is translated into logic.
                        </p>
                        <p className="text-pretty">
                            We call this a <span className="font-bold">Solution</span>: the simplest practical
                            representation of a business process expressed as code.
                        </p>
                        <p className="text-pretty">
                            LongLink provides everything else needed to build, run, and manage those Solutions.
                        </p>
                        <div className="relative min-w-0 overflow-hidden rounded-xl bg-transparent">
                            <img
                                alt="Core application logic surrounded by services and deployment infrastructure"
                                className="aspect-video w-full object-contain"
                                src="/images/platform.png"
                            />
                            <span className="tracking-tight font-semibold text-nowrap block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic] absolute start-3/10 top-1/5 -translate-x-1/2 text-sm sm:text-xl md:text-2xl">
                                Services
                            </span>
                            <span className="tracking-tight font-semibold text-nowrap block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic] absolute bottom-1/5 start-7/10 -translate-x-1/2 text-sm sm:text-xl md:text-2xl">
                                Deployment
                            </span>
                        </div>
                    </Stack>
                </Stack>
            </Stack>
        </PublicArticle>
    );
}
