import React from 'react';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';

type TabPanelProps = {
  active: boolean;
}
export const TabPanel: React.FC<TabPanelProps> = ({children, active, ...other}) => {
  return (
    <div
      role="tabpanel"
      hidden={!active}
      {...other}
    >
      {children}
    </div>
  );

}
