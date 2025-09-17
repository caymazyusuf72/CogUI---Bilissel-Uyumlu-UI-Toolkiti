import { PluginDependency, PluginManifest, Plugin } from '../types';

export interface DependencyGraph {
  [pluginId: string]: string[];
}

export interface ResolveResult {
  success: boolean;
  resolved: string[];
  missing: PluginDependency[];
  conflicts: DependencyConflict[];
  installOrder: string[];
}

export interface DependencyConflict {
  pluginId: string;
  conflictWith: string;
  reason: string;
  dependency: PluginDependency;
}

/**
 * Dependency Resolver - Plugin bağımlılık çözümleyicisi
 * Plugin'lerin bağımlılıklarını analiz eder ve kurulum sırasını belirler
 */
export class DependencyResolver {
  private dependencyGraph: DependencyGraph = {};
  private installedPlugins = new Set<string>();
  private pluginManifests = new Map<string, PluginManifest>();

  /**
   * Plugin manifest kaydet
   */
  registerManifest(pluginId: string, manifest: PluginManifest): void {
    this.pluginManifests.set(pluginId, manifest);
    this.updateDependencyGraph(pluginId, manifest.dependencies);
  }

  /**
   * Plugin manifest kaldır
   */
  unregisterManifest(pluginId: string): void {
    this.pluginManifests.delete(pluginId);
    delete this.dependencyGraph[pluginId];
    this.rebuildDependencyGraph();
  }

  /**
   * Yüklü plugin kaydet
   */
  markInstalled(pluginId: string): void {
    this.installedPlugins.add(pluginId);
  }

  /**
   * Yüklü plugin kaldır
   */
  markUninstalled(pluginId: string): void {
    this.installedPlugins.delete(pluginId);
  }

  /**
   * Bağımlılıkları çözümle
   */
  resolve(pluginId: string): ResolveResult {
    try {
      const manifest = this.pluginManifests.get(pluginId);
      if (!manifest) {
        return {
          success: false,
          resolved: [],
          missing: [],
          conflicts: [],
          installOrder: []
        };
      }

      const visited = new Set<string>();
      const resolved: string[] = [];
      const missing: PluginDependency[] = [];
      const conflicts: DependencyConflict[] = [];
      const processing = new Set<string>();

      this.resolveDependenciesRecursive(
        pluginId, 
        visited, 
        resolved, 
        missing, 
        conflicts, 
        processing
      );

      // Kurulum sırasını belirle
      const installOrder = this.calculateInstallOrder(resolved);

      return {
        success: missing.length === 0 && conflicts.length === 0,
        resolved,
        missing,
        conflicts,
        installOrder
      };

    } catch (error) {
      console.error(`Bağımlılık çözümleme hatası (${pluginId}):`, error);
      return {
        success: false,
        resolved: [],
        missing: [],
        conflicts: [],
        installOrder: []
      };
    }
  }

  /**
   * Recursive bağımlılık çözümlemesi
   */
  private resolveDependenciesRecursive(
    pluginId: string,
    visited: Set<string>,
    resolved: string[],
    missing: PluginDependency[],
    conflicts: DependencyConflict[],
    processing: Set<string>
  ): void {
    if (visited.has(pluginId)) {
      return;
    }

    if (processing.has(pluginId)) {
      // Döngüsel bağımlılık tespit edildi
      const conflict: DependencyConflict = {
        pluginId,
        conflictWith: Array.from(processing)[0],
        reason: 'Döngüsel bağımlılık',
        dependency: {
          id: pluginId,
          name: pluginId,
          version: '*',
          required: true,
          type: 'plugin'
        }
      };
      conflicts.push(conflict);
      return;
    }

    processing.add(pluginId);

    const manifest = this.pluginManifests.get(pluginId);
    if (!manifest) {
      missing.push({
        id: pluginId,
        name: pluginId,
        version: '*',
        required: true,
        type: 'plugin'
      });
      processing.delete(pluginId);
      return;
    }

    // Bu plugin'in bağımlılıklarını kontrol et
    for (const dependency of manifest.dependencies) {
      if (dependency.type === 'plugin') {
        const dependencyId = dependency.id;

        // Versiyon uyumluluğu kontrolü
        if (!this.isVersionCompatible(dependency, dependencyId)) {
          const conflict: DependencyConflict = {
            pluginId,
            conflictWith: dependencyId,
            reason: `Versiyon uyumsuzluğu: gerekli ${dependency.version}`,
            dependency
          };
          conflicts.push(conflict);
          continue;
        }

        // Recursive çözümleme
        this.resolveDependenciesRecursive(
          dependencyId, 
          visited, 
          resolved, 
          missing, 
          conflicts, 
          processing
        );
      } else {
        // NPM, system, vb. bağımlılıkları kontrolü
        if (!this.isExternalDependencyAvailable(dependency)) {
          missing.push(dependency);
        }
      }
    }

    processing.delete(pluginId);
    visited.add(pluginId);
    resolved.push(pluginId);
  }

