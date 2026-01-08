import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { EntregasList } from './components/EntregasList';
import { CapturaForm } from './components/CapturaForm';
import { HDRCompletadoSummary } from './components/HDRCompletadoSummary';
import SeleccionPerfil from './components/SeleccionPerfil';
import ConsultaCliente from './components/ConsultaCliente';
import ConsultaFletero from './components/ConsultaFletero';
import ConsultaInterna from './components/ConsultaInterna';
import { DashboardTaller } from './components/mantenimiento/DashboardTaller';
import { useEntregasStore } from './stores/entregasStore';
import { useTallerStore } from './stores/tallerStore';
import { googleAuth } from './utils/googleAuth';
import type { Entrega, PerfilConsulta } from './types';

type Screen = 'login' | 'list' | 'capture' | 'consulta-home' | 'consulta-cliente' | 'consulta-fletero' | 'consulta-interna' | 'taller';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);
  const { currentHDR, chofer, entregas, setOnline, logout, setHDR, setEntregas } = useEntregasStore();
  const { isAuthenticated: tallerAuthenticated } = useTallerStore();

  // Check if HDR is completed AND synced (loaded from Google Sheets)
  const todasCompletadas = entregas.length > 0 && entregas.every((e) => e.estado === 'COMPLETADO');
  const algunasCompletadas = entregas.length > 0 && entregas.some((e) => e.estado === 'COMPLETADO' && e.synced === true);
  const hayPendientes = entregas.length > 0 && entregas.some((e) => e.estado === 'PENDIENTE');

  // Debug logging
  console.log('[App] entregas:', entregas.length);
  console.log('[App] todasCompletadas:', todasCompletadas);
  console.log('[App] algunasCompletadas:', algunasCompletadas);
  console.log('[App] hayPendientes:', hayPendientes);
  console.log('[App] entregas estados:', entregas.map(e => ({ id: e.id, estado: e.estado, synced: e.synced })));

  // Show summary ONLY if ALL entregas are completed (no pending ones)
  // If there are pending entregas, show the list so user can continue
  const mostrarResumen = todasCompletadas && !hayPendientes;
  const fechaViaje = entregas.length > 0 ? entregas[0].fechaViaje : undefined;

  console.log('[App] mostrarResumen:', mostrarResumen, '(only when ALL completed and NO pending)');

  // Initialize Google Auth
  useEffect(() => {
    console.log('[App] Initializing Google Auth...');
    googleAuth.init()
      .then(() => {
        console.log('[App] ✅ Google Auth initialized successfully');
      })
      .catch((error) => {
        console.error('[App] ❌ Failed to initialize Google Auth:', error);
        alert('Error al cargar Google Drive. Recarga la página e intenta de nuevo.');
      });
  }, []);

  // NOTE: Always start at login screen, even if HDR data exists
  // The user must authenticate each time they open the app
  // The HDR data remains persisted for continuity

  // Handle hash-based routing (for QR codes)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      console.log('[App] Hash changed:', hash);

      // Map hash to screen
      if (hash === '#/consulta-cliente') {
        setCurrentScreen('consulta-cliente');
      } else if (hash === '#/consulta-fletero') {
        setCurrentScreen('consulta-fletero');
      } else if (hash === '#/consulta-interna') {
        setCurrentScreen('consulta-interna');
      } else if (hash === '#/login' || hash === '') {
        setCurrentScreen('login');
      } else if (hash === '#/consultas') {
        setCurrentScreen('consulta-home');
      }
    };

    // Check hash on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  const handleLoginSuccess = () => {
    // Check if taller login was successful (get fresh state from store)
    const currentTallerAuth = useTallerStore.getState().isAuthenticated;
    if (currentTallerAuth) {
      console.log('[App] Taller authenticated, going to taller screen');
      setCurrentScreen('taller');
    } else {
      console.log('[App] Regular login, going to list screen');
      setCurrentScreen('list');
    }
  };

  const handleSelectEntrega = (entrega: Entrega) => {
    setSelectedEntrega(entrega);
    setCurrentScreen('capture');
  };

  const handleBackToList = () => {
    setSelectedEntrega(null);
    setCurrentScreen('list');
  };

  const handleCaptureComplete = () => {
    // TODO: Update entrega status in store
    setSelectedEntrega(null);
    setCurrentScreen('list');
  };

  const handleLogout = () => {
    logout(); // Clear current session but keep data
    const tallerStore = useTallerStore.getState();
    tallerStore.logout(); // Clear taller session if exists
    setCurrentScreen('login'); // Go back to login
  };

  const handleNuevoHDR = () => {
    // Clear HDR data completely and return to login
    setHDR('', '');
    setEntregas([]);
    setCurrentScreen('login');
  };

  const handleContinuarHDR = () => {
    // Just go back to list view to continue with pending entregas
    setCurrentScreen('list');
  };

  const handleGoToConsultas = () => {
    setCurrentScreen('consulta-home');
  };

  const handleSelectPerfil = (perfil: PerfilConsulta) => {
    if (perfil === 'cliente') {
      setCurrentScreen('consulta-cliente');
    } else if (perfil === 'fletero') {
      setCurrentScreen('consulta-fletero');
    } else if (perfil === 'interno') {
      setCurrentScreen('consulta-interna');
    }
  };

  const handleBackToConsultaHome = () => {
    setCurrentScreen('consulta-home');
  };

  const handleBackToLogin = () => {
    setCurrentScreen('login');
  };

  return (
    <>
      {currentScreen === 'login' && (
        <Login onSuccess={handleLoginSuccess} onGoToConsultas={handleGoToConsultas} />
      )}

      {currentScreen === 'list' && (
        <>
          {mostrarResumen ? (
            <HDRCompletadoSummary
              hdr={currentHDR || ''}
              chofer={chofer || ''}
              fechaViaje={fechaViaje}
              entregas={entregas}
              onNuevoHDR={handleNuevoHDR}
              onContinuarHDR={handleContinuarHDR}
              hayPendientes={hayPendientes}
            />
          ) : (
            <EntregasList onSelectEntrega={handleSelectEntrega} onLogout={handleLogout} />
          )}
        </>
      )}

      {currentScreen === 'capture' && selectedEntrega && (
        <CapturaForm
          entrega={selectedEntrega}
          onBack={handleBackToList}
          onComplete={handleCaptureComplete}
        />
      )}

      {currentScreen === 'consulta-home' && (
        <SeleccionPerfil onSelectPerfil={handleSelectPerfil} onBack={handleBackToLogin} />
      )}

      {currentScreen === 'consulta-cliente' && (
        <ConsultaCliente onBack={handleBackToConsultaHome} />
      )}

      {currentScreen === 'consulta-fletero' && (
        <ConsultaFletero onBack={handleBackToConsultaHome} />
      )}

      {currentScreen === 'consulta-interna' && (
        <ConsultaInterna onBack={handleBackToConsultaHome} />
      )}

      {currentScreen === 'taller' && (
        <DashboardTaller onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
