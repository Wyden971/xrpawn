import {Blockchain} from "./models/Blockchain";
import {Block} from "./models/Block";
import {Transaction} from "./models/Transaction";
import {ec as EC} from 'elliptic';
import {Security} from "./models/Security";
import {Loan} from "./models/Loan";
import autobahn from 'autobahn';
import program from 'commander';

import {Server} from './models/Server';
import {Client} from "./models/Client";
import {Session} from "./WampRouter";

program
  .option('-m, --mode <mode>', 'Choix du mode', 'server')
  .parse(process.argv);

const options = program.opts();

const ec = new EC('secp256k1');
const masterKey = ec.keyFromPrivate('049589f0c3a1b31e7d55379bf3ea66de62bed7dad6c247cc8ecf30bed939e910');
const masterToken = masterKey.getPublic('hex');

const myKey = ec.keyFromPrivate('049589f0c3a1b31e7d55379bf3ea66de62bed7dad6c247cc8ecf30bed939e9b6');
const myAddress = myKey.getPublic('hex');

const myKey2 = ec.keyFromPrivate('049589f0c3a1b31e7d55379bf3ea66de62bed7dad6c247cc8ecf30bed939e9b7');
const myAddress2 = myKey2.getPublic('hex');

const myKey3 = ec.keyFromPrivate('049589f0c3a1b31e7d55379bf3ea66de62bed7dad6c247cc8ecf30bed939e9b8');
const myAddress3 = myKey3.getPublic('hex');