  /**
   * Versiyon uyumluluğu kontrolü
   */
  private isVersionCompatible(dependency: PluginDependency, pluginId: string): boolean {
    const manifest = this.pluginManifests.get(pluginId);
    if (!manifest) {
      return false;
    }

    try {
      return this.satisfiesVersionRange(manifest.version, dependency.version);
    } catch (error) {
      console.warn(`Versiyon kontrolü hatası (${pluginId}):`, error);
      return false;
    }
  }

  /**
   * Semver versiyon aralığı kontrolü
   */
  private satisfiesVersionRange(version: string, range: string): boolean {
    // Basit versiyon kontrolü - production'da semver kütüphanesi kullanılmalı
    if (range === '*' || range === 'latest') {
      return true;
    }

    // Exact match
    if (range === version) {
      return true;
    }

    // Range kontrolü (^, ~, >=, vb.)
    if (range.startsWith('^')) {
      const targetMajor = this.getMajorVersion(range.substring(1));
      const currentMajor = this.getMajorVersion(version);
      return targetMajor === currentMajor;
    }

    if (range.startsWith('~')) {
      const targetMinor = this.getMinorVersion(range.substring(1));
      const currentMinor = this.getMinorVersion(version);
      return targetMinor === currentMinor;
    }

    if (range.startsWith('>=')) {
      return this.compareVersions(version, range.substring(2)) >= 0;
    }

    if (range.startsWith('>')) {
      return this.compareVersions(version, range.substring(1)) > 0;
    }

    if (range.startsWith('<=')) {
      return this.compareVersions(version, range.substring(2)) <= 0;
    }

    if (range.startsWith('<')) {
      return this.compareVersions(version, range.substring(1)) < 0;
    }

    return false;
  }

  /**
   * Versiyon karşılaştırması
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    return 0;
  }

  /**
   * Major versiyon al
   */
  private getMajorVersion(version: string): number {
    return parseInt(version.split('.')[0] || '0');
  }

  /**
   * Minor versiyon al
   */
  private getMinorVersion(version: string): string {
    const parts = version.split('.');
    return `${parts[0] || '0'}.${parts[1] || '0'}`;
  }

  /**
   * External bağımlılık kontrolü
   */
  private isExternalDependencyAvailable(dependency: PluginDependency): boolean {
    switch (dependency.type) {
      case 'npm':
        // NPM paket kontrolü - gerçek implementasyon gerekli
        return true;
      
      case 'cogui':
        // CogUI versiyon kontrolü
        return this.isCogUIVersionCompatible(dependency.version);
      
      case 'system':
        // Sistem bağımlılığı kontrolü
        return this.isSystemDependencyAvailable(dependency);
      
      default:
        return false;
    }
  }

  /**
   * CogUI versiyon uyumluluğu
   */
  private isCogUIVersionCompatible(requiredVersion: string): boolean {
    const currentVersion = '1.0.0'; // CogUI current version
    return this.satisfiesVersionRange(currentVersion, requiredVersion);
  }

