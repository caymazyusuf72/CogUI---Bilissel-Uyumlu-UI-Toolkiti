import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { Plugin, PluginManifest, PluginStatus, PluginContext, PluginInstance, PluginError } from '../types';

/**
 * Plugin Loader - Plugin yükleme ve örnek oluşturma sistemi
 * Plugin dosyalarının yüklenmesi ve çalıştırılabilir örneklerin oluşturulması
 */
export class PluginLoader {
  private loadedPlugins = new Map<string, Plugin>();
  private pluginInstances = new Map<string, PluginInstance>();
  private loadingQueue = new Set<string>();
  
  // Event subjects
  private loadStartSubject = new Subject<string>();
  private loadCompleteSubject = new Subject<{ pluginId: string; plugin: Plugin }>();
  private loadErrorSubject = new Subject<{ pluginId: string; error: Error }>();
  private instanceCreatedSubject = new Subject<{ pluginId: string; instance: PluginInstance }>();

  // Observable streams
  public readonly onLoadStart = this.loadStartSubject.asObservable();
  public readonly onLoadComplete = this.loadCompleteSubject.asObservable();
  public readonly onLoadError = this.loadErrorSubject.asObservable();
  public readonly onInstanceCreated = this.instanceCreatedSubject.asObservable();

  /**
   * Plugin yükle
   */
  async loadPlugin(manifest: PluginManifest, source: string): Promise<Plugin> {
    const pluginId = `${manifest.name}@${manifest.version}`;
    
    try {
      // Zaten yüklenmiş kontrolü
      if (this.loadedPlugins.has(pluginId)) {
        return this.loadedPlugins.get(pluginId)!;
      }

      // Yükleme sırası kontrolü
      if (this.loadingQueue.has(pluginId)) {
        throw new Error(`Plugin zaten yükleniyor: ${pluginId}`);
      }

      this.loadingQueue.add(pluginId);
      this.loadStartSubject.next(pluginId);

      // Plugin dosyasını yükle
      const pluginModule = await this.loadPluginModule(source, manifest.main);
      
      // Plugin nesnesini oluştur
      const plugin: Plugin = {
        id: pluginId,
        name: manifest.name,
        version: manifest.version,
        author: manifest.author,
        description: manifest.description,
        manifest,
        config: {
          enabled: true,
          autoStart: true,
          priority: 0,
          settings: {},
          permissions: manifest.permissions?.map(p => p.id) || [],
          sandbox: {
            enabled: true,
            restrictions: ['no-eval', 'no-function-constructor'],
            allowedDomains: [],
            maxExecutionTime: 5000,
            memoryLimit: 50 * 1024 * 1024 // 50MB
          },
          performance: {
            maxMemoryUsage: 100 * 1024 * 1024, // 100MB
            maxRenderTime: 1000,
            maxNetworkRequests: 10,
            timeout: 10000,
            retries: 3
          }
        },
        metadata: {
          installDate: new Date(),
          lastUpdate: new Date(),
          version: manifest.version,
          size: manifest.size || 0,
          downloads: 0,
          rating: 0,
          reviews: 0,
          verified: false,
          trusted: false,
          official: false
        },
        runtime: {
          status: PluginStatus.Loaded,
          instances: [],
          performance: {
            loadTime: 0,
            renderTime: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            networkRequests: 0,
            errorCount: 0,
            warningCount: 0
          },
          errors: [],
          logs: []
        },
        api: this.createPluginAPI(pluginId),
        lifecycle: pluginModule.default || pluginModule
      };

      // Yüklenmiş plugin kaydet
      this.loadedPlugins.set(pluginId, plugin);
      this.loadingQueue.delete(pluginId);
      
      this.loadCompleteSubject.next({ pluginId, plugin });
      
      console.log(`Plugin yüklendi: ${pluginId}`);
      return plugin;

    } catch (error) {
      this.loadingQueue.delete(pluginId);
      this.loadErrorSubject.next({ pluginId, error: error as Error });
      console.error(`Plugin yükleme hatası (${pluginId}):`, error);
      throw error;
    }
  }

