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
    const code = params.get('code');
    const name = params.get('name');
    const email = params.get('email');
    const socialId = params.get('socialId');
    const provider = params.get('provider');
    const role = params.get('role');

    const goByRole = (r?: string) => {
      const finalRole = r || 'customer';
      if (finalRole === 'admin') return '/admin/dashboard';
      if (finalRole === 'driver' || finalRole === 'motorist') return '/driver/home';
      return '/customer/home';
    };

    if (status === 'existing' && code) {
      // SECURITY (H9): the redirect carries a one-time 60-second code, never
      // the JWT itself. Exchange it server-side for the real session.
      api.post('/auth/exchange-code', { code })
        .then(res => {
          const { user, token } = res.data || {};
          if (!user || !token) throw new Error('bad response');
          saveSession(user, token);
          history.replace(goByRole(user.role));
        })
        .catch((e) => {
          setError(e?.response?.data?.message || 'Sign-in expired. Please try again.');
          setTimeout(() => history.replace('/login'), 2000);
        });
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
