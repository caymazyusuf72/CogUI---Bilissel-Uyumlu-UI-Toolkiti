import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CanvasConfig, RenderContext2D, RenderContextWebGL, CanvasEvent } from '../../types';

export interface CanvasProps {
  width: number;
  height: number;
  config?: CanvasConfig;
  onRender?: (context: RenderContext2D | RenderContextWebGL, timestamp: number) => void;
  onResize?: (width: number, height: number) => void;
  onCanvasEvent?: (event: CanvasEvent) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Canvas - Gelişmiş 2D/WebGL rendering bileşeni
 * Performance monitoring, shader desteği ve interaktif özellikler
 */
export const Canvas: React.FC<CanvasProps> = ({
  width,
  height,
  config = { contextType: '2d' },
  onRender,
  onResize,
  onCanvasEvent,
  className = '',
  style = {}
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [context, setContext] = useState<RenderContext2D | RenderContextWebGL | null>(null);
  const [fps, setFps] = useState(0);
  const [isRendering, setIsRendering] = useState(false);

  // Context oluşturma
  const initializeContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      let ctx: CanvasRenderingContext2D | WebGLRenderingContext | null = null;

      if (config.contextType === 'webgl') {
        ctx = canvas.getContext('webgl', config.webglOptions);
        if (!ctx) {
          ctx = canvas.getContext('experimental-webgl', config.webglOptions);
        }
      } else {
        ctx = canvas.getContext('2d', config.canvas2dOptions);
      }

      if (!ctx) {
        throw new Error(`Failed to get ${config.contextType} context`);
      }

      const renderContext: RenderContext2D | RenderContextWebGL = {
        canvas,
        context: ctx,
        width,
        height,
        devicePixelRatio: window.devicePixelRatio || 1
      };

      setContext(renderContext);

      if (onCanvasEvent) {
        onCanvasEvent({
          type: 'contextInitialized',
          timestamp: performance.now(),
          data: { contextType: config.contextType }
        });
      }

    } catch (error) {
      console.error('Canvas initialization error:', error);
      if (onCanvasEvent) {
        onCanvasEvent({
          type: 'error',
          timestamp: performance.now(),
          data: { error: error instanceof Error ? error.message : String(error) }
        });
      }
    }
  }, [config, width, height, onCanvasEvent]);

  // FPS hesaplama
  const calculateFps = useCallback(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const updateFps = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }
    };

    return updateFps;
  }, []);

  // Render loop
  const startRenderLoop = useCallback(() => {
    if (!context || !onRender) return;

    const fpsUpdater = calculateFps();
    setIsRendering(true);

    const render = (timestamp: number) => {
      try {
        // Canvas temizleme
        if (config.contextType === '2d') {
          const ctx = context.context as CanvasRenderingContext2D;
          ctx.clearRect(0, 0, width, height);
        } else if (config.contextType === 'webgl') {
          const gl = context.context as WebGLRenderingContext;
          gl.viewport(0, 0, width, height);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        }

        // Kullanıcı render fonksiyonu çağır
        onRender(context, timestamp);

        // FPS güncelle
        fpsUpdater();

        // Performans izleme
        if (config.enablePerformanceMonitoring && onCanvasEvent) {
          onCanvasEvent({
            type: 'frameRendered',
            timestamp,
            data: { fps }
          });
        }

        animationRef.current = requestAnimationFrame(render);
      } catch (error) {
        console.error('Render error:', error);
        setIsRendering(false);
        if (onCanvasEvent) {
          onCanvasEvent({
            type: 'error',
            timestamp,
            data: { error: error instanceof Error ? error.message : String(error) }
          });
        }
      }
    };

    animationRef.current = requestAnimationFrame(render);
  }, [context, onRender, config, width, height, fps, onCanvasEvent, calculateFps]);

  // Canvas boyut ayarlama
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const devicePixelRatio = window.devicePixelRatio || 1;

    // Canvas boyutunu ayarla
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Context scale ayarla
    if (context && config.contextType === '2d') {
      const ctx = context.context as CanvasRenderingContext2D;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }

    if (onResize) {
      onResize(width, height);
    }
  }, [width, height, context, config.contextType, onResize]);

  // Mouse event handlers
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!onCanvasEvent) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    onCanvasEvent({
      type: 'mouseMove',
      timestamp: performance.now(),
      data: { x, y, buttons: event.buttons }
    });
  }, [onCanvasEvent]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (!onCanvasEvent) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    onCanvasEvent({
      type: 'click',
      timestamp: performance.now(),
      data: { x, y, button: event.button }
    });
  }, [onCanvasEvent]);

  // Component lifecycle
  useEffect(() => {
    initializeContext();
  }, [initializeContext]);

  useEffect(() => {
    resizeCanvas();
  }, [resizeCanvas]);

  useEffect(() => {
    if (config.autoRender && onRender) {
      startRenderLoop();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsRendering(false);
    };
  }, [config.autoRender, startRenderLoop, onRender]);

  return (
    <div className={`cogui-canvas-container ${className}`} style={style}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        style={{
          display: 'block',
          imageRendering: config.pixelated ? 'pixelated' : 'auto'
        }}
      />
      
      {config.showStats && (
        <div className="canvas-stats">
          <div>FPS: {fps}</div>
          <div>Size: {width}×{height}</div>
          <div>Context: {config.contextType}</div>
          <div>Rendering: {isRendering ? 'Yes' : 'No'}</div>
        </div>
      )}

      <style jsx>{`
        .cogui-canvas-container {
          position: relative;
          display: inline-block;
        }

        .canvas-stats {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          line-height: 1.4;
          pointer-events: none;
          z-index: 1000;
        }

        .canvas-stats div {
          margin-bottom: 2px;
        }

        .canvas-stats div:last-child {
          margin-bottom: 0;
        }

        canvas {
          border: 1px solid #ddd;
          cursor: ${config.interactionEnabled ? 'crosshair' : 'default'};
        }
      `}</style>
    </div>
  );
};

export default Canvas;