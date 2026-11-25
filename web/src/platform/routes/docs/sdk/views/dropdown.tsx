import ViewLayout from './view-layout';
import { useRef, useState } from 'react';
import {
    Button,
    Stack,
    Text,
    Dropdown,
    DropdownTrigger,
    DropdownPortal,
    DropdownContent,
    DropdownGroup,
    DropdownLabel,
    DropdownItem,
    DropdownCheckboxItem,
    DropdownRadioGroup,
    DropdownRadioItem,
    DropdownSeparator,
    DropdownShortcut,
    DropdownSub,
    DropdownSubTrigger,
    DropdownSubContent
} from '@/components/longlink';

/** Documents native menu composition in LongLink Views. */
export default function DropdownPage() {
    return (
        <ViewLayout
            name="Dropdown"
            example={{
                title: 'Dropdown',
                preview: <DropdownExample />,
                code: `export default function Example() {
  const menuContainer = useRef(null);
  const [showRowNumbers, setShowRowNumbers] = useState(true);
  const [density, setDensity] = useState('comfortable');

  function resetDisplay() {
    setShowRowNumbers(true);
    setDensity('comfortable');
  }

  return (
    <Stack gap={2} align="center">
      <Dropdown>
        <DropdownTrigger render={<Button variant="outline" size="sm" />}>
          Display options
        </DropdownTrigger>
        <DropdownPortal container={menuContainer}>
          <DropdownContent>
            <DropdownGroup>
              <DropdownLabel>Table display</DropdownLabel>
              <DropdownCheckboxItem checked={showRowNumbers} onCheckedChange={setShowRowNumbers}>
                Row numbers
              </DropdownCheckboxItem>
              <DropdownSub>
                <DropdownSubTrigger>Density</DropdownSubTrigger>
                <DropdownSubContent>
                  <DropdownRadioGroup aria-label="Density" value={density} onValueChange={setDensity}>
                    <DropdownRadioItem value="comfortable">Comfortable</DropdownRadioItem>
                    <DropdownRadioItem value="compact">Compact</DropdownRadioItem>
                  </DropdownRadioGroup>
                </DropdownSubContent>
              </DropdownSub>
            </DropdownGroup>
            <DropdownSeparator />
            <DropdownItem onClick={resetDisplay}>
              Reset display <DropdownShortcut aria-hidden="true">↵</DropdownShortcut>
            </DropdownItem>
          </DropdownContent>
        </DropdownPortal>
      </Dropdown>
      <div ref={menuContainer} />
      <Text role="status" size="sm" tone="muted">
        Density: {density} · Row numbers: {showRowNumbers ? 'on' : 'off'}
      </Text>
    </Stack>
  );
}`
            }}
        />
    );
}

/** Demonstrates a menu for table display preferences. */
export function DropdownExample() {
    const menuContainer = useRef<HTMLDivElement>(null);
    const [showRowNumbers, setShowRowNumbers] = useState(true);
    const [density, setDensity] = useState('comfortable');

    function resetDisplay() {
        setShowRowNumbers(true);
        setDensity('comfortable');
    }

    return (
        <Stack gap={2} align="center">
            <Dropdown>
                <DropdownTrigger render={<Button variant="outline" size="sm" />}>Display options</DropdownTrigger>
                <DropdownPortal container={menuContainer}>
                    <DropdownContent>
                        <DropdownGroup>
                            <DropdownLabel>Table display</DropdownLabel>
                            <DropdownCheckboxItem checked={showRowNumbers} onCheckedChange={setShowRowNumbers}>
                                Row numbers
                            </DropdownCheckboxItem>
                            <DropdownSub>
                                <DropdownSubTrigger>Density</DropdownSubTrigger>
                                <DropdownSubContent>
                                    <DropdownRadioGroup aria-label="Density" value={density} onValueChange={setDensity}>
                                        <DropdownRadioItem value="comfortable">Comfortable</DropdownRadioItem>
                                        <DropdownRadioItem value="compact">Compact</DropdownRadioItem>
                                    </DropdownRadioGroup>
                                </DropdownSubContent>
                            </DropdownSub>
                        </DropdownGroup>
                        <DropdownSeparator />
                        <DropdownItem onClick={resetDisplay}>
                            Reset display <DropdownShortcut aria-hidden="true">↵</DropdownShortcut>
                        </DropdownItem>
                    </DropdownContent>
                </DropdownPortal>
            </Dropdown>
            <div ref={menuContainer} />
            <Text role="status" size="sm" tone="muted">
                Density: {density} · Row numbers: {showRowNumbers ? 'on' : 'off'}
            </Text>
        </Stack>
    );
}
