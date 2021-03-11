import * as fs from 'fs';
import https from 'https';
import path from 'path';

// @ts-ignore
import {Router as WampRouter, Session} from '../WampRouter/';
import {ec as EC} from "elliptic";
import SHA256 from "crypto-js/sha256";

global.WAMPRT_TRACE = true;
const ec = new EC('secp256k1');

type ServerPeer = { session: Session; address: string; authenticated: boolean; authenticationTimeout?: any };
type NodeRegistrationData = { address: string; hash: string; signature: string };

export class Server {
  private port: number;
  //private server: https.Server;
  private signingKey: EC.KeyPair;
  private router: WampRouter;
  private peers: ServerPeer[] = [];
  public asValidator: boolean = false;
  public nbClientMax = 115;
  public authenticationTimeout = 5000;

  constructor(signingKey: EC.KeyPair, port: number) {
    this.port = port;
    this.signingKey = signingKey;
    const key = fs.readFileSync(path.join(__dirname, '../../key.pem'));
    const cert = fs.readFileSync(path.join(__dirname, '../../cert.pem'));
    /// this.server = https.createServer({key, cert, passphrase: 'chain'});

    this.router = new WampRouter({
      port: this.port,
      //server: this.server,
    });
  }

  getRouter() {
    return this.router;
  }

  isConnected(sessionId: string) {
    return !!this.peers.find((peer) => peer.session.id === sessionId);
  }

  getPeerBySessionId(sessionId: string) {
    return this.peers.find((peer) => peer.session.id === sessionId);
  }

  getPeerByAddress(address: string) {
    return this.peers.find((peer) => peer.address === address);
  }

  getAddress() {
    return this.signingKey.getPublic('hex');
  }

  getAddressHash() {
    return SHA256(this.getAddress()).toString();
  }

  getMe() {
    const address = this.getAddress();
    const hash = this.getAddressHash();
    const signature = this.signingKey.sign(hash, 'base64').toDER('hex');
    return {
      address,
      hash,
      signature
    }
  }

  start() {
    this.router.registerRPC(this.getAddress(), (id, args) => this.getMe());

    this.router.registerRPC('authentication', (id: any, session, address: string, hash: string, signature: string) => {
      console.log('authentication : ', id, address, hash, signature);
      if (!session)
        return null;

      if (!`${address ?? ''}`.trim().length || !`${hash ?? ''}`.trim().length || !`${signature ?? ''}`.trim().length) {
        return session.terminate(1000, 'Address, hash or signature are missing');
      }

      if (SHA256(address).toString() !== hash) {
        return session.terminate(1000, 'Invalid hash');
      }

      if (!ec.keyFromPublic(address, 'hex').verify(hash, signature)) {
        return session.terminate(1000, 'Invalid signature');
      }

      const found = this.peers.find((peer) => peer.session.id === id || peer.address === address);
      if (found) {
        return session.terminate(1000, 'Already authenticated');
      }

      this.peers.push({
        address,
        session: session,
        authenticated: false,
        authenticationTimeout: setTimeout(() => {
          session.close();
        }, this.authenticationTimeout)
      });

      return this.getMe();
    });

    this.router.on('RPCRegistered', (uri, session) => {
      console.log('RPCRegistered : ', arguments);
      if (session?.id) {
        this.peers.some((peer) => {
          if (peer.session.id === session?.id) {
            peer.authenticated = true;
            clearTimeout(peer.authenticationTimeout);
            delete peer.authenticationTimeout;
            return true;
          }
        });
      }
    });

    this.router.on('RPCUnregistered', (uri, session) => {
      console.log('RPCUnregistered : ', arguments);
      if (session?.id) {
        this.peers.some((peer, index) => {
          if (peer.session.id === session?.id) {
            this.peers.splice(index, 1);
            return true;
          }
        })
      }
    });
    console.log('Listening on port ', this.port);
  }

  onPublish(args: any) {
    console.log('onPublish : ', args);
  }


}
