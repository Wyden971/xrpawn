import SHA256 from 'crypto-js/sha256';
import {ec as EC} from "elliptic";
import {v4 as uuid4, parse as uuidParse} from 'uuid'
import {BlockData, BlockDataType} from "./BlockData";

const ec = new EC('secp256k1');

export interface SecurityData {
  description: any;
}

export class Security extends BlockData<SecurityData> implements SecurityData {
  public type = BlockDataType.security;
  public description: any;

  constructor(fromAddress: string, description: any, id?: string, createdAt: number = Date.now()) {
    super(fromAddress);
    this.description = description;
  }

  getData() {
    return this.description;
  }
}

