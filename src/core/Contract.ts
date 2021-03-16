// @ts-ignore
import SHA256 from 'crypto-js/sha256';
import {ec as EC} from "elliptic";
import * as vm from 'vm';
import {isNumeric} from "tslint";
import {getObjectSize} from "./utils";
import {Hashable} from "./Hashable";
import {Signable} from "./Signable";
import {Balances} from "./types";

const ec = new EC('secp256k1');

export class Contract extends Signable {
  readonly address: string;
  readonly creator: string;
  owner: string;
  state: any;
  readonly code: string;
  readonly createdAt: number;
  updatedAt: number;

  constructor(owner: string, state: any, code: string) {
    super();
    const signinKey = ec.genKeyPair();
    this.address = signinKey.getPublic('hex');
    this.owner = owner;
    this.creator = owner;
    this.state = state;
    this.code = code;
    this.createdAt = Date.now();
    this.updatedAt = Date.now();

    this.sign(signinKey);
  }

  getPublicKey() {
    return this.address;
  }

  getSignableHash() {
    return this.hashData({
      address: this.address,
      creator: this.creator,
      code: this.code,
      createdAt: this.createdAt
    })
  }

  getHashingData() {
    return {
      address: this.address,
      owner: this.owner,
      creator: this.creator,
      code: this.code,
      state: this.state,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  calculateSize() {
    return getObjectSize({
      ...this.getHashingData(),
      signature: this.getSignature(),
      hash: this.getHash()
    });
  }

  hasValidSignature() {
    return this.verify();
  }

  execute(blockchain: any, runnerAddress: string, fct: string, args: any[] = [], balance: number = 0, amount: number = 0) {
    if (!this.hasValidSignature())
      throw new Error('The contract is invalid');

    let context: any;
    let balanceChanged = false;
    const balances = {
      [this.address]: balance + amount
    };

    const initialBalanceHash = this.hashData(balances);

    const contextBalances = new Proxy(balances, {
      isExtensible: () => false,
      deleteProperty: () => false,
      get: (object, name) => {
        return (name in balances) ? object[name as string] : 0;
      },
      set: (object, name, value, receiver) => {
        return false;
      }
    });

    const transfert = new Proxy((toAddress: string, amount: number) => true, {
      isExtensible: () => false,
      deleteProperty: () => false,
      apply: (target, thisArg, args) => {
        console.log('transfert');
        if (args?.length < 2)
          throw new Error('toAddress and alount are required');

        const [toAddress, amount] = args;

        if ((balances[this.address] - amount) < 0) {
          throw new Error('The balance cannot be lower than zero');
          return false;
        }

        balances[this.address] = (balances[this.address] ?? 0) - amount;
        balances[toAddress] = (balances[toAddress] ?? 0) + amount;
        balanceChanged = true;
        return true;
      }
    });

    const assert = new Proxy((condition: boolean) => true, {
      isExtensible: () => false,
      deleteProperty: () => false,
      apply: (target, thisArg, args) => {
        if (args?.length < 1)
          throw new Error('Condition is required');

        const [condition] = args;

        console.log('assert : ', condition);

        if (!condition) {
          throw new Error('Assert bad condition');
        }
        return condition;
      }
    })

    context = vm.createContext({
      fromAddress: runnerAddress,
      balances: contextBalances,
      state: {...this.state},
      newState: {...this.state},
      amount: amount,
      owner: this.owner,
      contractId: this.address,
      result: undefined,
      log: console.log,
      console: {
        log: console.log
      },
      assert,
      transfert,
      fct,
      args,
    });

    vm.runInNewContext(`
      ${this.code};
      const instance = new exports();
      Object.assign(instance, state);
      if(fct in instance)
        result = instance[fct].apply(instance, args);
      for(var key in state){
        newState[key] = instance[key];
      }
    `, context, {
      timeout: 3000,
    });

    console.log('context : ', context);

    balanceChanged = balanceChanged && initialBalanceHash !== this.hashData(balances);

    console.log('context.balances : ', context.balances, balances);
    if (context.balances[this.address] < 0) {
      throw new Error('The balance of the contract cannot be lower than 0');
    }

    const lastOwner = this.owner;
    const lastState = this.state;
    const lastUpdatedAt = this.updatedAt;

    this.owner = context.owner;
    this.state = context.newState;
    this.updatedAt = Date.now();

    const nextHash = this.calculateHash();
    if (this.getHash() !== nextHash || balanceChanged) {
      return {
        result: context.result,
        balances: context.balances,
        modified: true
      };
    } else {
      this.owner = lastOwner;
      this.state = lastState;
      this.updatedAt = lastUpdatedAt;
    }
    return {
      result: context.result,
      balances: context.balances,
      modified: false
    };
  }
}
