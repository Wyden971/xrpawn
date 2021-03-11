import {v4 as uuid4} from 'uuid';
import {Server as WebSocketServer, ServerOptions} from 'ws';
import {Session} from './Session';
import log from './Log';
import {EventEmitter} from 'events';

type SubscriptionCallback = (publicationId: string, session: Session | undefined, ...args: any[]) => void;
type RPCCallback = (invId: string, session?: Session, ...args: any[]) => any;
type Topics = {
  [uri: string]: {
    [id: string]: SubscriptionCallback
  }
}

type RouterOptions = {
  maximumClient: number
}


export class Router extends EventEmitter {

  static DEFAULT_ROUTER_OPTIONS: RouterOptions = {
    maximumClient: -1
  };

  private wss: WebSocketServer;
  private readonly rpcs: any = {};
  private readonly sessions: any = {};
  private readonly pendings: {
    [id: string]: {
      resolve: any,
      reject: any
    }
  } = {};
  private topics: Topics = {};
  private options: RouterOptions;


  constructor(serverOptions?: ServerOptions, options: RouterOptions = Router.DEFAULT_ROUTER_OPTIONS) {
    super();
    this.options = options;
    this.wss = new WebSocketServer({
      ...serverOptions,
      handleProtocols: (protocols: string[]) => {
        if (protocols.includes("wamp.2.json"))
          return "wamp.2.json";
        else
          return false;
      }
    } as ServerOptions);

    this.wss.on('connection', (client) => {
      if (!this.options.maximumClient || this.options.maximumClient <= 0 || Object.keys(this.sessions).length < this.options.maximumClient) {
        var id = uuid4();
        const session = new Session(this, client);
        this.emit('Connection', session);
        client.on('close', () => {
          this.emit('Disconnection', session);
          this.deleteSessionById(id);
        });
        this.sessions[id] = session;
      } else {
        client.close();
      }
    });
  }

  public getSessions() {
    return this.sessions;
  }

  public getSession(sessionId: string) {
    if (sessionId in this.sessions) {
      return this.sessions[sessionId];
    }
    return undefined;
  }

  private deleteSessionById(id: string) {
    if (id in this.sessions) {
      this.sessions[id].cleanup();
      delete this.sessions[id];
    }
    return this;
  }

  private trace(msg: string) {
    log.trace('[ROUTER] ' + msg)
  }

  public close() {
    this.wss.close();
  };

  public hasRPC(uri: string) {
    return (uri in this.rpcs);
  }

  public getRPC(uri: string) {
    if (uri in this.rpcs) {
      return this.rpcs[uri];
    }
    return undefined;
  }

  public registerRPC(uri: string, rpc: RPCCallback, session?: Session) {
    this.trace("Registering " + uri);
    if (!(uri in this.rpcs) && typeof rpc === 'function') {
      this.rpcs[uri] = rpc;
      this.emit('RPCRegistered', uri, session);
      return true;
    }
    return false;
  }

  public unregisterRPC(uri: string, session?: Session) {
    this.trace("Unregistering " + uri);

    if (uri in this.rpcs) {
      delete this.rpcs[uri];
      this.emit('RPCUnregistered', uri, session);
      return true;
    }
    return false;
  }

  callRPC(uri: string, ...args: any[]): Promise<any>;
  callRPC(uri: string, session?: Session, ...args: any[]): Promise<any> {
    if (!this.hasRPC(uri)) {
      return Promise.reject();
    } else {
      return new Promise((resolve, reject) => {
        var invId = uuid4();
        if (!session)
          this.pendings[invId] = {resolve, reject};
        try {
          const result = this.getRPC(uri).apply(null, [invId, session, ...args]);
          if (session) {
            resolve(result);
          }
        } catch (e) {
          reject(e);
        }
      });
    }
  }

  respondRPC(invId: string, err: any, args: any[] = [], session?: Session) {
    if (invId in this.pendings) {
      const actions = this.pendings[invId];
      if (err) {
        actions.reject(err);
      } else {
        actions.resolve(...[invId, session, ...args]);
      }
      delete this.pendings[invId];
      return true;
    }
    return false;
  }

  public hasTopic(topicUri: string) {
    return (topicUri in this.topics);
  }

  public getTopic(topicUri: string) {
    if (this.hasTopic(topicUri)) {
      return this.topics[topicUri];
    }
    return undefined;
  }

  public subscribeTopic(topicUri: string, callback: SubscriptionCallback, subscriptionId: string = uuid4(), session?: Session) {
    this.trace("Registering topic " + topicUri + " subsc id " + subscriptionId);
    if (this.hasTopic(topicUri) && subscriptionId in this.topics[topicUri]) {
      return undefined;
    }

    this.topics = {
      ...this.topics,
      [topicUri]: {
        ...(this.topics[topicUri] ?? {}),
        [subscriptionId]: callback
      }
    };
    this.emit('Subscribe', topicUri, session);
    return subscriptionId;
  };

  public unsubscribeTopic(topicUri: string, subscriptionId: string, session?: Session) {
    this.trace("Unregistering topic " + topicUri + " subsc id " + subscriptionId);
    if (this.hasTopic(topicUri) && subscriptionId in this.topics[topicUri]) {
      delete this.topics[topicUri][subscriptionId];
      this.emit('Unsubscribe', topicUri, session);
      return true;
    }
    return false;
  };

  public publish(topicUri: string, publicationId: string = uuid4(), session?: Session, ...args: any[]) {
    this.trace("Publish " + topicUri + " " + publicationId);
    this.emit('Publish', topicUri, session, ...args);

    if (this.hasTopic(topicUri)) {
      const publicationArgs: any = [publicationId, session, ...args];
      for (const subscriptionId in this.topics[topicUri]) {
        const subscribe = this.topics[topicUri][subscriptionId];
        subscribe.apply(null, publicationArgs);
      }
      return true;
    }
    this.trace('Undefined topic ' + topicUri);
    return false;
  }

  public on(event: 'Connection', listener: (session: Session) => void): this;
  public on(event: 'Disconnection', listener: (session: Session) => void): this;
  public on(event: 'RPCRegistered', listener: (uri: string, session?: Session) => void): this;
  public on(event: 'RPCUnregistered', listener: (uri: string, session?: Session) => void): this;
  public on(event: 'Subscribe', listener: (topicUri: string, session?: Session) => void): this ;
  public on(event: 'Unsubscribe', listener: (topicUri: string, session?: Session) => void): this ;
  public on(event: 'Publish', listener: (topicUri: string, session?: Session, ...args: any[]) => void): this ;
  public on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event as any, listener);
  }
}
