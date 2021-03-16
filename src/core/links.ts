import {ipcMain} from 'electron';
import {Blockchain} from "./models/Blockchain";

export function links(xrpawn: Blockchain) {
  ipcMain.handle('getTransactions', async (event, offset: number, limit: number) => {
    console.log('getTransactions offset, limit : ', offset, limit);
    return await xrpawn.getTransactions(offset, limit);
  });

  ipcMain.handle('getBlocks', (event, arg) => {
    console.log('getBlocks : ', arg);
  });

  ipcMain.handle('getBlockchain', () => {
    return xrpawn;
  })

  ipcMain.handle('getAddress', () => {
    return xrpawn.getAddress();
  });

  ipcMain.handle('getBalanceOfAddresses', async (event, addresses: string) => {
    return await xrpawn.getBalanceOfAddress(addresses);
  });

  ipcMain.handle('getPendingTransactions', async (event, offset: number, limit: number) => {
    return await xrpawn.getPendingTransactions(offset, limit);
  });

  ipcMain.handle('countTransactions', async () => {
    return await xrpawn.countTransactions();
  });

  ipcMain.handle('countPendingTransactions', async () => {
    return await xrpawn.countPendingTransactions();
  });
}
