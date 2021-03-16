import React from 'react';
import {v4 as uuid4} from 'uuid';
import moment from 'moment';
import "moment/locale/fr";
import {
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  makeStyles
} from "@material-ui/core";
import {Transaction} from "../../core/models/Transaction";
import {useAddress} from "../hooks/useAddress";
import {useTransactions} from "../hooks/useTransactions";
import {useCountTransactions} from "../hooks/useCountTransactions";

type TransactionColumn = {
  id: keyof Partial<Transaction>;
  label: string;
  maxWidth?: number;
  minWidth?: number;
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  format: (value: any) => any;
}

const columns: TransactionColumn[] = [
  {
    id: 'id',
    label: 'id',
    maxWidth: 170,
    format: (value: string) => value
  }, {
    id: 'fromAddress',
    label: 'Emetteur',
    maxWidth: 170,
    format: (value: string) => value.substr(0, 32) + '...'
  },
  {
    id: 'toAddress',
    label: 'Reçeveur',
    maxWidth: 100,
    format: (value: string) => value.substr(0, 32) + '...'
  },
  {
    id: 'amount',
    label: 'Montant',
    minWidth: 170,
    align: 'right',
    format: (value: number) => `${value.toFixed(2)} GPC`,
  },
  {
    id: 'createdAt',
    label: 'Date',
    minWidth: 170,
    align: 'right',
    format: (value: number) => moment(value).format('LLL'),
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

export interface TransactionsProps {

}

export const Transactions: React.FC<TransactionsProps> = () => {

  const classes = useStyles();
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const address = useAddress();
  const transactions = useTransactions(page * rowsPerPage, rowsPerPage);
  const nbTransactions = useCountTransactions();

  console.log('transactions : ', transactions);

  console.log('address : ', address);
  const handleChangePage = (event: any, newPage: any) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: any) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };


  return (

    <Paper className={classes.root}>
      <TableContainer className={classes.container}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{minWidth: column.minWidth}}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions
              .map((row) => {
                return (
                  <TableRow hover role="checkbox" tabIndex={-1} key={row.id}>
                    {columns.map((column) => {
                      const value = row[column.id];
                      return (
                        <TableCell key={column.id} align={column.align ?? "left"}>
                          {column.format ? column.format(value) : value}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={nbTransactions}
        rowsPerPage={rowsPerPage}
        page={page}
        onChangePage={handleChangePage}
        onChangeRowsPerPage={handleChangeRowsPerPage}
      />
    </Paper>
  )
}
