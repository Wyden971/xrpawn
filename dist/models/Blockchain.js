"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Block_1 = require("./Block");
const Transaction_1 = require("./Transaction");
const BlockData_1 = require("./BlockData");
class Blockchain {
    constructor(signingKey, transactions) {
        this.chain = [];
        this.miningReward = 100;
        this.chain = [this.createGenesisBlock(signingKey, transactions)];
        this.pendingTransactions = [];
    }
    createGenesisBlock(signingKey, transactions) {
        const block = new Block_1.Block(0, new Date().getTime(), signingKey.getPublic('hex'), transactions);
        block.sign(signingKey);
        return block;
    }
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }
    generateBlock(validatorAddress) {
        const block = new Block_1.Block(this.chain.length, Date.now(), validatorAddress, this.pendingTransactions, this.getLatestBlock().hash);
        if (!block.hasValidTransactions()) {
            throw new Error('No valid transactions');
        }
        return block;
    }
    voteAsValidator(signingKey, block) {
        if (block.validatorAddress != signingKey.getPublic('hex'))
            throw new Error('You cannot vote as a validator because you are not a validator');
        block.addVote(block.vote(signingKey), this);
        return block;
    }
    minePendingTransactions(signingKey) {
        if (!this.pendingTransactions.length) {
            throw new Error('You doesnt have pending transactions');
        }
        const miningRewardAddress = signingKey.getPublic('hex');
        const rewardTx = new Transaction_1.Transaction(null, miningRewardAddress, this.miningReward);
        this.pendingTransactions.push(rewardTx);
        const block = new Block_1.Block(this.chain.length, Date.now(), '', this.pendingTransactions, this.getLatestBlock().hash);
        block.vote(signingKey);
        console.log('voted : ', block.getVotes());
        console.log('block successfull mined : ', block.index);
        this.chain.push(block);
        this.pendingTransactions = [];
        return block;
    }
    addTransaction(transaction) {
        var _a, _b;
        if (!`${(_a = transaction.fromAddress) !== null && _a !== void 0 ? _a : ''}`.trim().length || !`${(_b = transaction.toAddress) !== null && _b !== void 0 ? _b : ''}`.trim().length) {
            throw new Error('fromAddress or toAdress could not be empty');
        }
        if (!transaction.isValid()) {
            throw new Error('You cannot add not valid transaction');
        }
        this.pendingTransactions.push(transaction);
    }
    getBalanceOfAddress(address) {
        let balance = 0;
        const reward = 0.01;
        const staticFee = 0.0002;
        for (const block of this.chain) {
            for (const transaction of block.transactions) {
                const fee = block.transactions.length * staticFee;
                switch (transaction.type) {
                    case BlockData_1.BlockDataType.transaction:
                        //Les frais augmente en fonction du nombre de transaction
                        if (transaction.fromAddress === address) {
                            balance -= transaction.amount - fee;
                        }
                        if (transaction.toAddress === address) {
                            balance += transaction.amount;
                        }
                        //On s'assure que le validateur reçoive les frais de transaction
                        if (address === block.validatorAddress) {
                            balance += fee;
                        }
                        break;
                    case BlockData_1.BlockDataType.loan:
                        if (address === transaction.fromAddress) {
                            balance -= fee;
                        }
                        break;
                }
            }
            //On s'assure que les votant aient tous reçu leur récompense
            const votes = block.getVotes();
            if (votes.length > 1) {
                for (const vote of votes) {
                    if (block.isValidVote(vote, null) && vote.voterAddress === address) {
                        // Si le validateur ne respecte pas la block chaine, il perd ses fond en faveur des votants
                        if (vote.asValidator && vote.voterAddress !== block.validatorAddress) {
                            return 0;
                        }
                        else {
                            balance += balance * reward;
                            balance += votes
                                .filter((itemVote) => itemVote.asValidator && itemVote.voterAddress !== block.validatorAddress)
                                .map((itemVote) => this.getBalanceOfAddress(itemVote.voterAddress))
                                .reduce((result, balance) => result + balance, 0) / (votes.length - 1);
                        }
                    }
                }
            }
        }
        return balance;
    }
    addBlock(newBlock, signingKey) {
        newBlock.previousHash = this.getLatestBlock().hash;
        newBlock.mineBlock(Blockchain.difficulty, true);
        newBlock.sign(signingKey);
        this.chain.push(newBlock);
        this.pendingTransactions = [];
    }
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const previousBlock = this.chain[i - 1];
            const currentBlock = this.chain[i];
            if (!currentBlock.isValid(Blockchain.difficulty)) {
                console.warn('the current block is invalid because of difficulty : ', currentBlock.index);
                return false;
            }
            if (!currentBlock.hasValidTransactions()) {
                console.warn('the current block has invalid transactions : ', currentBlock.index);
                return false;
            }
            if (currentBlock.hash !== currentBlock.calculateHash(true)) {
                console.warn('the current block hash is invalid', currentBlock.index);
                return false;
            }
            if (currentBlock.previousHash !== previousBlock.hash) {
                console.warn('the current previous has doesnt match de correct  hash');
                return false;
            }
            if (!currentBlock.hasValidVotes(this)) {
                console.warn('Invalid votes');
                return false;
            }
        }
        return true;
    }
    addSecurity(security, signingKey) {
        if (!security.id) {
            throw new Error('You cannot add security without id');
        }
        for (const tx of this.pendingTransactions) {
            if (tx.type === BlockData_1.BlockDataType.security) {
                if (tx.id === security.id) {
                    throw new Error('You cannot add same security in a block');
                }
            }
        }
        const existingSecurity = this.getTransactionById(security.id);
        if (existingSecurity && (existingSecurity === null || existingSecurity === void 0 ? void 0 : existingSecurity.fromAddress) !== security.fromAddress)
            throw new Error('You cannot modify a security signed by someone else');
        security.previousHash = existingSecurity === null || existingSecurity === void 0 ? void 0 : existingSecurity.hash;
        security.sign(signingKey);
        if (!security.isValid()) {
            throw new Error('You cannot add not valid security');
        }
        this.pendingTransactions.push(Object.assign({}, security));
    }
    addLoan(loan, signingKey) {
        const existingPendingLooan = this.getPendingTransactionById(loan.id);
        if (existingPendingLooan) {
            throw new Error('You cannot add the same loan in a block');
        }
        const existingLoan = this.getTransactionById(loan.id);
        if (existingLoan && (existingLoan === null || existingLoan === void 0 ? void 0 : existingLoan.fromAddress) !== loan.fromAddress)
            throw new Error('You cannot modify a security signed by someone else');
        if ((existingLoan === null || existingLoan === void 0 ? void 0 : existingLoan.signature) && (existingLoan === null || existingLoan === void 0 ? void 0 : existingLoan.signature2)) {
            throw new Error('you cannot modify a both signed loan');
        }
        loan.previousHash = existingLoan === null || existingLoan === void 0 ? void 0 : existingLoan.hash;
        loan.sign(signingKey);
        if (!loan.isValid()) {
            throw new Error('you cannot add not valid loan');
        }
        this.pendingTransactions.push(Object.assign({}, loan));
    }
    getTransactionById(txId) {
        let nextTx = undefined;
        for (const block of this.chain) {
            for (const transaction of block.transactions) {
                const tx = transaction;
                if (txId === tx.id && (!nextTx || nextTx.hash === tx.previousHash)) {
                    nextTx = tx;
                }
            }
        }
        return Block_1.Block.definePrototypeOfTransaction(Object.assign({}, nextTx));
    }
    getPendingTransactionById(txId) {
        for (const tx of this.pendingTransactions) {
            if (tx.id === txId) {
                return tx;
            }
        }
    }
}
exports.Blockchain = Blockchain;
Blockchain.difficulty = 2;
Blockchain.escrow = {
    publicKey: '04a78f9df9d68223fc980f14b111bd7d57c279de0a257c43fa389989fd958790836c5fe4222ec084481e362c00befa3a28cf7f1df76819d311d07b129ad8c7c2f5',
    privateKey: '049589f0c3a1b31e7d55379bf3ea66de62bed7dad6c247cc8ecf30bed939e9b6'
};
//# sourceMappingURL=Blockchain.js.map