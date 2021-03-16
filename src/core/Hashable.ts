// @ts-ignore
import SHA256 from 'crypto-js/sha256';

export abstract class Hashable {

  private hash?: string;

  constructor() {

  }

  abstract getHashingData(): object;

  getHash() {
    return this.hash;
  }

  protected calculateHash(canSet: boolean = false) {
    const hash = this.hashData(this.getHashingData());
    if (canSet)
      this.hash = hash;
    return hash;
  }

  protected hashData(data: any) {
    return SHA256(JSON.stringify(data)).toString()
  }

  isValidHash() {
    return this.hash === this.calculateHash();
  }
}
