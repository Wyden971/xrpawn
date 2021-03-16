import { BlockData, BlockDataType } from "./BlockData";
export class Transaction extends BlockData {
    constructor(fromAddress, toAddress, amount, id) {
        super(fromAddress, toAddress, id);
        this.type = BlockDataType.transaction;
        this.amount = amount;
    }
    getData() {
        return {
            amount: this.amount,
        };
    }
}
