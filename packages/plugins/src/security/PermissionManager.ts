import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { PluginPermission, PermissionScope } from '../types';

export interface PermissionRequest {
  id: string;
  pluginId: string;
  permission: PluginPermission;
  timestamp: Date;
  status: 'pending' | 'granted' | 'denied';
  reason?: string;
}

export interface PermissionAudit {
  id: string;
  pluginId: string;
  permissionId: string;
  action: 'request' | 'grant' | 'deny' | 'revoke' | 'use';
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Permission Manager - Plugin izin yönetimi sistemi
 * Plugin'lerin izin isteklerini yönetir ve kullanıcı onaylarını takip eder
 */
export class PermissionManager {
  private grantedPermissions = new Map<string, Set<string>>(); // pluginId -> Set<permissionId>
  private permissionRequests = new Map<string, PermissionRequest>();
  private permissionDefinitions = new Map<string, PluginPermission>();
  private auditLogs: PermissionAudit[] = [];

  private requestSubject = new Subject<PermissionRequest>();
  private grantSubject = new Subject<{ pluginId: string; permissionId: string }>();
  private revokeSubject = new Subject<{ pluginId: string; permissionId: string }>();
  private auditSubject = new Subject<PermissionAudit>();

  public readonly onPermissionRequest = this.requestSubject.asObservable();
  public readonly onPermissionGrant = this.grantSubject.asObservable();
  public readonly onPermissionRevoke = this.revokeSubject.asObservable();
  public readonly onAudit = this.auditSubject.asObservable();

  constructor() {
    this.initializeDefaultPermissions();
  }

  /**
   * Varsayılan izin tanımlarını başlat
   */
  private initializeDefaultPermissions(): void {
    const defaultPermissions: PluginPermission[] = [
      {
        id: 'storage.local',
        name: 'Yerel Depolama',
        description: 'localStorage ve sessionStorage erişimi',
        required: false,
        sensitive: false,
        scope: ['storage']
      },
      {
        id: 'storage.indexed',
        name: 'IndexedDB',
        description: 'IndexedDB veritabanı erişimi',
        required: false,
        sensitive: false,
        scope: ['storage']
      },
      {
        id: 'network.fetch',
        name: 'Ağ İstekleri',
        description: 'HTTP/HTTPS istekleri yapabilme',
        required: false,
        sensitive: true,
        scope: ['network']
      },
      {
        id: 'camera.access',
        name: 'Kamera Erişimi',
        description: 'Cihaz kamerasına erişim',
        required: false,
        sensitive: true,
        scope: ['camera']
      },
      {
        id: 'microphone.access',
        name: 'Mikrofon Erişimi',
        description: 'Cihaz mikrofonuna erişim',
        required: false,
        sensitive: true,
        scope: ['microphone']
      },
      {
        id: 'location.access',
        name: 'Konum Erişimi',
        description: 'GPS konumu ve jeolokasyon',
        required: false,
        sensitive: true,
        scope: ['location']
      },
      {
        id: 'sensors.motion',
        name: 'Hareket Sensörleri',
        description: 'İvmeölçer, jiroskop, magnetometre',
        required: false,
        sensitive: false,
        scope: ['sensors']
      },
      {
        id: 'ui.notification',
        name: 'Bildirimler',
        description: 'Masaüstü bildirimleri gösterme',
        required: false,
        sensitive: false,
        scope: ['ui']
      },
      {
        id: 'data.analytics',
        name: 'Analitik Veriler',
        description: 'Kullanıcı davranış verilerine erişim',
        required: false,
        sensitive: true,
        scope: ['data', 'analytics']
      },
      {
        id: 'system.info',
        name: 'Sistem Bilgisi',
        description: 'Tarayıcı ve sistem bilgileri',
        required: false,
        sensitive: false,
        scope: ['system']
      },
      {
        id: 'files.read',
        name: 'Dosya Okuma',
        description: 'Seçilen dosyaları okuma',
        required: false,
        sensitive: true,
        scope: ['files']
      },
      {
        id: 'files.download',
        name: 'Dosya İndirme',
        description: 'Dosya indirme işlemleri',
        required: false,
        sensitive: false,
        scope: ['files']
      }
    ];

    for (const permission of defaultPermissions) {
      this.permissionDefinitions.set(permission.id, permission);
    }
  }

