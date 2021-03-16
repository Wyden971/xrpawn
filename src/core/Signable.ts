import {ec as EC} from 'elliptic';
import {Hashable} from "./Hashable";

export abstract class Signable extends Hashable {

  private signature?: string;

  constructor() {
    super();
  }

  abstract getPublicKey(): string;

  getSignableHash() {
    return this.calculateHash(true);
  }

  getSignature() {
    return this.signature;
  }

  public sign(signinKey: EC.KeyPair) {
    if (signinKey.getPublic('hex') !== this.getPublicKey())
      return false;

    const hash = this.getSignableHash();
    this.signature = signinKey.sign(hash, 'base64').toDER('hex');

    return true;
  }

  public verify() {
    if (!(`${this.signature ?? ''}`).trim().length) {
      throw new Error('Empty signature');
      return false;
    }
    const ec = new EC('secp256k1');
    const key = ec.keyFromPublic(this.getPublicKey(), 'hex');
    return key.verify(this.getSignableHash(), this.signature!);
  }
}
