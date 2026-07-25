import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import rideRoutes from './routes/rides';

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: '/oauth/google/callback'
  },
  (_a: any, _r: any, profile: any, done: any) => done(null, profile)
));

app.get('/oauth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/oauth/google/callback', passport.authenticate('google', { session: false }), (_req: any, res: any) => {
  res.redirect('https://navigo-nu-eight.vercel.app/rider/home');
});

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