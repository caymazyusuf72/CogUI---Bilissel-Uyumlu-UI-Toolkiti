import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { 
  Plugin, 
  PluginManifest, 
  PluginStatus, 
  PluginMetadata,
  PluginDependency,
  PluginCompatibility,
  PluginRegistryEvent,
  PluginFilterCriteria,
  PluginSortCriteria,
  PluginSearchCriteria
} from '../types';

/**
 * Plugin Registry - Merkezi plugin kaydı ve arama sistemi
 * Tüm yüklü ve kullanılabilir pluginlerin yönetimini sağlar
 */
export class PluginRegistry {
  private plugins = new Map<string, Plugin>();
  private manifests = new Map<string, PluginManifest>();
  private metadata = new Map<string, PluginMetadata>();
  private dependencies = new Map<string, PluginDependency[]>();
  
  private registrySubject = new BehaviorSubject<Map<string, Plugin>>(new Map());
  private eventSubject = new Subject<PluginRegistryEvent>();

  // Observable streams
  public readonly plugins$ = this.registrySubject.asObservable();
  public readonly events$ = this.eventSubject.asObservable();
  
  // Event streams
  public readonly onPluginRegistered$ = this.events$.pipe(
    filter(event => event.type === 'plugin-registered')
  );
  
  public readonly onPluginUnregistered$ = this.events$.pipe(
    filter(event => event.type === 'plugin-unregistered')
  );
  
  public readonly onPluginUpdated$ = this.events$.pipe(
    filter(event => event.type === 'plugin-updated')
  );

  /**
   * Plugin'i registry'ye kaydet
   */
  async registerPlugin(plugin: Plugin, manifest: PluginManifest): Promise<void> {
    try {
      // Mevcut plugin kontrolü
      if (this.plugins.has(plugin.id)) {
        throw new Error(`Plugin ${plugin.id} zaten kayıtlı`);
      }

      // Manifest validasyonu
      this.validateManifest(manifest);

      // Plugin ve metadata kayıt
      this.plugins.set(plugin.id, plugin);
      this.manifests.set(plugin.id, manifest);
      
      const metadata: PluginMetadata = {
        id: plugin.id,
        name: manifest.name,
        version: manifest.version,
        author: manifest.author,
        description: manifest.description,
        category: manifest.category,
        keywords: manifest.keywords || [],
        license: manifest.license,
        repository: manifest.repository,
        homepage: manifest.homepage,
        bugs: manifest.bugs,
        registeredAt: new Date(),
        lastUsed: null,
        installCount: 0,
        status: PluginStatus.Registered,
        size: manifest.size || 0,
        dependencies: manifest.dependencies || [],
        permissions: manifest.permissions || [],
        compatibility: manifest.compatibility
      };
      
      this.metadata.set(plugin.id, metadata);
      this.dependencies.set(plugin.id, manifest.dependencies || []);

      // Registry güncelleme
      this.registrySubject.next(new Map(this.plugins));
      
      // Event yayınla
      this.eventSubject.next({
        type: 'plugin-registered',
        pluginId: plugin.id,
        timestamp: new Date(),
        data: { plugin, manifest, metadata }
      });

      console.log(`Plugin kayıtlandı: ${plugin.id}`);
    } catch (error) {
      console.error(`Plugin kayıt hatası (${plugin.id}):`, error);
      throw error;
    }
  }

