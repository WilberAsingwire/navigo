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
    const name = params.get('name');
    const email = params.get('email');
    const socialId = params.get('socialId');
    const provider = params.get('provider');

    if (name && socialId && provider) {
      socialLogin(provider, socialId, name, email || undefined)
        .then(() => history.push('/rider/home'))
        .catch(() => setError('Login failed. Please try again.'));
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