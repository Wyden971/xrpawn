"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = void 0;
const BlockData_1 = require("./BlockData");
class Transaction extends BlockData_1.BlockData {
    constructor(fromAddress, toAddress, amount) {
        super(fromAddress, toAddress);
        this.type = BlockData_1.BlockDataType.transaction;
        this.amount = amount;
    }
    getData() {
        return {
            amount: this.amount,
        };
    }
}
exports.Transaction = Transaction;
//# sourceMappingURL=Transaction.js.map