  /**
   * Plugin modülünü yükle
   */
  private async loadPluginModule(source: string, mainFile: string): Promise<any> {
    try {
      // URL'den yükleme
      if (source.startsWith('http')) {
        const response = await fetch(`${source}/${mainFile}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const code = await response.text();
        return this.executePluginCode(code);
      }
      
      // Yerel dosyadan yükleme
      if (source.startsWith('file://')) {
        const path = source.replace('file://', '');
        // Tarayıcıda file:// protokolü güvenlik nedeniyle kısıtlı
        throw new Error('Yerel dosya yükleme tarayıcıda desteklenmiyor');
      }
      
      // NPM paketi olarak yükleme
      if (source.startsWith('npm:')) {
        const packageName = source.replace('npm:', '');
        const module = await import(packageName);
        return module;
      }

      throw new Error(`Desteklenmeyen kaynak türü: ${source}`);

    } catch (error) {
      console.error('Plugin modül yükleme hatası:', error);
      throw error;
    }
  }

  /**
   * Plugin kodunu güvenli şekilde çalıştır
   */
  private executePluginCode(code: string): any {
    try {
      // Basit sandbox - production'da daha güçlü olmalı
      const sandbox = {
        console: console,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval
      };

      // Function constructor kullanarak kodu çalıştır
      const wrappedCode = `
        (function(exports, require, module, __filename, __dirname, console, setTimeout, clearTimeout, setInterval, clearInterval) {
          ${code}
        })
      `;

      const func = new Function('return ' + wrappedCode)();
      const module = { exports: {} };
      
      func(
        module.exports,
        () => {}, // require stub
        module,
        'plugin.js',
        '/plugins',
        sandbox.console,
        sandbox.setTimeout,
        sandbox.clearTimeout,
        sandbox.setInterval,
        sandbox.clearInterval
      );

      return module.exports;

    } catch (error) {
      console.error('Plugin kod çalıştırma hatası:', error);
      throw error;
    }
  }

  /**
   * Plugin API oluştur
   */
  private createPluginAPI(pluginId: string): any {
    return {
      cogui: {
        version: '1.0.0',
        components: new Map(),
        themes: new Map(),
        hooks: new Map(),
        utils: new Map()
      },
      react: {
        // React API'leri burada sağlanır
      },
      utils: {
        uuid: () => crypto.randomUUID(),
        debounce: (fn: Function, delay: number) => {
          let timeoutId: NodeJS.Timeout;
          return (...args: any[]) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(null, args), delay);
          };
        },
        throttle: (fn: Function, delay: number) => {
          let lastCall = 0;
          return (...args: any[]) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
              lastCall = now;
              return fn.apply(null, args);
            }
          };
        },
        deepClone: (obj: any) => JSON.parse(JSON.stringify(obj)),
        merge: (target: any, ...sources: any[]) => Object.assign(target, ...sources),
        pick: (obj: any, keys: string[]) => {
          const result: any = {};
          keys.forEach(key => {
            if (obj.hasOwnProperty(key)) {
              result[key] = obj[key];
            }
          });
          return result;
        },
        omit: (obj: any, keys: string[]) => {
          const result = { ...obj };
          keys.forEach(key => delete result[key]);
          return result;
        }
      },
      storage: this.createStorageAPI(pluginId),
      network: this.createNetworkAPI(pluginId),
      ui: this.createUIAPI(pluginId),
      sensors: {},
      ml: {}
    };
  }

  /**
   * Storage API oluştur
   */
  private createStorageAPI(pluginId: string): any {
    const prefix = `plugin_${pluginId}_`;
    
    return {
      localStorage: {
        getItem: (key: string) => localStorage.getItem(prefix + key),
        setItem: (key: string, value: string) => localStorage.setItem(prefix + key, value),
        removeItem: (key: string) => localStorage.removeItem(prefix + key),
        clear: () => {
          const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix));
          keys.forEach(key => localStorage.removeItem(key));
        }
      },
      sessionStorage: {
        getItem: (key: string) => sessionStorage.getItem(prefix + key),
        setItem: (key: string, value: string) => sessionStorage.setItem(prefix + key, value),
        removeItem: (key: string) => sessionStorage.removeItem(prefix + key),
        clear: () => {
          const keys = Object.keys(sessionStorage).filter(key => key.startsWith(prefix));
          keys.forEach(key => sessionStorage.removeItem(key));
        }
      },
      plugin: {
        get: async (key: string) => {
          try {
            const value = localStorage.getItem(prefix + key);
            return value ? JSON.parse(value) : null;
          } catch {
            return null;
          }
        },
        set: async (key: string, value: any) => {
          try {
            localStorage.setItem(prefix + key, JSON.stringify(value));
          } catch (error) {
            console.error(`Plugin storage hatası (${pluginId}):`, error);
            throw error;
          }
        },
        remove: async (key: string) => {
          localStorage.removeItem(prefix + key);
        },
        clear: async () => {
          const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix));
          keys.forEach(key => localStorage.removeItem(key));
        },
        keys: async () => {
          return Object.keys(localStorage)
            .filter(key => key.startsWith(prefix))
            .map(key => key.substring(prefix.length));
        }
      }
    };
  }

  /**
   * Network API oluştur
   */
  private createNetworkAPI(pluginId: string): any {
    return {
      fetch: async (url: string, options?: RequestInit) => {
        // URL doğrulama ve güvenlik kontrolü
        try {
          const urlObj = new URL(url);
          if (!['http:', 'https:'].includes(urlObj.protocol)) {
            throw new Error('Sadece HTTP/HTTPS protokolleri desteklenir');
          }
          
          return await fetch(url, {
            ...options,
            headers: {
              'X-Plugin-Id': pluginId,
              ...options?.headers
            }
          });
        } catch (error) {
          console.error(`Plugin network hatası (${pluginId}):`, error);
          throw error;
        }
      },
      websocket: (url: string) => {
        try {
          return new WebSocket(url);
        } catch (error) {
          console.error(`Plugin WebSocket hatası (${pluginId}):`, error);
          throw error;
        }
      },
      sse: (url: string) => {
        try {
          return new EventSource(url);
        } catch (error) {
          console.error(`Plugin SSE hatası (${pluginId}):`, error);
          throw error;
        }
      }
    };
  }

  /**
   * UI API oluştur
   */
  private createUIAPI(pluginId: string): any {
    return {
      notify: (message: string, type = 'info') => {
        // Basit notification sistem
        console.log(`[${pluginId}] ${type.toUpperCase()}: ${message}`);
      },
      confirm: async (message: string) => {
        return window.confirm(message);
      },
      prompt: async (message: string, defaultValue?: string) => {
        return window.prompt(message, defaultValue);
      },
      modal: async (component: any, props?: any) => {
        // Modal sistem entegrasyonu
        console.log(`Modal açıldı: ${pluginId}`, component, props);
        return null;
      },
      tooltip: (element: HTMLElement, content: string) => {
        element.title = content;
      }
    };
  }

  /**
   * Plugin örneği oluştur
   */
  async createInstance(pluginId: string, context?: Partial<PluginContext>): Promise<PluginInstance> {
    try {
      const plugin = this.loadedPlugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin bulunamadı: ${pluginId}`);
      }

      const instanceId = `${pluginId}_${Date.now()}`;
      const instance: PluginInstance = {
        id: instanceId,
        pluginId,
        status: PluginStatus.Loaded,
        context: {
          plugin,
          ...context
        } as PluginContext,
        createdAt: new Date(),
        lastUpdate: new Date()
      };

      this.pluginInstances.set(instanceId, instance);
      plugin.runtime.instances.push(instance);
      
      this.instanceCreatedSubject.next({ pluginId, instance });
      
      console.log(`Plugin örneği oluşturuldu: ${instanceId}`);
      return instance;

    } catch (error) {
      console.error(`Plugin örneği oluşturma hatası (${pluginId}):`, error);
      throw error;
    }
  }

