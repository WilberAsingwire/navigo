import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

class SocketService {
  private socket: any = null;

  connect(userId: string) {
    if (this.socket) return this.socket;

    this.socket = io(SOCKET_URL, {
      // Allow polling fallback for mobile networks, restrictive proxies and
      // deployments where a direct WebSocket upgrade is unavailable.
      transports: ['websocket', 'polling'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
      timeout: 10000,
      auth: {
        token: localStorage.getItem('navigo_token')
      }
    });

    this.socket.on('connect', () => {
      console.log('Connected to NAVIGO socket server');
      this.socket.emit('join', userId);
    });

    this.socket.on('connect_error', (err: any) => {
      console.error('Socket connection error:', err.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }
}

export default new SocketService();