if (options.mode === 'server') {
  console.log('Start server');
  const server = new Server(myKey, 8889);

  const xrpawn = new Blockchain(myKey, [
    (new Transaction(masterToken, myAddress, 30000)),
    (new Transaction(masterToken, myAddress2, 2453)),
    (new Transaction(masterToken, myAddress3, 1000)),
  ]);

  for (var i = 0; i < 100; i++) {
    const tx = new Transaction(myAddress, myAddress2, 10);
    tx.sign(myKey);
    xrpawn.addTransaction(tx);
    const block = xrpawn.generateBlock(myAddress3);

    if (block) {
      xrpawn.voteAsValidator(myKey3, block);
      xrpawn.vote(block, myKey2);
      xrpawn.vote(block, myKey);
      xrpawn.addBlock(block, myKey3);
    }
  }

  server.getRouter().subscribeTopic('block', (publicationId, session) => {
    console.log('new block');
  });

  server.getRouter().subscribeTopic('chain', (publicationId, session, chain: any) => {
    console.log('chain :', chain);
  });

  server.getRouter().registerRPC('check', (id, session, lastBlockHash) => {
    return xrpawn.getLatestBlock().hash === lastBlockHash;
  })

  server.getRouter().registerRPC('sync', (id, session, index: number, blocks: Block[]) => {
    const maxLength = (index + (blocks.length || 2));

    console.log('sync : ', index, blocks.length, maxLength);

    for (let i = index; i < xrpawn.chain.length && i < maxLength; i++) {
      const currentBlock = xrpawn.chain[i];
      for (const blockData of blocks) {
        const block = Block.fromData(blockData);
        console.log('block : ', block);
        if (!currentBlock.compare(block)) {
          return {
            blocks: xrpawn.chain.slice(index, blocks.length),
            index,
            done: (index + maxLength) >= xrpawn.chain.length
          };
        }
      }
    }
    return {
      blocks: [],
      index,
      done: maxLength >= xrpawn.chain.length
    };
  });


  server.start();
} else if (options.mode === 'client') {
  console.log('Start client');
  const masterKey = ec.keyFromPrivate('049589f0c3a1b31e7d55379bf3ea66de62bed7dad6c247cc8ecf30bed939e910');
  const client = new Client(masterKey, '127.0.0.1', 8889);


  const xrpawn = new Blockchain(myKey, [
    (new Transaction(masterToken, myAddress, 30000)),
    (new Transaction(masterToken, myAddress2, 2453)),
    (new Transaction(masterToken, myAddress3, 1000)),
  ]);

  function syncChain(session: autobahn.Session, syncIndex = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Sync : ', syncIndex, '...');
      type SyncResult = {
        blocks: Block[],
        index: number,
        done: boolean
      };

      session
        .call<SyncResult>('sync', [syncIndex, xrpawn.chain.slice(syncIndex, 2)])
        .then((data) => {
          console.log('Sync : ', data.index, data.done, data.blocks.length || 'no sync', 'OK');
          data.blocks = data.blocks.map((block) => Block.fromData(block));
          if (data.blocks.length) {
            xrpawn.chain.splice(syncIndex, data.blocks.length, ...data.blocks);
          }
          if (!data.done) {
            syncChain(session, syncIndex + (data.blocks.length || 2));
          } else {
            resolve();
          }
        })
        .catch(reject);
    });
  }

  client
    .connect()
    .then((session) => {
      syncChain(session)
        .then(() => console.log('sync done'))
        .catch((err) => {
          console.error(err);
        })
    })


}
/*


const masterKey = ec.keyFromPrivate('049589f0c3a1b31e7d55379bf3ea66de62bed7dad6c247cc8ecf30bed939e910');
const masterToken = masterKey.getPublic('hex');


console.log('my address : ', myAddress);

const sg = myKey.sign('true', 'base64').toDER('hex');

console.log('verify : ', ec.keyFromPublic(myAddress2, 'hex').verify('false', sg));

const xrpawn = new Blockchain(masterKey, [
  (new Transaction(masterToken, myAddress, 30000)),
  (new Transaction(masterToken, myAddress2, 2453)),
  (new Transaction(masterToken, myAddress3, 1000)),
]);

/!*
const security = new Security(myAddress, {
  name: 'PS4',
  value: 500,
  buyAt: 2345676543
});

//security.sign(myKey);
xrpawn.addSecurity(security, myKey);

 *!/

console.log('xrpawn balance : ', xrpawn.getBalanceOfAddress(myAddress));

const transaction = new Transaction(myAddress3, myAddress2, 200);
transaction.sign(myKey3);
xrpawn.addTransaction(transaction);

const block = xrpawn.generateBlock(myAddress);

if (block) {

  xrpawn.voteAsValidator(myKey, block);

  // block.addVote(block.vote(myKey), xrpawn); Ne peut pas revoter
  block.addVote(block.vote(myKey2), xrpawn);
  block.addVote(block.vote(myKey3), xrpawn);


  console.log('Result : ', block.getVoteResult(xrpawn));

  xrpawn.addBlock(block, myKey);
} else {
  console.log('Invalid block');
}

console.log('Chain Length : ', xrpawn.chain.length);
console.log('isValid : ', xrpawn.isChainValid());
console.log('xrpawn balance myAddress : ', xrpawn.getBalanceOfAddress(myAddress));
console.log('xrpawn balance myAddress2 : ', xrpawn.getBalanceOfAddress(myAddress2));
console.log('xrpawn balance myAddress3 : ', xrpawn.getBalanceOfAddress(myAddress3));


const security = new Security(myAddress3, {
  name: 'PS4',
  value: 500,
  buyAt: 2345676543
});

//security.sign(myKey3);
xrpawn.addSecurity(security, myKey3);

const block2 = xrpawn.generateBlock(myAddress2);

if (block2) {

  xrpawn.voteAsValidator(myKey2, block2);

  block2.addVote(block2.vote(myKey), xrpawn);
  //block2.addVote(block2.vote(myKey2), xrpawn); //Ne peut pas revoter
  block2.addVote(block2.vote(myKey3), xrpawn);


  console.log('Result : ', block2.getVoteResult(xrpawn));

  xrpawn.addBlock(block2, myKey2);
} else {
  console.log('Invalid block');
}

console.log('Chain Length : ', xrpawn.chain.length);
console.log('isValid : ', xrpawn.isChainValid());
console.log('xrpawn balance myAddress : ', xrpawn.getBalanceOfAddress(myAddress));
console.log('xrpawn balance myAddress2 : ', xrpawn.getBalanceOfAddress(myAddress2));
console.log('xrpawn balance myAddress3 : ', xrpawn.getBalanceOfAddress(myAddress3));*/