  /**
   * Plugin'i kaldır
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    try {
      const plugin = this.loadedPlugins.get(pluginId);
      if (!plugin) {
        return;
      }

      // Örnekleri temizle
      plugin.runtime.instances.forEach(instance => {
        this.pluginInstances.delete(instance.id);
      });

      // Plugin'i kaldır
      this.loadedPlugins.delete(pluginId);
      
      console.log(`Plugin kaldırıldı: ${pluginId}`);
    } catch (error) {
      console.error(`Plugin kaldırma hatası (${pluginId}):`, error);
      throw error;
    }
  }

  /**
   * Yüklü plugin al
   */
  getLoadedPlugin(pluginId: string): Plugin | undefined {
    return this.loadedPlugins.get(pluginId);
  }

  /**
   * Plugin örneği al
   */
  getInstance(instanceId: string): PluginInstance | undefined {
    return this.pluginInstances.get(instanceId);
  }

  /**
   * Tüm yüklü pluginler
   */
  getAllLoadedPlugins(): Plugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Tüm örnekler
   */
  getAllInstances(): PluginInstance[] {
    return Array.from(this.pluginInstances.values());
  }

  /**
   * Loader istatistikleri
   */
  getStats() {
    return {
      loadedPlugins: this.loadedPlugins.size,
      totalInstances: this.pluginInstances.size,
      loadingQueue: this.loadingQueue.size,
      lastUpdate: new Date()
    };
  }

  /**
   * Loader'ı temizle
   */
  clear(): void {
    this.loadedPlugins.clear();
    this.pluginInstances.clear();
    this.loadingQueue.clear();
  }
}