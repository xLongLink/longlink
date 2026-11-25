import ViewLayout from './view-layout';
import darkLogo from '../../../../../../public/longlink-logo-dark.svg?raw';
import lightLogo from '../../../../../../public/longlink-logo-light.svg?raw';
import { Box, Logo, Stack, Text, Table, TableBody, TableRow, TableCell } from '@/components/longlink';

const longlinkLogo = `data:image/svg+xml,${encodeURIComponent(lightLogo)}`;
const longlinkDarkLogo = `data:image/svg+xml,${encodeURIComponent(darkLogo)}`;

const suppliers = [
    { name: 'LongLink', description: 'Business applications', logo: longlinkLogo },
    { name: 'Northwind', description: 'Food distribution', logo: null },
    { name: 'Contoso', description: 'Technology services', logo: 'data:image/png;base64,broken' }
];

/** Shows the LongLink artwork in the active color scheme. */
export function LongLinkLogoExample({ variant }: { variant?: 'table' | 'detail' }) {
    return (
        <>
            <span className="inline-flex dark:hidden">
                <Logo src={longlinkLogo} alt="" variant={variant} />
            </span>
            <span className="hidden dark:inline-flex">
                <Logo src={longlinkDarkLogo} alt="" variant={variant} />
            </span>
        </>
    );
}

/** Demonstrates fixed-size supplier logos with missing and failed sources. */
export default function LogoPage() {
    return (
        <ViewLayout
            name="Logo"
            example={{
                title: 'Supplier logos',
                preview: (
                    <Box width="80%">
                        <Stack gap={6}>
                            <Stack direction="horizontal" align="center" gap={4}>
                                <LongLinkLogoExample variant="detail" />
                                <Stack gap={1}>
                                    <Text size="lg" weight="medium">
                                        LongLink
                                    </Text>
                                    <Text tone="muted">Business applications</Text>
                                </Stack>
                            </Stack>
                            <Table wrap aria-label="Supplier logos">
                                <TableBody>
                                    {suppliers.map((supplier) => (
                                        <TableRow key={supplier.name}>
                                            <TableCell>
                                                <Stack direction="horizontal" align="center" gap={3}>
                                                    {supplier.logo === longlinkLogo ? (
                                                        <LongLinkLogoExample />
                                                    ) : (
                                                        <Logo src={supplier.logo} alt="" />
                                                    )}
                                                    <Stack gap={0}>
                                                        <Text weight="medium">{supplier.name}</Text>
                                                        <Text size="sm" tone="muted">
                                                            {supplier.description}
                                                        </Text>
                                                    </Stack>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Stack>
                    </Box>
                ),
                code: `function Example() {
  const suppliers = [
    { name: "LongLink", description: "Business applications", logo: "/assets/longlink.svg" },
    { name: "Northwind", description: "Food distribution", logo: null },
    { name: "Contoso", description: "Technology services", logo: "/assets/unavailable.svg" }
  ];

  return (
    <Stack gap={6}>
      <Stack direction="horizontal" align="center" gap={4}>
        <Logo src={suppliers[0].logo} alt="" variant="detail" />
        <Stack gap={1}>
          <Text size="lg" weight="medium">{suppliers[0].name}</Text>
          <Text tone="muted">{suppliers[0].description}</Text>
        </Stack>
      </Stack>
      <Table wrap aria-label="Supplier logos">
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow key={supplier.name}>
              <TableCell>
                <Stack direction="horizontal" align="center" gap={3}>
                  <Logo src={supplier.logo} alt="" />
                  <Stack gap={0}>
                    <Text weight="medium">{supplier.name}</Text>
                    <Text size="sm" tone="muted">{supplier.description}</Text>
                  </Stack>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}`
            }}
        />
    );
}
