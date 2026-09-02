import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Stack } from '@astryxdesign/core/Stack';
import baserowIcon from '@/components/svg/baserow.svg';
import tooljetIcon from '@/components/svg/tooljet.svg';
import budibaseIcon from '@/components/svg/budibase.svg';
import windmillIcon from '@/components/svg/windmill.svg';
import retoolIcon from '@/components/svg/retool-icon.svg';
import { proportional, Table } from '@astryxdesign/core/Table';
import airtableIcon from '@/components/svg/airtable-svgrepo-com.svg';

type CompetitorRow = {
    avatar: string;
    language: string;
    license: string;
    product: string;
    release: string;
    solution: string;
};

const competitors: CompetitorRow[] = [
    {
        avatar: airtableIcon,
        product: 'Airtable',
        release: '2015',
        license: 'Proprietary',
        solution: 'Low Code',
        language: 'JavaScript, React',
    },
    {
        avatar: retoolIcon,
        product: 'Retool',
        release: '2018',
        license: 'Proprietary',
        solution: 'Hybrid',
        language: 'React, TypeScript',
    },
    {
        avatar: '/images/appsmith.png',
        product: 'Appsmith',
        release: '2020',
        license: 'Apache-2.0',
        solution: 'Hybrid',
        language: 'JavaScript, SQL',
    },
    {
        avatar: baserowIcon,
        product: 'Baserow',
        release: '2020',
        license: 'MIT',
        solution: 'Hybrid',
        language: 'Python, Vue',
    },
    {
        avatar: budibaseIcon,
        product: 'Budibase',
        release: '2020',
        license: 'GPLv3',
        solution: 'Hybrid',
        language: 'JavaScript',
    },
    {
        avatar: '/images/smartsuite.png',
        product: 'SmartSuite',
        release: '2021',
        license: 'Proprietary',
        solution: 'Low Code',
        language: 'None',
    },
    {
        avatar: tooljetIcon,
        product: 'ToolJet',
        release: '2021',
        license: 'AGPLv3',
        solution: 'Hybrid',
        language: 'JavaScript, Python',
    },
    {
        avatar: windmillIcon,
        product: 'Windmill',
        release: '2022',
        license: 'AGPLv3',
        solution: 'Hybrid',
        language: 'Python, TypeScript, Go, Bash, SQL',
    },
];

/** Renders the presentation competitor comparison. */
export function CompetitorsSlide() {
    return (
        <Stack maxWidth={840} width="100%">
            <Table
                columns={[
                    {
                        key: 'product',
                        align: 'start',
                        header: '',
                        width: proportional(2),
                        renderCell: (competitor) => (
                            <Stack align="center" direction="horizontal" gap={2}>
                                <Avatar kind="organization" name={competitor.product} src={competitor.avatar} />
                                <Stack align="start">
                                    <Text weight="semibold">{competitor.product}</Text>
                                    <Text type="supporting">
                                        {competitor.release} - {competitor.license}
                                    </Text>
                                </Stack>
                            </Stack>
                        ),
                    },
                    { key: 'solution', align: 'center', header: 'Solution', width: proportional(1) },
                    { key: 'language', align: 'center', header: 'Language', width: proportional(2) },
                ]}
                data={competitors}
                density="compact"
                dividers="grid"
                idKey="product"
            />
        </Stack>
    );
}
