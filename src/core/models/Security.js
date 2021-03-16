import { ec as EC } from "elliptic";
import { BlockData, BlockDataType } from "./BlockData";
const ec = new EC('secp256k1');
export class Security extends BlockData {
    constructor(fromAddress, description, id) {
        super(fromAddress, fromAddress, id);
        this.type = BlockDataType.security;
        this.description = description;
    }
    getData() {
        return this.description;
    }
}
