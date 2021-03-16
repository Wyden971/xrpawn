import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { AppBar, Tabs, Tab, makeStyles } from "@material-ui/core";
import { TabPanel } from './components/TabPanel';
import { Wallet } from "./views/Wallet";
import { Transactions } from "./views/Transactions";
import { PendingTransactions } from "./views/PendingTransactions";
const useStyles = makeStyles(theme => ({
    offset: theme.mixins.toolbar,
}));
console.log('window.localStorage.test : ', window.localStorage.test);
export const App = () => {
    const [value, setValue] = useState(3);
    const classes = useStyles();
    const handleChange = (event, newValue) => {
        setValue(newValue);
    };
    return (_jsxs(React.Fragment, { children: [_jsx(AppBar, Object.assign({ position: "sticky" }, { children: _jsxs(Tabs, Object.assign({ value: value, onChange: handleChange, "aria-label": "simple tabs example" }, { children: [_jsx(Tab, { label: "Wallet" }, void 0),
                        _jsx(Tab, { label: "Envoyer de l'argent" }, void 0),
                        _jsx(Tab, { label: "Re\u00E7evoir de l'argent" }, void 0),
                        _jsx(Tab, { label: "Transactions" }, void 0),
                        _jsx(Tab, { label: "Transactions en attente" }, void 0),
                        _jsx(Tab, { label: "Ajouter un bien" }, void 0),
                        _jsx(Tab, { label: "Voir les biens" }, void 0)] }), void 0) }), void 0),
            _jsxs("div", Object.assign({ className: classes.offset }, { children: [_jsx(TabPanel, Object.assign({ active: value === 0 }, { children: _jsx(Wallet, {}, void 0) }), void 0),
                    _jsx(TabPanel, Object.assign({ active: value === 1 }, { children: "Item Two" }), void 0),
                    _jsx(TabPanel, Object.assign({ active: value === 2 }, { children: "Item Three" }), void 0),
                    _jsx(TabPanel, Object.assign({ active: value === 3 }, { children: _jsx(Transactions, {}, void 0) }), void 0),
                    _jsx(TabPanel, Object.assign({ active: value === 4 }, { children: _jsx(PendingTransactions, {}, void 0) }), void 0)] }), void 0)] }, void 0));
};
