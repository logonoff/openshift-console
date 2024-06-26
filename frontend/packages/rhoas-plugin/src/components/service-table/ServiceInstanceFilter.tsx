import * as React from 'react';
import {
  TextInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import { KEYBOARD_SHORTCUTS } from '@console/shared';

type ServiceInstanceFilterProps = {
  textInputNameValue: string;
  setTextInputNameValue: (textInputNameValue: string) => void;
};

const ServiceInstanceFilter: React.FC<ServiceInstanceFilterProps> = ({
  textInputNameValue,
  setTextInputNameValue,
}: ServiceInstanceFilterProps) => {
  const { t } = useTranslation();

  return (
    <Toolbar data-test-id="toolbar-filter-instances">
      <ToolbarContent>
        <ToolbarGroup variant="filter-group">
          <ToolbarItem>
            <div className="has-feedback">
              <TextInput
                value={textInputNameValue}
                type="text"
                onChange={(_event, value) => setTextInputNameValue(value)}
                aria-label={t('rhoas-plugin~Search by name')}
                placeholder={`${t('rhoas-plugin~Search by name')}...`}
                className="co-text-filter"
              />
              <span className="co-text-filter-feedback">
                <kbd className="co-kbd co-kbd__filter-input">
                  {KEYBOARD_SHORTCUTS.focusFilterInput}
                </kbd>
              </span>
            </div>
          </ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
  );
};

export default ServiceInstanceFilter;