  /**
   * Sistem bağımlılığı kontrolü
   */
  private isSystemDependencyAvailable(dependency: PluginDependency): boolean {
    // Tarayıcı API'leri kontrolü
    const systemAPIs: Record<string, boolean> = {
      'localStorage': typeof Storage !== 'undefined',
      'indexedDB': typeof indexedDB !== 'undefined',
      'fetch': typeof fetch !== 'undefined',
      'webgl': this.isWebGLSupported(),
      'webrtc': this.isWebRTCSupported(),
      'geolocation': 'geolocation' in navigator,
      'camera': 'mediaDevices' in navigator,
      'microphone': 'mediaDevices' in navigator
    };

    return systemAPIs[dependency.id] || false;
  }

  /**
   * WebGL desteği kontrolü
   */
  private isWebGLSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  /**
   * WebRTC desteği kontrolü
   */
  private isWebRTCSupported(): boolean {
    return !!(window.RTCPeerConnection || (window as any).mozRTCPeerConnection || (window as any).webkitRTCPeerConnection);
  }

  /**
   * Kurulum sırası hesapla (topological sort)
   */
  private calculateInstallOrder(plugins: string[]): string[] {
    const graph: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    
    // Graf ve in-degree başlat
    for (const pluginId of plugins) {
      graph[pluginId] = [];
      inDegree[pluginId] = 0;
    }

    // Bağımlılık kenarları ekle
    for (const pluginId of plugins) {
      const manifest = this.pluginManifests.get(pluginId);
      if (manifest) {
        for (const dependency of manifest.dependencies) {
          if (dependency.type === 'plugin' && plugins.includes(dependency.id)) {
            graph[dependency.id].push(pluginId);
            inDegree[pluginId]++;
          }
        }
      }
    }

    // Topological sort
    const queue: string[] = [];
    const result: string[] = [];

    // In-degree 0 olan düğümleri kuyruğa ekle
    for (const pluginId of plugins) {
      if (inDegree[pluginId] === 0) {
        queue.push(pluginId);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      for (const neighbor of graph[current]) {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) {
          queue.push(neighbor);
        }
      }
    }

    return result;
  }

  /**
   * Bağımlılık grafiğini güncelle
   */
  private updateDependencyGraph(pluginId: string, dependencies: PluginDependency[]): void {
    this.dependencyGraph[pluginId] = dependencies
      .filter(dep => dep.type === 'plugin')
      .map(dep => dep.id);
  }

  /**
   * Bağımlılık grafiğini yeniden oluştur
   */
  private rebuildDependencyGraph(): void {
    this.dependencyGraph = {};
    for (const [pluginId, manifest] of this.pluginManifests) {
      this.updateDependencyGraph(pluginId, manifest.dependencies);
    }
  }

  /**
   * Plugin'i kaldırma analizi
   */
  analyzeUninstall(pluginId: string): {
    canUninstall: boolean;
    dependents: string[];
    warnings: string[];
  } {
    const dependents: string[] = [];
    const warnings: string[] = [];

    // Bu plugin'e bağımlı olan pluginleri bul
    for (const [pid, manifest] of this.pluginManifests) {
      if (pid === pluginId) continue;
      
      const hasDependency = manifest.dependencies.some(dep => 
        dep.type === 'plugin' && dep.id === pluginId && dep.required
      );
      
      if (hasDependency && this.installedPlugins.has(pid)) {
        dependents.push(pid);
      }
    }

    if (dependents.length > 0) {
      warnings.push(`Bu pluginlere bağımlılık var: ${dependents.join(', ')}`);
    }

    return {
      canUninstall: dependents.length === 0,
      dependents,
      warnings
    };
  }

  /**
   * Bağımlılık grafiği istatistikleri
   */
  getStats() {
    const totalDependencies = Object.values(this.dependencyGraph)
      .reduce((sum, deps) => sum + deps.length, 0);

    const maxDependencies = Math.max(
      ...Object.values(this.dependencyGraph).map(deps => deps.length),
      0
    );

    return {
      totalPlugins: Object.keys(this.dependencyGraph).length,
      totalDependencies,
      maxDependencies,
      installedPlugins: this.installedPlugins.size,
      lastUpdate: new Date()
    };
  }

  /**
   * Resolver'ı temizle
   */
  clear(): void {
    this.dependencyGraph = {};
    this.installedPlugins.clear();
    this.pluginManifests.clear();
  }
}