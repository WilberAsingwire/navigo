import React, { useState, useEffect } from 'react';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonBackButton, IonList, IonItem, IonLabel, IonIcon, IonButton,
  IonInput, IonModal, IonSearchbar, IonSpinner, IonToast, IonBadge
} from '@ionic/react';
import {
  homeOutline, briefcaseOutline, addCircleOutline,
  locationOutline, trashOutline, checkmarkCircleOutline, closeOutline
} from 'ionicons/icons';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { API_URL } from '../../config';
import EmptyState from '../../components/EmptyState';
import './CustomerSavedPlaces.css';

const CustomerSavedPlaces: React.FC = () => {
  const { user } = useAuth();
  const [places, setPlaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [placeLabel, setPlaceLabel] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastColor, setToastColor] = useState<'success' | 'danger'>('success');

  useEffect(() => {
    fetchPlaces();
  }, [user?.id]);

  const fetchPlaces = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('navigo_token');
      const res = await axios.get(`${API_URL}/users/saved-places/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlaces(res.data);
    } catch (err) {
      console.error('Error fetching saved places:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`https://photon.geocode.eu/api/?q=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      setSearchResults(data.features || []);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const selectPlace = (feature: any) => {
    const props = feature.properties;
    setSelectedPlace({
      address: props.name || props.street || props.city || 'Unknown Address',
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0]
    });
    setSearchResults([]);
  };

  const saveNewPlace = async () => {
    if (!selectedPlace || !placeLabel) {
      setToastColor('danger'); setToastMsg('Please provide a label and select a place');
      setShowToast(true);
      return;
    }

    try {
      const token = localStorage.getItem('navigo_token');
      await axios.post(`${API_URL}/users/saved-places`, {
        label: placeLabel,
        address: selectedPlace.address,
        lat: selectedPlace.lat,
        lng: selectedPlace.lng
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setToastColor('success'); setToastMsg('Place saved');
      setShowToast(true);
      setShowAddModal(false);
      setPlaceLabel('');
      setSelectedPlace(null);
      fetchPlaces();
    } catch (err: any) {
      setToastColor('danger'); setToastMsg(err.response?.data?.message || 'Failed to save place');
      setShowToast(true);
    }
  };

  const deletePlace = async (placeId: string) => {
    try {
      const token = localStorage.getItem('navigo_token');
      await axios.delete(`${API_URL}/users/saved-places/${placeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlaces(places.filter(p => p.id !== placeId));
      setToastColor('success'); setToastMsg('Place removed');
      setShowToast(true);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const getIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('home')) return homeOutline;
    if (l.includes('work') || l.includes('office')) return briefcaseOutline;
    return locationOutline;
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/customer/home" /></IonButtons>
          <IonTitle>Saved Places</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{'--background': 'var(--nav-bg)', '--color': '#fff8f0'} as any} className="ion-padding places-wrapper">

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <IonSpinner name="crescent" color="warning" />
          </div>
        ) : places.length === 0 ? (
          <EmptyState
            icon={<IonIcon icon={locationOutline} style={{ fontSize: 26 }} />}
            title="No saved places yet"
            subtitle="Save Home or Work to book faster next time."
          />
        ) : (
          <IonList style={{background: 'transparent'}}>
            {places.map(place => (
              <div key={place.id} style={{background: 'var(--nav-card-soft)', borderRadius: 12, padding: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10}}>
                <IonIcon icon={getIcon(place.label)} style={{fontSize: 24, color: 'var(--navigo-orange)'}} />
                <div style={{flex: 1}}>
                  <h3 style={{color: 'var(--nav-text)', margin: 0}}>{place.label}</h3>
                  <p style={{color: 'rgba(255,248,240,0.5)', margin: '4px 0', fontSize: 12}}>{place.address}</p>
                </div>
                <IonButton fill="clear" color="danger" onClick={() => deletePlace(place.id)}>
                  <IonIcon icon={trashOutline} slot="icon-only" />
                </IonButton>
              </div>
            ))}
          </IonList>
        )}

        <IonButton expand="block" fill="outline" style={{'--color': 'var(--navigo-orange)', marginTop: 16} as any} onClick={() => setShowAddModal(true)}>
          <IonIcon icon={addCircleOutline} slot="start" /> Add New Place
        </IonButton>

        <IonModal isOpen={showAddModal} onDidDismiss={() => setShowAddModal(false)}>
          <div style={{ padding: 20, background: 'var(--nav-bg-soft)', color: 'var(--nav-text)', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Save New Place</h2>
              <IonButton fill="clear" onClick={() => setShowAddModal(false)}><IonIcon icon={closeOutline} style={{ color: 'var(--nav-text)', fontSize: 22 }} /></IonButton>
            </div>

            <div style={{ marginBottom: 20 }}>
              <IonLabel position="stacked" style={{ color: 'var(--nav-text)', marginBottom: 8 }}>Place Label (e.g. Home, Work, Gym)</IonLabel>
              <IonInput
                value={placeLabel}
                onIonInput={e => setPlaceLabel(e.detail.value!)}
                placeholder="Enter a name for this place"
                style={{ color: 'var(--nav-text)', background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <IonLabel position="stacked" style={{ color: 'var(--nav-text)', marginBottom: 8 }}>Search Location</IonLabel>
              <IonSearchbar
                value={searchQuery}
                onIonInput={e => handleSearch(e.detail.value!)}
                placeholder="Search for a place..."
                style={{ '--background': 'rgba(255,255,255,0.1)', '--color': '#fff' } as any}
              />

              {searchResults.length > 0 && (
                <div style={{ background: 'var(--nav-card-soft)', borderRadius: 8, marginTop: 8, maxHeight: '200px', overflowY: 'auto' }}>
                  {searchResults.map((res, i) => (
                    <div
                      key={i}
                      onClick={() => selectPlace(res)}
                      style={{ padding: '12px', borderBottom: '1px solid var(--nav-border-strong)', cursor: 'pointer', fontSize: 12, color: 'var(--nav-text)' }}
                    >
                      {res.properties.name || res.properties.street || 'Unnamed Place'}
                      <p style={{ fontSize: 10, color: 'var(--nav-text-dim)', margin: 0 }}>{res.properties.city || ''}, {res.properties.country || ''}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedPlace && (
                <div style={{ background: 'rgba(0, 230, 118, 0.1)', border: '1px solid #00e676', borderRadius: 8, padding: '12px', marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <IonIcon icon={checkmarkCircleOutline} style={{ color: '#00e676' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--nav-text)' }}>{selectedPlace.address}</p>
                    <p style={{ margin: 0, fontSize: 10, color: 'var(--nav-text-dim)' }}>Selected</p>
                  </div>
                </div>
              )}
            </div>

            <IonButton expand="block" onClick={saveNewPlace} style={{ '--background': 'var(--navigo-orange)', '--border-radius': '12px', fontWeight: 700, marginTop: 20 } as any}>
              Save Place
            </IonButton>
          </div>
        </IonModal>

        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMsg} duration={2000} position="top" color={toastColor} />
      </IonContent>
    </IonPage>
  );
};

export default CustomerSavedPlaces;