  /**
   * İzin isteği oluştur
   */
  async requestPermission(pluginId: string, permissionId: string, reason?: string): Promise<boolean> {
    try {
      const permission = this.permissionDefinitions.get(permissionId);
      if (!permission) {
        throw new Error(`Bilinmeyen izin: ${permissionId}`);
      }

      // Zaten verilmiş mi kontrol et
      if (this.hasPermission(pluginId, permissionId)) {
        this.audit(pluginId, permissionId, 'use', { alreadyGranted: true });
        return true;
      }

      const requestId = crypto.randomUUID();
      const request: PermissionRequest = {
        id: requestId,
        pluginId,
        permission,
        timestamp: new Date(),
        status: 'pending',
        reason
      };

      this.permissionRequests.set(requestId, request);
      this.requestSubject.next(request);

      // Hassas izinler için kullanıcı onayı iste
      if (permission.sensitive) {
        const granted = await this.promptUserForPermission(pluginId, permission, reason);
        return await this.processPermissionResponse(requestId, granted);
      }

      // Hassas olmayan izinler otomatik olarak verilebilir
      return await this.processPermissionResponse(requestId, true);

    } catch (error) {
      console.error(`İzin isteği hatası (${pluginId}):`, error);
      this.audit(pluginId, permissionId, 'request', { error: error?.toString() });
      return false;
    }
  }

  /**
   * İzin isteği yanıtını işle
   */
  private async processPermissionResponse(requestId: string, granted: boolean): Promise<boolean> {
    const request = this.permissionRequests.get(requestId);
    if (!request) {
      return false;
    }

    if (granted) {
      await this.grantPermission(request.pluginId, request.permission.id);
      request.status = 'granted';
    } else {
      request.status = 'denied';
    }

    this.audit(request.pluginId, request.permission.id, granted ? 'grant' : 'deny');
    return granted;
  }

  /**
   * İzin ver
   */
  async grantPermission(pluginId: string, permissionId: string): Promise<void> {
    if (!this.grantedPermissions.has(pluginId)) {
      this.grantedPermissions.set(pluginId, new Set());
    }

    this.grantedPermissions.get(pluginId)!.add(permissionId);
    this.grantSubject.next({ pluginId, permissionId });
    
    console.log(`İzin verildi: ${pluginId} -> ${permissionId}`);
  }

  /**
   * İzin iptal et
   */
  async revokePermission(pluginId: string, permissionId: string): Promise<void> {
    const permissions = this.grantedPermissions.get(pluginId);
    if (permissions) {
      permissions.delete(permissionId);
      if (permissions.size === 0) {
        this.grantedPermissions.delete(pluginId);
      }
    }

    this.revokeSubject.next({ pluginId, permissionId });
    this.audit(pluginId, permissionId, 'revoke');
    
    console.log(`İzin iptal edildi: ${pluginId} -> ${permissionId}`);
  }

  /**
   * İzin kontrolü
   */
  hasPermission(pluginId: string, permissionId: string): boolean {
    const permissions = this.grantedPermissions.get(pluginId);
    return permissions ? permissions.has(permissionId) : false;
  }

  /**
   * Plugin'in tüm izinlerini al
   */
  getPluginPermissions(pluginId: string): string[] {
    const permissions = this.grantedPermissions.get(pluginId);
    return permissions ? Array.from(permissions) : [];
  }

  /**
   * İzin tanımı al
   */
  getPermissionDefinition(permissionId: string): PluginPermission | undefined {
    return this.permissionDefinitions.get(permissionId);
  }

  /**
   * Tüm izin tanımları al
   */
  getAllPermissionDefinitions(): PluginPermission[] {
    return Array.from(this.permissionDefinitions.values());
  }

  /**
   * Kullanıcıdan izin onayı iste
   */
  private async promptUserForPermission(
    pluginId: string, 
    permission: PluginPermission, 
    reason?: string
  ): Promise<boolean> {
    const message = `
${pluginId} eklentisi aşağıdaki izni istiyor:

${permission.name}
${permission.description}

${reason ? `Gerekçe: ${reason}` : ''}

Bu izni vermek istiyor musunuz?
    `.trim();

    return confirm(message);
  }

