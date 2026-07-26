import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import rideRoutes from './routes/rides';

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.get('/api/health', (_req: any, res: any) => res.json({ status: 'ok' }));

const io = new Server(httpServer, { cors: { origin: '*' } });
io.on('connection', (s: any) => {
  s.on('join-chat', (d: any) => s.join(d.rideId));
  s.on('send-message', (d: any) => { s.to(d.rideId).emit('new-message', d.message); });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log('NAVIGO API on port ' + PORT));