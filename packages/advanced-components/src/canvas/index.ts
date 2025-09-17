// Canvas & WebGL Components Export
export * from './components';
export * from './hooks';
export * from './utils';

// Canvas Components
export { Canvas2D } from './components/Canvas2D';
export { WebGLCanvas } from './components/WebGLCanvas';
export { ThreeCanvas } from './components/ThreeCanvas';
export { OffscreenCanvas } from './components/OffscreenCanvas';

// Rendering Components
export { Scene } from './components/Scene';
export { Renderer } from './components/Renderer';
export { Camera } from './components/Camera';
export { Mesh } from './components/Mesh';
export { Material } from './components/Material';
export { Geometry } from './components/Geometry';
export { Texture } from './components/Texture';
export { Light } from './components/Light';

// Post-processing
export { PostProcessor } from './components/PostProcessor';
export { Shader } from './components/Shader';
export { RenderTarget } from './components/RenderTarget';

// Utility Components
export { Stats } from './components/Stats';
export { Controls } from './components/Controls';
export { Helper } from './components/Helper';

// Hooks
export { useCanvas } from './hooks/useCanvas';
export { useWebGL } from './hooks/useWebGL';
export { useThree } from './hooks/useThree';
export { useRenderLoop } from './hooks/useRenderLoop';
export { useShader } from './hooks/useShader';
export { useTexture } from './hooks/useTexture';
export { useCamera } from './hooks/useCamera';
export { useControls } from './hooks/useControls';

// Utils
export * from './utils/webgl-utils';
export * from './utils/three-utils';
export * from './utils/canvas-utils';
export * from './utils/shader-utils';

// Version
export const CANVAS_VERSION = '0.1.0';