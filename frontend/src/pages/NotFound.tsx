import React from 'react';
import { IonPage, IonContent, IonButton, IonIcon } from '@ionic/react';
import { homeOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';

const NotFound: React.FC = () => {
  const history = useHistory();
  return (
    <IonPage>
      <IonContent style={{ '--background': '#080c14' } as any}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', gap: 14, textAlign: 'center', padding: 24
        }}>
          <div style={{ fontSize: 56 }}>🧭</div>
          <h1 style={{ color: '#fff', margin: 0 }}>404</h1>
          <p style={{ color: '#94A3B8', maxWidth: 320, margin: 0 }}>
            We couldn't find that page. It may have moved, or the link might be broken.
          </p>
          <IonButton color="warning" style={{ borderRadius: 12, marginTop: 8 }} onClick={() => history.push('/')}>
            <IonIcon icon={homeOutline} slot="start" /> Back to NAVIGO
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default NotFound;
