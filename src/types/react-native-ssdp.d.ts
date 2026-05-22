declare module 'react-native-ssdp' {
  import { EventEmitter } from 'events';

  class Client extends EventEmitter {
    search(serviceType: string): void;
    stop(): void;
  }

  export { Client };
}
