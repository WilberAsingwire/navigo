import React, { useState, useEffect, useRef } from 'react';
import {
  IonIcon, IonButton, IonTextarea, IonAvatar, IonBadge,
  IonSpinner, IonChip
} from '@ionic/react';
import {
  sendOutline, closeOutline, checkmarkDoneOutline,
  timeOutline, personOutline, carOutline, happyOutline,
  attachOutline, micOutline, callOutline, imageOutline,
  locationOutline, informationCircleOutline, cameraOutline
} from 'ionicons/icons';
import { io, Socket } from 'socket.io-client';
import './ChatBox.css';

const SOCKET_URL = 'https://navigo-1-z7ne.onrender.com';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole: 'rider' | 'driver';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  type?: 'text' | 'image' | 'location';
}

interface ChatBoxProps {
  rideId: string;
  currentUser: { id: string; name: string; role: string; photo?: string; };
  otherUser: { id: string; name: string; role: string; photo?: string; };
  onClose: () => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({ rideId, currentUser, otherUser, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const EMOJIS = ['😊','😂','❤️','👍','🙏','🔥','🎉','😍','🤗','💪','👋','🚗','🏍️','⭐','✅','🆘'];

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      query: { userId: currentUser.id, role: currentUser.role }
    });
    newSocket.on('connect', () => { setIsConnected(true); newSocket.emit('join-chat', { rideId }); });
    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('new-message', (message: Message) => {
      setMessages(prev => [...prev, { ...message, status: 'delivered' }]);
      newSocket.emit('message-read', { messageId: message.id, rideId });
      setUnreadCount(c => c + 1);
    });
    newSocket.on('message-read-confirmed', (messageId: string) => {
      setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, status: 'read' } : msg));
    });
    newSocket.on('user-typing', (data: { userId: string; isTyping: boolean }) => {
      if (data.userId === otherUser.id) setIsTyping(data.isTyping);
    });
    newSocket.emit('load-messages', { rideId }, (loadedMessages: Message[]) => setMessages(loadedMessages || []));
    setSocket(newSocket);
    return () => { newSocket.disconnect(); };
  }, [rideId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);
  useEffect(() => { setUnreadCount(0); }, []);

  const sendMessage = (text: string, type: 'text' | 'image' | 'location' = 'text') => {
    if (!text.trim() || !socket) return;
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      text: text.trim(), senderId: currentUser.id, senderName: currentUser.name,
      senderRole: currentUser.role as 'rider' | 'driver', timestamp: new Date(), status: 'sent', type
    };
    socket.emit('send-message', { rideId, message });
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setShowEmoji(false);
    socket.emit('typing', { rideId, userId: currentUser.id, isTyping: false });
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    if (socket) {
      socket.emit('typing', { rideId, userId: currentUser.id, isTyping: value.length > 0 });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => socket.emit('typing', { rideId, userId: currentUser.id, isTyping: false }), 2000);
    }
  };

  const shareLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const locText = `📍 https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
        sendMessage(locText, 'location');
      });
    }
  };

  const formatTime = (date: Date) => new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <IonIcon icon={timeOutline} className="msg-status-icon" />;
      case 'delivered': return <IonIcon icon={checkmarkDoneOutline} className="msg-status-icon delivered" />;
      case 'read': return <IonIcon icon={checkmarkDoneOutline} className="msg-status-icon read" />;
      default: return null;
    }
  };

  const quickReplies = ['I\'m here', 'On my way', 'Almost there', 'Thank you!', 'Okay', 'Wait a moment'];

  return (
    <div className="chat-box">
      <div className="chat-header">
        <div className="chat-user-info">
          <IonAvatar className="chat-avatar">
            <img src={otherUser.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=FF6B35&color=fff&size=64`} alt={otherUser.name} />
          </IonAvatar>
          <div className="chat-user-details">
            <h4>{otherUser.name}</h4>
            <div className="chat-user-meta">
              <IonIcon icon={otherUser.role === 'driver' ? carOutline : personOutline} />
              <span>{otherUser.role === 'driver' ? 'Driver' : 'Rider'}</span>
              {isConnected ? <IonBadge color="success" className="online-dot">● Online</IonBadge> : <IonBadge color="medium">Offline</IonBadge>}
            </div>
          </div>
        </div>
        <div className="chat-header-actions">
          <IonButton fill="clear" size="small"><IonIcon icon={callOutline} /></IonButton>
          <IonButton fill="clear" size="small" onClick={onClose}><IonIcon icon={closeOutline} /></IonButton>
        </div>
      </div>

      <div className="chat-messages">
        {!isConnected && <div className="chat-connecting"><IonSpinner name="crescent" /> Connecting...</div>}
        {messages.length === 0 && isConnected && (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <h4>Start chatting with {otherUser.name}</h4>
            <p>Messages are secure and encrypted</p>
            <div className="chat-empty-info">
              <IonIcon icon={informationCircleOutline} />
              <span>You can share your location or send quick replies</span>
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMine = msg.senderId === currentUser.id;
          const showAvatar = i === 0 || messages[i - 1]?.senderId !== msg.senderId;
          return (
            <div key={msg.id} className={`message-wrapper ${isMine ? 'mine' : 'theirs'}`}>
              {!isMine && <IonAvatar className="msg-avatar" style={{ opacity: showAvatar ? 1 : 0 }}>
                <img src={otherUser.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=FF6B35&color=fff&size=32`} alt="" />
              </IonAvatar>}
              <div className={`message-bubble ${isMine ? 'mine' : 'theirs'} ${msg.type === 'location' ? 'location' : ''}`}>
                {msg.type === 'location' ? (
                  <div className="location-msg"><span>📍</span><span>Shared Location</span></div>
                ) : <p className="message-text">{msg.text}</p>}
                <div className="message-meta">
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                  {isMine && getStatusIcon(msg.status)}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="typing-indicator">
            <IonAvatar className="msg-avatar"><img src={otherUser.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=FF6B35&color=fff&size=32`} alt="" /></IonAvatar>
            <div className="typing-bubble"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="quick-replies">
        {quickReplies.map((reply, i) => (
          <button key={i} className="quick-reply-btn" onClick={() => sendMessage(reply)}>{reply}</button>
        ))}
      </div>

      {showEmoji && (
        <div className="emoji-picker">
          {EMOJIS.map((emoji, i) => (
            <button key={i} className="emoji-btn" onClick={() => { setNewMessage(newMessage + emoji); setShowEmoji(false); }}>{emoji}</button>
          ))}
        </div>
      )}

      <div className="chat-input-area">
        <IonButton fill="clear" size="small" onClick={() => setShowEmoji(!showEmoji)}><IonIcon icon={happyOutline} /></IonButton>
        <IonButton fill="clear" size="small" onClick={shareLocation}><IonIcon icon={locationOutline} /></IonButton>
        <IonTextarea className="chat-input" value={newMessage} onIonInput={e => handleTyping(e.detail.value!)} placeholder="Type a message..." rows={1} autoGrow maxlength={500} />
        {newMessage.trim() ? (
          <IonButton className="send-btn" onClick={() => sendMessage(newMessage)}><IonIcon icon={sendOutline} /></IonButton>
        ) : (
          <IonButton fill="clear" size="small"><IonIcon icon={micOutline} /></IonButton>
        )}
      </div>
    </div>
  );
};

export default ChatBox;