  /**
   * Plugin kaydını kaldır
   */
  async unregisterPlugin(pluginId: string): Promise<void> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin bulunamadı: ${pluginId}`);
      }

      // Plugin ve metadata kaldır
      this.plugins.delete(pluginId);
      this.manifests.delete(pluginId);
      this.metadata.delete(pluginId);
      this.dependencies.delete(pluginId);

      // Registry güncelleme
      this.registrySubject.next(new Map(this.plugins));
      
      // Event yayınla
      this.eventSubject.next({
        type: 'plugin-unregistered',
        pluginId,
        timestamp: new Date(),
        data: { plugin }
      });

      console.log(`Plugin kaydı kaldırıldı: ${pluginId}`);
    } catch (error) {
      console.error(`Plugin kayıt kaldırma hatası (${pluginId}):`, error);
      throw error;
    }
  }

  /**
   * Plugin bilgilerini güncelle
   */
  async updatePlugin(pluginId: string, updates: Partial<PluginMetadata>): Promise<void> {
    try {
      const metadata = this.metadata.get(pluginId);
      if (!metadata) {
        throw new Error(`Plugin metadata bulunamadı: ${pluginId}`);
      }

      // Metadata güncelle
      const updatedMetadata = { ...metadata, ...updates, updatedAt: new Date() };
      this.metadata.set(pluginId, updatedMetadata);

      // Event yayınla
      this.eventSubject.next({
        type: 'plugin-updated',
        pluginId,
        timestamp: new Date(),
        data: { metadata: updatedMetadata, updates }
      });

      console.log(`Plugin güncellendi: ${pluginId}`);
    } catch (error) {
      console.error(`Plugin güncelleme hatası (${pluginId}):`, error);
      throw error;
    }
  }

  /**
   * Plugin al
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Plugin manifest al
   */
  getManifest(pluginId: string): PluginManifest | undefined {
    return this.manifests.get(pluginId);
  }

  /**
   * Plugin metadata al
   */
  getMetadata(pluginId: string): PluginMetadata | undefined {
    return this.metadata.get(pluginId);
  }

  /**
   * Plugin bağımlılıkları al
   */
  getDependencies(pluginId: string): PluginDependency[] {
    return this.dependencies.get(pluginId) || [];
  }

  /**
   * Tüm pluginleri al
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Tüm plugin metadata'larını al
   */
  getAllMetadata(): PluginMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Plugin ara
   */
  searchPlugins(criteria: PluginSearchCriteria): PluginMetadata[] {
    let results = this.getAllMetadata();

    // Metin arama
    if (criteria.query) {
      const query = criteria.query.toLowerCase();
      results = results.filter(metadata => 
        metadata.name.toLowerCase().includes(query) ||
        metadata.description.toLowerCase().includes(query) ||
        metadata.keywords.some(keyword => keyword.toLowerCase().includes(query))
      );
    }

    // Kategori filtresi
    if (criteria.category) {
      results = results.filter(metadata => metadata.category === criteria.category);
    }

    // Yazar filtresi
    if (criteria.author) {
      results = results.filter(metadata => metadata.author === criteria.author);
    }

    // Durum filtresi
    if (criteria.status) {
      results = results.filter(metadata => metadata.status === criteria.status);
    }

    // Sıralama
    if (criteria.sortBy) {
      results = this.sortPlugins(results, criteria.sortBy, criteria.sortOrder);
    }

    // Limit
    if (criteria.limit) {
      results = results.slice(0, criteria.limit);
    }

    return results;
  }

  /**
   * Pluginleri filtrele
   */
  filterPlugins(criteria: PluginFilterCriteria): PluginMetadata[] {
    let results = this.getAllMetadata();

    // Kategori filtresi
    if (criteria.categories?.length) {
      results = results.filter(metadata => 
        criteria.categories!.includes(metadata.category)
      );
    }

    // Durum filtresi
    if (criteria.statuses?.length) {
      results = results.filter(metadata => 
        criteria.statuses!.includes(metadata.status)
      );
    }

    // Yazar filtresi
    if (criteria.authors?.length) {
      results = results.filter(metadata => 
        criteria.authors!.includes(metadata.author)
      );
    }

    // Tarih aralığı filtresi
    if (criteria.dateRange) {
      const { start, end } = criteria.dateRange;
      results = results.filter(metadata => {
        const date = metadata.registeredAt;
        return date >= start && date <= end;
      });
    }

    // Minimum yükleme sayısı
    if (criteria.minInstallCount !== undefined) {
      results = results.filter(metadata => 
        metadata.installCount >= criteria.minInstallCount!
      );
    }

    return results;
  }

  /**
   * Pluginleri sırala
   */
  private sortPlugins(
    plugins: PluginMetadata[], 
    sortBy: PluginSortCriteria, 
    order: 'asc' | 'desc' = 'desc'
  ): PluginMetadata[] {
    return plugins.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'version':
          comparison = this.compareVersions(a.version, b.version);
          break;
        case 'registeredAt':
          comparison = a.registeredAt.getTime() - b.registeredAt.getTime();
          break;
        case 'lastUsed':
          const aUsed = a.lastUsed?.getTime() || 0;
          const bUsed = b.lastUsed?.getTime() || 0;
          comparison = aUsed - bUsed;
          break;
        case 'installCount':
          comparison = a.installCount - b.installCount;
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        default:
          comparison = 0;
      }

      return order === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Plugin var mı kontrol et
   */
  hasPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Plugin sayısı
   */
  getPluginCount(): number {
    return this.plugins.size;
  }

  /**
   * Kategori bazında plugin sayıları
   */
  getPluginCountByCategory(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    this.getAllMetadata().forEach(metadata => {
      counts[metadata.category] = (counts[metadata.category] || 0) + 1;
    });

    return counts;
  }

  /**
   * Durum bazında plugin sayıları
   */
  getPluginCountByStatus(): Record<PluginStatus, number> {
    const counts = Object.values(PluginStatus).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<PluginStatus, number>);
    
    this.getAllMetadata().forEach(metadata => {
      counts[metadata.status]++;
    });

    return counts;
  }

  /**
   * Plugin kullanım istatistikleri güncelle
   */
  updateUsageStats(pluginId: string): void {
    const metadata = this.metadata.get(pluginId);
    if (metadata) {
      metadata.lastUsed = new Date();
      metadata.installCount++;
      this.metadata.set(pluginId, metadata);
    }
  }

  /**
   * Manifest validasyonu
   */
  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.name || !manifest.version || !manifest.author) {
      throw new Error('Manifest eksik gerekli alanlar: name, version, author');
    }

    if (!manifest.cogui || !manifest.cogui.version) {
      throw new Error('Manifest CogUI versiyon bilgisi eksik');
    }

    // Semver format kontrolü
    if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
      throw new Error('Geçersiz versiyon formatı (semver gerekli)');
    }
  }

  /**
   * Versiyon karşılaştırması
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart > bPart) return 1;
      if (aPart < bPart) return -1;
    }
    
    return 0;
  }

  /**
   * Registry'yi temizle
   */
  clear(): void {
    this.plugins.clear();
    this.manifests.clear();
    this.metadata.clear();
    this.dependencies.clear();
    this.registrySubject.next(new Map());
    
    this.eventSubject.next({
      type: 'plugin-unregistered',
      pluginId: 'all',
      timestamp: new Date(),
      data: {}
    });
  }

  /**
   * Registry istatistikleri
   */
  getStats() {
    return {
      total: this.getPluginCount(),
      byCategory: this.getPluginCountByCategory(),
      byStatus: this.getPluginCountByStatus(),
      lastUpdate: new Date()
    };
  }
}