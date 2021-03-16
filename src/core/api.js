import { ipcRenderer } from 'electron';
function registerApi(name) {
    return { [name]: (...args) => ipcRenderer.invoke(name, ...args) };
}
export default Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, registerApi('getBlocks')), registerApi('getBlockchain')), registerApi('getAddress')), registerApi('getBalanceOfAddresses')), registerApi('getTransactions')), registerApi('getPendingTransactions')), registerApi('countTransactions')), registerApi('countPendingTransactions'));
