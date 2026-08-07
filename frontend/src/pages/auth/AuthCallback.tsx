import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { IonPage, IonContent, IonSpinner } from '@ionic/react';
import { useAuth } from '../../context/AuthContext';

const AuthCallback: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { socialLogin } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    const token = params.get('token');
    const name = params.get('name');
    const email = params.get('email');
    const socialId = params.get('socialId');
    const provider = params.get('provider');

    if (status === 'existing' && token) {
      // User already exists, just save token and go to home
      localStorage.setItem('navigo_token', token);
      // Note: In a real app, we'd fetch the user profile here via /auth/me
      history.push('/rider/home');
    } else if (status === 'new' && name && socialId && provider) {
      // New user, redirect to complete registration page
      localStorage.setItem('temp_social_user', JSON.stringify({ name, email, socialId, provider }));
      history.push('/auth/complete-social-reg');
    } else {
      setError('Invalid login response');
      setTimeout(() => history.push('/login'), 2000);
    }
  }, []);

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