  /**
   * Scope bazında izin kontrolü
   */
  hasScopePermission(pluginId: string, scope: PermissionScope): boolean {
    const permissions = this.grantedPermissions.get(pluginId);
    if (!permissions) return false;

    for (const permissionId of permissions) {
      const permission = this.permissionDefinitions.get(permissionId);
      if (permission && permission.scope.includes(scope)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Toplu izin verme
   */
  async grantMultiplePermissions(pluginId: string, permissionIds: string[]): Promise<void> {
    for (const permissionId of permissionIds) {
      await this.grantPermission(pluginId, permissionId);
    }
  }

  /**
   * Plugin'in tüm izinlerini iptal et
   */
  async revokeAllPermissions(pluginId: string): Promise<void> {
    const permissions = this.grantedPermissions.get(pluginId);
    if (permissions) {
      const permissionIds = Array.from(permissions);
      for (const permissionId of permissionIds) {
        await this.revokePermission(pluginId, permissionId);
      }
    }
  }

  /**
   * İzin isteği geçmişi
   */
  getPermissionRequests(pluginId?: string): PermissionRequest[] {
    const requests = Array.from(this.permissionRequests.values());
    return pluginId ? requests.filter(req => req.pluginId === pluginId) : requests;
  }

  /**
   * Bekleyen izin istekleri
   */
  getPendingRequests(pluginId?: string): PermissionRequest[] {
    return this.getPermissionRequests(pluginId).filter(req => req.status === 'pending');
  }

  /**
   * İzin kullanım takibi
   */
  trackPermissionUsage(pluginId: string, permissionId: string, metadata?: Record<string, any>): void {
    if (this.hasPermission(pluginId, permissionId)) {
      this.audit(pluginId, permissionId, 'use', metadata);
    } else {
      console.warn(`İzinsiz erişim girişimi: ${pluginId} -> ${permissionId}`);
      this.audit(pluginId, permissionId, 'use', { unauthorized: true, ...metadata });
    }
  }

  /**
   * İzin istatistikleri
   */
  getPermissionStats() {
    const totalPlugins = this.grantedPermissions.size;
    const totalPermissions = Array.from(this.grantedPermissions.values())
      .reduce((sum, permissions) => sum + permissions.size, 0);

    const permissionUsage = Array.from(this.permissionDefinitions.keys()).reduce((acc, permissionId) => {
      let usageCount = 0;
      for (const permissions of this.grantedPermissions.values()) {
        if (permissions.has(permissionId)) {
          usageCount++;
        }
      }
      acc[permissionId] = usageCount;
      return acc;
    }, {} as Record<string, number>);

    const sensitivePermissions = Array.from(this.permissionDefinitions.values())
      .filter(p => p.sensitive).length;

    return {
      totalPlugins,
      totalPermissions,
      permissionUsage,
      sensitivePermissions,
      totalRequests: this.permissionRequests.size,
      pendingRequests: this.getPendingRequests().length,
      lastUpdate: new Date()
    };
  }

  /**
   * İzin denetim kaydı oluştur
   */
  private audit(
    pluginId: string,
    permissionId: string,
    action: PermissionAudit['action'],
    metadata?: Record<string, any>
  ): void {
    const auditLog: PermissionAudit = {
      id: crypto.randomUUID(),
      pluginId,
      permissionId,
      action,
      timestamp: new Date(),
      metadata
    };

    this.auditLogs.push(auditLog);
    this.auditSubject.next(auditLog);

    // Audit log boyutu kontrolü
    if (this.auditLogs.length > 5000) {
      this.auditLogs = this.auditLogs.slice(-2500); // Son 2500 kaydı tut
    }
  }

  /**
   * Denetim kayıtlarını al
   */
  getAuditLogs(pluginId?: string, limit?: number): PermissionAudit[] {
    let logs = this.auditLogs;
    
    if (pluginId) {
      logs = logs.filter(log => log.pluginId === pluginId);
    }

    if (limit) {
      logs = logs.slice(-limit);
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * İzin raporu oluştur
   */
  generatePermissionReport(pluginId?: string) {
    const stats = this.getPermissionStats();
    const auditLogs = this.getAuditLogs(pluginId, 100);
    const requests = this.getPermissionRequests(pluginId);

    return {
      stats,
      auditLogs,
      requests,
      permissions: pluginId 
        ? { [pluginId]: this.getPluginPermissions(pluginId) }
        : Object.fromEntries(this.grantedPermissions.entries()),
      generatedAt: new Date()
    };
  }

  /**
   * Özel izin tanımı ekle
   */
  definePermission(permission: PluginPermission): void {
    this.permissionDefinitions.set(permission.id, permission);
    console.log(`Yeni izin tanımlandı: ${permission.id}`);
  }

  /**
   * İzin tanımını kaldır
   */
  removePermissionDefinition(permissionId: string): void {
    this.permissionDefinitions.delete(permissionId);
    
    // Bu izni kullanan tüm plugin'lerden kaldır
    for (const [pluginId, permissions] of this.grantedPermissions) {
      if (permissions.has(permissionId)) {
        permissions.delete(permissionId);
        if (permissions.size === 0) {
          this.grantedPermissions.delete(pluginId);
        }
      }
    }

    console.log(`İzin tanımı kaldırıldı: ${permissionId}`);
  }

  /**
   * Verileri temizle
   */
  clear(pluginId?: string): void {
    if (pluginId) {
      this.grantedPermissions.delete(pluginId);
      this.auditLogs = this.auditLogs.filter(log => log.pluginId !== pluginId);
      
      const requestsToDelete = Array.from(this.permissionRequests.entries())
        .filter(([_, req]) => req.pluginId === pluginId)
        .map(([id, _]) => id);
      
      requestsToDelete.forEach(id => this.permissionRequests.delete(id));
    } else {
      this.grantedPermissions.clear();
      this.permissionRequests.clear();
      this.auditLogs = [];
    }
  }
}