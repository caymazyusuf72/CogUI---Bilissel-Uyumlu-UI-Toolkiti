// WebXR (AR/VR) Components Export
export * from './components';
export * from './hooks';
export * from './utils';

// Main Components
export { WebXRProvider } from './components/WebXRProvider';
export { VRScene } from './components/VRScene';
export { ARScene } from './components/ARScene';
export { XRController } from './components/XRController';
export { XRHand } from './components/XRHand';
export { ARMarker } from './components/ARMarker';
export { XRCamera } from './components/XRCamera';
export { XRRenderer } from './components/XRRenderer';

// Utility Components
export { XRCanvas } from './components/XRCanvas';
export { XRStats } from './components/XRStats';
export { XRControls } from './components/XRControls';
export { XRSessionUI } from './components/XRSessionUI';

// Hooks
export { useWebXR } from './hooks/useWebXR';
export { useXRSession } from './hooks/useXRSession';
export { useXRFrame } from './hooks/useXRFrame';
export { useXRControllers } from './hooks/useXRControllers';
export { useXRHands } from './hooks/useXRHands';
export { useARMarkers } from './hooks/useARMarkers';
export { useXRCamera } from './hooks/useXRCamera';

// Utils
export * from './utils/xr-utils';
export * from './utils/three-utils';
export * from './utils/ar-utils';
export * from './utils/vr-utils';

// Version
export const WEBXR_VERSION = '0.1.0';