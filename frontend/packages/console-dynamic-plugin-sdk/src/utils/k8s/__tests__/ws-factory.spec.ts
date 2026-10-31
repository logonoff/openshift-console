import { WSFactory } from '../ws-factory';

const CONNECTING = 0;
const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;

const createMockWS = () => ({
  readyState: CONNECTING,
  close: jest.fn(),
  send: jest.fn(),
  onopen: null,
  onclose: null,
  onerror: null,
  onmessage: null,
});

let lastMockWS: ReturnType<typeof createMockWS>;

const MockWebSocket = Object.assign(
  jest.fn().mockImplementation(() => {
    lastMockWS = createMockWS();
    return lastMockWS;
  }),
  { CONNECTING, OPEN, CLOSING, CLOSED },
);

(global as any).WebSocket = MockWebSocket;

const createWSFactory = () =>
  new WSFactory('test', {
    host: 'wss://localhost',
    path: '/test',
    subprotocols: [],
  });

const createBufferedWSFactory = (pausedBufferMax = 3) =>
  new WSFactory('test-buffered', {
    host: 'wss://localhost',
    path: '/test',
    subprotocols: [],
    jsonParse: false,
    reconnect: true,
    bufferMax: 10,
    pausedBufferMax,
    bufferFlushInterval: 500,
  });

const deliver = (payload: string) => lastMockWS.onmessage({ data: payload } as MessageEvent);

describe('WSFactory', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    MockWebSocket.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('send', () => {
    it('should send data when readyState is OPEN', () => {
      const ws = createWSFactory();
      lastMockWS.readyState = OPEN;

      ws.send('test-data');

      expect(lastMockWS.send).toHaveBeenCalledWith('test-data');
    });

    it('should not send data when readyState is CONNECTING', () => {
      const ws = createWSFactory();
      lastMockWS.readyState = CONNECTING;

      ws.send('test-data');

      expect(lastMockWS.send).not.toHaveBeenCalled();
    });

    it('should not send data when readyState is CLOSING', () => {
      const ws = createWSFactory();
      lastMockWS.readyState = CLOSING;

      ws.send('test-data');

      expect(lastMockWS.send).not.toHaveBeenCalled();
    });

    it('should not send data when readyState is CLOSED', () => {
      const ws = createWSFactory();
      lastMockWS.readyState = CLOSED;

      ws.send('test-data');

      expect(lastMockWS.send).not.toHaveBeenCalled();
    });

    it('should not throw when ws is destroyed', () => {
      const ws = createWSFactory();
      ws.destroy();

      expect(() => ws.send('test-data')).not.toThrow();
    });
  });

  describe('pause', () => {
    it('withholds buffered messages until unpaused, then flushes them in order', () => {
      const ws = createBufferedWSFactory();
      const onBulk = jest.fn();
      ws.onbulkmessage(onBulk);

      ws.pause();
      deliver('a');
      deliver('b');
      ws.flushMessageBuffer();

      expect(onBulk).not.toHaveBeenCalled();
      expect(ws.bufferSize()).toBe(2);
      expect(ws.hasDroppedMessages()).toBe(false);

      ws.unpause();

      expect(onBulk).toHaveBeenCalledTimes(1);
      expect(onBulk).toHaveBeenCalledWith(['a', 'b']);
      expect(ws.bufferSize()).toBe(0);
    });

    it('reports dropped messages and retains nothing once the paused budget is exceeded', () => {
      const ws = createBufferedWSFactory(3);
      const onBulk = jest.fn();
      ws.onbulkmessage(onBulk);

      ws.pause();
      ['a', 'b', 'c', 'd'].forEach(deliver);

      expect(ws.hasDroppedMessages()).toBe(true);
      expect(ws.bufferSize()).toBe(0);

      deliver('e');
      expect(ws.bufferSize()).toBe(0);

      ws.unpause();
      expect(onBulk).not.toHaveBeenCalled();
    });

    it('reports dropped messages when a reconnect discards a paused buffer', () => {
      const ws = createBufferedWSFactory();
      ws.onbulkmessage(jest.fn());

      ws.pause();
      deliver('a');
      expect(ws.hasDroppedMessages()).toBe(false);

      // A close with any code reconnects, and the replayed path carries the original
      // resourceVersion, so connect() throws the buffer away.
      lastMockWS.onclose({ code: 1000 } as CloseEvent);
      jest.advanceTimersByTime(1000);

      expect(ws.bufferSize()).toBe(0);
      expect(ws.hasDroppedMessages()).toBe(true);
    });

    it('clears the dropped flag on each pause so one hidden window does not taint the next', () => {
      const ws = createBufferedWSFactory(1);
      ws.onbulkmessage(jest.fn());

      ws.pause();
      ['a', 'b'].forEach(deliver);
      expect(ws.hasDroppedMessages()).toBe(true);

      ws.unpause();
      ws.pause();

      expect(ws.hasDroppedMessages()).toBe(false);
    });

    it('keeps evicting the oldest message when not paused', () => {
      const ws = createBufferedWSFactory();
      const onBulk = jest.fn();
      ws.onbulkmessage(onBulk);

      new Array(11).fill(0).forEach((_v, i) => deliver(`m${i}`));
      ws.flushMessageBuffer();

      expect(onBulk.mock.calls[0][0]).toHaveLength(10);
      expect(onBulk.mock.calls[0][0][0]).toBe('m1');
    });
  });

  describe('reconnect timeout', () => {
    it('reports a timeout to destroy handlers so subscribers can restart polling', () => {
      const ws = new WSFactory('test-timeout', {
        host: 'wss://localhost',
        path: '/test',
        subprotocols: [],
        reconnect: true,
        timeout: 2000,
      });
      const onDestroy = jest.fn();
      ws.ondestroy(onDestroy);

      lastMockWS.onclose({ code: 1006 } as CloseEvent);
      jest.advanceTimersByTime(60 * 1000);

      expect(onDestroy).toHaveBeenCalledWith(true);
      expect(ws.getState()).toBe('destroyed');
    });
  });
});
