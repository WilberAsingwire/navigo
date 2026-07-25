import React, { useState, useEffect, useRef } from 'react';
import {
  IonIcon, IonButton, IonTextarea, IonAvatar, IonBadge,
  IonSpinner
} from '@ionic/react';
import {
  sendOutline, closeOutline, checkmarkDoneOutline,
  timeOutline, personOutline, carOutline
} from 'ionicons/icons';
import { io, Socket } from 'socket.io-client';
import './ChatBox.css';

const SOCKET_URL = 'https://navigo-fzdoonrender.com';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole: 'rider' | 'driver';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
}

interface ChatBoxProps {
  rideId: string;
  currentUser: {
    id: string;
    name: string;
    role: string;
    photo?: string;
  };
  otherUser: {
    id: string;
    name: string;
    role: string;
    photo?: string;
  };
  onClose: () => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({ rideId, currentUser, otherUser, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      query: { userId: currentUser.id, role: currentUser.role }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join-chat', { rideId });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('new-message', (message: Message) => {
      setMessages(prev => [...prev, { ...message, status: 'delivered' }]);
      newSocket.emit('message-read', { messageId: message.id, rideId });
    });

    newSocket.on('message-read-confirmed', (messageId: string) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'read' } : msg
      ));
    });

    newSocket.on('user-typing', (data: { userId: string; isTyping: boolean }) => {
      if (data.userId === otherUser.id) {
        setIsTyping(data.isTyping);
      }
    });

    newSocket.emit('load-messages', { rideId }, (loadedMessages: Message[]) => {
      setMessages(loadedMessages || []);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [rideId, currentUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim() || !socket) return;

    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      text: newMessage.trim(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role as 'rider' | 'driver',
      timestamp: new Date(),
      status: 'sent'
    };

    socket.emit('send-message', { rideId, message });
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    socket.emit('typing', { rideId, userId: currentUser.id, isTyping: false });
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    
    if (socket) {
      socket.emit('typing', { 
        rideId, 
        userId: currentUser.id, 
        isTyping: value.length > 0 
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { 
          rideId, 
          userId: currentUser.id, 
          isTyping: false 
        });
      }, 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <IonIcon icon={timeOutline} className="msg-status-icon" />;
      case 'delivered': return <IonIcon icon={checkmarkDoneOutline} className="msg-status-icon delivered" />;
      case 'read': return <IonIcon icon={checkmarkDoneOutline} className="msg-status-icon read" />;
      default: return null;
    }
  };

  const quickReplies = [
    'I\'m here',
    'On my way',
    'Almost there',
    'Thank you!',
    'Okay',
    'Wait a moment'
  ];

  return (
    <div className="chat-box">
      <div className="chat-header">
        <div className="chat-user-info">
          <IonAvatar className="chat-avatar">
            <img 
              src={otherUser.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=FF6B35&color=fff&size=64`} 
              alt={otherUser.name} 
            />
          </IonAvatar>
          <div className="chat-user-details">
            <h4>{otherUser.name}</h4>
            <p>
              <IonIcon icon={otherUser.role === 'driver' ? carOutline : personOutline} />
              {otherUser.role === 'driver' ? 'Driver' : 'Rider'}
            </p>
          </div>
        </div>
        <div className="chat-header-actions">
          {isConnected ? (
            <IonBadge color="success" className="online-badge">● Online</IonBadge>
          ) : (
            <IonBadge color="medium" className="online-badge">Connecting...</IonBadge>
          )}
          <IonButton fill="clear" size="small" onClick={onClose}>
            <IonIcon icon={closeOutline} />
          </IonButton>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>👋 Start chatting with {otherUser.name}</p>
            <p className="chat-empty-sub">Messages are secure and visible only to you</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.senderId === currentUser.id;
          return (
            <div key={msg.id} className={`message-wrapper ${isMine ? 'mine' : 'theirs'}`}>
              {!isMine && (
                <IonAvatar className="msg-avatar">
                  <img 
                    src={otherUser.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=FF6B35&color=fff&size=32`} 
                    alt={otherUser.name} 
                  />
                </IonAvatar>
              )}
              <div className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
                <p className="message-text">{msg.text}</p>
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
            <IonAvatar className="msg-avatar">
              <img 
                src={otherUser.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=FF6B35&color=fff&size=32`} 
                alt={otherUser.name} 
              />
            </IonAvatar>
            <div className="typing-bubble">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="quick-replies">
        {quickReplies.map((reply, index) => (
          <button 
            key={index} 
            className="quick-reply-btn"
            onClick={() => {
              setNewMessage(reply);
              setTimeout(() => handleSend(), 100);
            }}
          >
            {reply}
          </button>
        ))}
      </div>

      <div className="chat-input-area">
        <IonTextarea
          className="chat-input"
          value={newMessage}
          onIonInput={e => handleTyping(e.detail.value!)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          autoGrow
          maxlength={500}
        />
        <IonButton 
          className="send-btn" 
          onClick={handleSend} 
          disabled={!newMessage.trim()}
          size="small"
        >
          <IonIcon icon={sendOutline} />
        </IonButton>
      </div>
    </div>
  );
};

export default ChatBox;