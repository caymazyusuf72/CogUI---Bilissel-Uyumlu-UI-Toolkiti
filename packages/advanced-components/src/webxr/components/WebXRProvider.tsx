import React, { createContext, useContext, useState, useEffect } from 'react';
import { WebXRConfig, XRSession } from '../../types';

interface WebXRContextType {
  session: XRSession | null;
  isSupported: boolean;
  startSession: (mode: 'vr' | 'ar') => Promise<void>;
  endSession: () => Promise<void>;
  error: string | null;
}

const WebXRContext = createContext<WebXRContextType | null>(null);

export interface WebXRProviderProps {
  children: React.ReactNode;
  config?: WebXRConfig;
}

/**
 * WebXRProvider - WebXR context sağlayıcısı
 * AR/VR session yönetimi
 */
export const WebXRProvider: React.FC<WebXRProviderProps> = ({
  children,
  config = { mode: 'vr' }
}) => {
  const [session, setSession] = useState<XRSession | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkWebXRSupport();
  }, []);

  const checkWebXRSupport = async () => {
    if (!navigator.xr) {
      setError('WebXR not supported');
      return;
    }

    try {
      const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
      const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
      setIsSupported(vrSupported || arSupported);
    } catch (err) {
      setError('Failed to check WebXR support');
    }
  };

  const startSession = async (mode: 'vr' | 'ar') => {
    if (!navigator.xr) {
      setError('WebXR not available');
      return;
    }

    try {
      const sessionMode = mode === 'vr' ? 'immersive-vr' : 'immersive-ar';
      const xrSession = await navigator.xr.requestSession(sessionMode, {
        requiredFeatures: config.requiredFeatures,
        optionalFeatures: config.optionalFeatures
      });

      const session: XRSession = {
        mode,
        isActive: true,
        supportedFeatures: config.requiredFeatures || [],
        frameRate: 60,
        referenceSpace: 'local-floor'
      };

      setSession(session);
      setError(null);

      xrSession.addEventListener('end', () => {
        setSession(null);
      });

    } catch (err) {
      setError(`Failed to start ${mode.toUpperCase()} session: ${err}`);
    }
  };

  const endSession = async () => {
    setSession(null);
  };

  const value: WebXRContextType = {
    session,
    isSupported,
    startSession,
    endSession,
    error
  };

  return (
    <WebXRContext.Provider value={value}>
      {children}
    </WebXRContext.Provider>
  );
};

export const useWebXR = () => {
  const context = useContext(WebXRContext);
  if (!context) {
    throw new Error('useWebXR must be used within WebXRProvider');
  }
  return context;
};

export default WebXRProvider;