import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

class SocketService {
  private socket: any = null;

  connect(userId: string) {
    if (this.socket) return this.socket;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      upgrade: false,
      auth: {
        token: localStorage.getItem('navigo_token')
      }
    });

    this.socket.on('connect', () => {
      console.log('🔌 Connected to NAVIGO Socket Server');
      this.socket.emit('join', userId);
    });

    this.socket.on('connect_error', (err: any) => {
      console.error('❌ Socket Connection Error:', err.message);
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
