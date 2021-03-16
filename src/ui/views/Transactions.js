import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import moment from 'moment';
import "moment/locale/fr";
import { Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, TablePagination, makeStyles } from "@material-ui/core";
import { useAddress } from "../hooks/useAddress";
import { useTransactions } from "../hooks/useTransactions";
import { useCountTransactions } from "../hooks/useCountTransactions";
const columns = [
    {
        id: 'id',
        label: 'id',
        maxWidth: 170,
        format: (value) => value
    }, {
        id: 'fromAddress',
        label: 'Emetteur',
        maxWidth: 170,
        format: (value) => value.substr(0, 32) + '...'
    },
    {
        id: 'toAddress',
        label: 'Reçeveur',
        maxWidth: 100,
        format: (value) => value.substr(0, 32) + '...'
    },
    {
        id: 'amount',
        label: 'Montant',
        minWidth: 170,
        align: 'right',
        format: (value) => `${value.toFixed(2)} GPC`,
    },
    {
        id: 'createdAt',
        label: 'Date',
        minWidth: 170,
        align: 'right',
        format: (value) => moment(value).format('LLL'),
    }
];
const useStyles = makeStyles({
    root: {
        width: '100%',
        height: '100%'
    },
    container: {
        height: '100%',
    },
});
export const Transactions = () => {
    const classes = useStyles();
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);
    const address = useAddress();
    const transactions = useTransactions(page * rowsPerPage, rowsPerPage);
    const nbTransactions = useCountTransactions();
    console.log('transactions : ', transactions);
    console.log('address : ', address);
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };
    return (_jsxs(Paper, Object.assign({ className: classes.root }, { children: [_jsx(TableContainer, Object.assign({ className: classes.container }, { children: _jsxs(Table, Object.assign({ stickyHeader: true, "aria-label": "sticky table" }, { children: [_jsx(TableHead, { children: _jsx(TableRow, { children: columns.map((column) => (_jsx(TableCell, Object.assign({ align: column.align, style: { minWidth: column.minWidth } }, { children: column.label }), column.id))) }, void 0) }, void 0),
                        _jsx(TableBody, { children: transactions
                                .map((row) => {
                                return (_jsx(TableRow, Object.assign({ hover: true, role: "checkbox", tabIndex: -1 }, { children: columns.map((column) => {
                                        var _a;
                                        const value = row[column.id];
                                        return (_jsx(TableCell, Object.assign({ align: (_a = column.align) !== null && _a !== void 0 ? _a : "left" }, { children: column.format ? column.format(value) : value }), column.id));
                                    }) }), row.id));
                            }) }, void 0)] }), void 0) }), void 0),
            _jsx(TablePagination, { rowsPerPageOptions: [10, 25, 100], component: "div", count: nbTransactions, rowsPerPage: rowsPerPage, page: page, onChangePage: handleChangePage, onChangeRowsPerPage: handleChangeRowsPerPage }, void 0)] }), void 0));
};
