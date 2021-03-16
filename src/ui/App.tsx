import React, {useEffect, useState} from 'react';
import {Button, AppBar, Tabs, Tab, makeStyles} from "@material-ui/core";
import {TabPanel} from './components/TabPanel';
import {Wallet} from "./views/Wallet";
import {Transactions} from "./views/Transactions";
import {PendingTransactions} from "./views/PendingTransactions";

const useStyles = makeStyles(theme => ({
  offset: theme.mixins.toolbar,
}))


console.log('window.localStorage.test : ', window.localStorage.test);

export const App: React.FC<any> = () => {

  const [value, setValue] = useState(3);
  const classes = useStyles();
  const handleChange = (event: any, newValue: any) => {
    setValue(newValue);
  }
  return (
    <React.Fragment>
      <AppBar position="sticky">
        <Tabs value={value} onChange={handleChange} aria-label="simple tabs example">
          <Tab label="Wallet"/>
          <Tab label="Envoyer de l'argent"/>
          <Tab label="Reçevoir de l'argent"/>
          <Tab label="Transactions"/>
          <Tab label="Transactions en attente"/>
          <Tab label="Ajouter un bien"/>
          <Tab label="Voir les biens"/>
        </Tabs>
      </AppBar>
      <div className={classes.offset}>
        <TabPanel active={value === 0}>
          <Wallet/>
        </TabPanel>
        <TabPanel active={value === 1}>
          Item Two
        </TabPanel>
        <TabPanel active={value === 2}>
          Item Three
        </TabPanel>
        <TabPanel active={value === 3}>
          <Transactions/>
        </TabPanel>
        <TabPanel active={value === 4}>
          <PendingTransactions/>
        </TabPanel>
      </div>

    </React.Fragment>
  )
}
