import React, { useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { IonPage, IonContent, IonSpinner } from '@ionic/react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const AuthCallback: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { saveSession } = useAuth() as any;
  const [error, setError] = useState('');
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    const token = params.get('token');
    const name = params.get('name');
    const email = params.get('email');
    const socialId = params.get('socialId');
    const provider = params.get('provider');
    const role = params.get('role');
    const userId = params.get('userId');

    const goByRole = (r?: string) => {
      const finalRole = r || 'customer';
      if (finalRole === 'admin') return '/admin/dashboard';
      if (finalRole === 'driver' || finalRole === 'motorist') return '/driver/home';
      return '/customer/home';
    };

    if (status === 'existing' && token) {
      // Decode JWT to get user info, then fetch the authoritative profile from backend
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const interimUser = {
          id: userId || payload.userId || payload.sub || '',
          fullName: name || payload.name || 'User',
          email: email || payload.email || '',
          role: role || payload.role || 'customer',
          isSocial: true,
          isVerified: true,
          phone: payload.phone || '',
        };
        saveSession(interimUser, token);

        // Refresh full profile in the background so permissions/avatar etc. are up to date
        api.get('/auth/me').then(res => {
          if (res.data?.user) saveSession(res.data.user, token);
        }).catch(() => {/* session still valid */});

        setTimeout(() => history.replace(goByRole(interimUser.role)), 300);
      } catch (e) {
        // Fallback: set token then fetch /auth/me before routing
        localStorage.setItem('navigo_token', token);
        api.get('/auth/me')
          .then(res => {
            const u = res.data?.user || res.data;
            if (u) saveSession(u, token);
            history.replace(goByRole(u?.role));
          })
          .catch(() => {
            setError('Could not load your profile.');
            setTimeout(() => history.replace('/login'), 1800);
          });
      }
    } else if (status === 'new' && name && socialId && provider) {
      // New user: preserve the social payload (with hinted role if any) and send to finalize
      localStorage.setItem('temp_social_user', JSON.stringify({
        name, email, socialId, provider, role: role || 'customer'
      }));
      history.replace('/auth/complete-social-reg');
    } else {
      setError('Invalid login response');
      setTimeout(() => history.replace('/login'), 2000);
    }
  }, [history, location.search, saveSession]);

  return (
    <IonPage>
      <IonContent style={{ '--background': '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' } as any}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          {error ? (
            <>
              <p style={{ color: '#ff5252' }}>{error}</p>
              <p style={{ color: '#888', fontSize: 12 }}>Redirecting to login...</p>
            </>
          ) : (
            <>
              <IonSpinner name="crescent" color="warning" />
              <p style={{ marginTop: 16 }}>Signing you in with Google...</p>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AuthCallback;
