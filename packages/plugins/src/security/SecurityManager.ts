import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { PluginPermission, SecurityPolicy, SecurityRule, PluginStatus } from '../types';

export interface SecurityViolation {
  pluginId: string;
  type: 'permission' | 'api' | 'resource' | 'behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  action: 'blocked' | 'allowed' | 'prompted';
  timestamp: Date;
  context?: any;
}

export interface SecurityAuditLog {
  id: string;
  pluginId: string;
  action: string;
  resource: string;
  result: 'allowed' | 'denied' | 'prompted';
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Security Manager - Plugin güvenlik ve izin yönetimi
 * Plugin'lerin güvenli çalışması ve izinlerinin kontrolü
 */
export class SecurityManager {
  private securityPolicies = new Map<string, SecurityPolicy>();
  private pluginPermissions = new Map<string, PluginPermission[]>();
  private auditLogs: SecurityAuditLog[] = [];
  private violations: SecurityViolation[] = [];
  
  private violationSubject = new Subject<SecurityViolation>();
  private auditSubject = new Subject<SecurityAuditLog>();

  public readonly onSecurityViolation = this.violationSubject.asObservable();
  public readonly onSecurityAudit = this.auditSubject.asObservable();

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Security Manager'ı başlat
   */
  async initialize(): Promise<void> {
    console.log('Security Manager başlatılıyor...');
    // İlk kurulum işlemleri burada yapılır
  }

  /**
   * Plugin güvenlik validasyonu
   */
  async validatePlugin(pluginData: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Temel validasyonlar
    if (!pluginData.manifest) {
      errors.push('Plugin manifest eksik');
    }
    
    if (pluginData.manifest?.permissions?.length > 10) {
      errors.push('Çok fazla izin isteniyor');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Security Manager'ı kapat
   */
  async dispose(): Promise<void> {
    this.clearSecurityData();
    console.log('Security Manager kapatıldı');
  }

  /**
   * Varsayılan güvenlik politikalarını başlat
   */
  private initializeDefaultPolicies(): void {
    // Temel güvenlik politikası
    const basicPolicy: SecurityPolicy = {
      id: 'basic-security',
      name: 'Temel Güvenlik',
      description: 'Temel güvenlik kuralları',
      enforcement: 'block',
      exceptions: [],
      rules: [
        {
          id: 'no-eval',
          type: 'api',
          pattern: 'eval|Function',
          action: 'deny',
          condition: 'always'
        },
        {
          id: 'safe-storage',
          type: 'resource',
          pattern: 'localStorage|sessionStorage',
          action: 'allow',
          condition: 'with-permission'
        },
        {
          id: 'network-restrictions',
          type: 'resource',
          pattern: 'fetch|XMLHttpRequest',
          action: 'prompt',
          condition: 'external-domains'
        }
      ]
    };

    this.securityPolicies.set(basicPolicy.id, basicPolicy);

    // Yüksek güvenlik politikası
    const strictPolicy: SecurityPolicy = {
      id: 'strict-security',
      name: 'Sıkı Güvenlik',
      description: 'Maksimum güvenlik kuralları',
      enforcement: 'block',
      exceptions: ['trusted-plugins'],
      rules: [
        {
          id: 'no-dynamic-code',
          type: 'api',
          pattern: 'eval|Function|setTimeout|setInterval',
          action: 'deny'
        },
        {
          id: 'limited-dom-access',
          type: 'api',
          pattern: 'document\\..*|window\\..*',
          action: 'deny',
          condition: 'unless-permitted'
        },
        {
          id: 'no-external-resources',
          type: 'resource',
          pattern: 'https?://.*',
          action: 'deny',
          condition: 'external-domains'
        }
      ]
    };

    this.securityPolicies.set(strictPolicy.id, strictPolicy);
  }

  /**
   * Plugin izinlerini ayarla
   */
  setPluginPermissions(pluginId: string, permissions: PluginPermission[]): void {
    this.pluginPermissions.set(pluginId, permissions);
    
    this.audit(pluginId, 'permissions-updated', 'plugin-config', 'allowed', {
      permissionCount: permissions.length,
      permissions: permissions.map(p => p.id)
    });
  }

  /**
   * Plugin izinlerini al
   */
  getPluginPermissions(pluginId: string): PluginPermission[] {
    return this.pluginPermissions.get(pluginId) || [];
  }

  /**
   * İzin kontrolü
   */
  checkPermission(pluginId: string, permissionId: string, context?: any): boolean {
    try {
      const permissions = this.getPluginPermissions(pluginId);
      const permission = permissions.find(p => p.id === permissionId);
      
      if (!permission) {
        this.reportViolation({
          pluginId,
          type: 'permission',
          severity: 'high',
          description: `İzin verilmemiş erişim: ${permissionId}`,
          action: 'blocked',
          timestamp: new Date(),
          context
        });
        return false;
      }

      if (!permission.required) {
        this.audit(pluginId, 'permission-check', permissionId, 'allowed', context);
        return true;
      }

      // Hassas izinler için ekstra kontrol
      if (permission.sensitive) {
        const userConsent = this.getUserConsent(pluginId, permissionId);
        if (!userConsent) {
          this.reportViolation({
            pluginId,
            type: 'permission',
            severity: 'critical',
            description: `Hassas izin için kullanıcı onayı gerekli: ${permissionId}`,
            action: 'blocked',
            timestamp: new Date(),
            context
          });
          return false;
        }
      }

      this.audit(pluginId, 'permission-check', permissionId, 'allowed', context);
      return true;

    } catch (error) {
      this.reportViolation({
        pluginId,
        type: 'permission',
        severity: 'high',
        description: `İzin kontrolü hatası: ${error}`,
        action: 'blocked',
        timestamp: new Date(),
        context: { error: error?.toString() }
      });
      return false;
    }
  }

  /**
   * API çağrısı güvenlik kontrolü
   */
  checkAPIAccess(pluginId: string, apiName: string, args?: any[]): boolean {
    try {
      const policies = this.getApplicablePolicies(pluginId);
      
      for (const policy of policies) {
        for (const rule of policy.rules) {
          if (rule.type === 'api' && new RegExp(rule.pattern).test(apiName)) {
            if (rule.action === 'deny') {
              this.reportViolation({
                pluginId,
                type: 'api',
                severity: 'high',
                description: `Yasaklanmış API erişimi: ${apiName}`,
                action: 'blocked',
                timestamp: new Date(),
                context: { apiName, args }
              });
              return false;
            }
            
            if (rule.action === 'prompt') {
              const userConsent = this.promptUserForConsent(pluginId, apiName);
              if (!userConsent) {
                this.audit(pluginId, 'api-access-denied', apiName, 'denied', { reason: 'user-declined' });
                return false;
              }
            }
          }
        }
      }

      this.audit(pluginId, 'api-access', apiName, 'allowed', { args });
      return true;

    } catch (error) {
      console.error(`API güvenlik kontrolü hatası (${pluginId}):`, error);
      return false;
    }
  }

  /**
   * Kaynak erişim güvenlik kontrolü
   */
  checkResourceAccess(pluginId: string, resourceType: string, resource: string): boolean {
    try {
      const policies = this.getApplicablePolicies(pluginId);
      
      for (const policy of policies) {
        for (const rule of policy.rules) {
          if (rule.type === 'resource' && new RegExp(rule.pattern).test(resourceType)) {
            if (rule.action === 'deny') {
              this.reportViolation({
                pluginId,
                type: 'resource',
                severity: 'medium',
                description: `Yasaklanmış kaynak erişimi: ${resourceType}`,
                action: 'blocked',
                timestamp: new Date(),
                context: { resourceType, resource }
              });
              return false;
            }
          }
        }
      }

      // Özel izin kontrolü
      const requiredPermission = this.getRequiredPermissionForResource(resourceType);
      if (requiredPermission && !this.checkPermission(pluginId, requiredPermission)) {
        return false;
      }

      this.audit(pluginId, 'resource-access', resourceType, 'allowed', { resource });
      return true;

    } catch (error) {
      console.error(`Kaynak güvenlik kontrolü hatası (${pluginId}):`, error);
      return false;
    }
  }

  /**
   * Plugin davranış analizi
   */
  analyzeBehavior(pluginId: string, behavior: any): void {
    // Şüpheli davranış tespiti
    const suspiciousPatterns = [
      /document\.cookie/,
      /localStorage\.clear/,
      /eval\(/,
      /Function\(/,
      /window\.location/
    ];

    const behaviorStr = JSON.stringify(behavior);
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(behaviorStr)) {
        this.reportViolation({
          pluginId,
          type: 'behavior',
          severity: 'high',
          description: `Şüpheli davranış tespit edildi: ${pattern.source}`,
          action: 'blocked',
          timestamp: new Date(),
          context: { behavior, pattern: pattern.source }
        });
      }
    }
  }

  /**
   * Güvenlik politikası ekle
   */
  addSecurityPolicy(policy: SecurityPolicy): void {
    this.securityPolicies.set(policy.id, policy);
    console.log(`Güvenlik politikası eklendi: ${policy.name}`);
  }

  /**
   * Güvenlik politikası kaldır
   */
  removeSecurityPolicy(policyId: string): void {
    this.securityPolicies.delete(policyId);
    console.log(`Güvenlik politikası kaldırıldı: ${policyId}`);
  }

  /**
   * Plugin için geçerli politikaları al
   */
  private getApplicablePolicies(pluginId: string): SecurityPolicy[] {
    return Array.from(this.securityPolicies.values()).filter(policy => {
      // Plugin, politika istisnalarında mı?
      return !policy.exceptions.includes(pluginId);
    });
  }

  /**
   * Kaynak türü için gerekli izni al
   */
  private getRequiredPermissionForResource(resourceType: string): string | null {
    const resourcePermissionMap: Record<string, string> = {
      'localStorage': 'storage',
      'sessionStorage': 'storage',
      'fetch': 'network',
      'XMLHttpRequest': 'network',
      'navigator.geolocation': 'location',
      'navigator.mediaDevices': 'camera',
      'getUserMedia': 'microphone'
    };

    return resourcePermissionMap[resourceType] || null;
  }

  /**
   * Kullanıcı onayı al (basit implementasyon)
   */
  private getUserConsent(pluginId: string, permissionId: string): boolean {
    // Production'da gerçek bir kullanıcı arayüzü olacak
    return confirm(`${pluginId} eklentisi "${permissionId}" iznini kullanmak istiyor. İzin veriyor musunuz?`);
  }

  /**
   * Kullanıcıdan API erişimi için onay iste
   */
  private promptUserForConsent(pluginId: string, apiName: string): boolean {
    return confirm(`${pluginId} eklentisi "${apiName}" API'sine erişmek istiyor. İzin veriyor musunuz?`);
  }

  /**
   * Güvenlik ihlali rapor et
   */
  private reportViolation(violation: SecurityViolation): void {
    this.violations.push(violation);
    this.violationSubject.next(violation);
    
    console.warn(`Güvenlik ihlali:`, violation);

    // Kritik ihlallerde plugin'i durdur
    if (violation.severity === 'critical') {
      this.handleCriticalViolation(violation);
    }
  }

  /**
   * Kritik güvenlik ihlalini işle
   */
  private handleCriticalViolation(violation: SecurityViolation): void {
    console.error(`Kritik güvenlik ihlali, plugin durduruluyor:`, violation);
    // Plugin manager'a plugin durdurma sinyali gönder
  }

  /**
   * Güvenlik denetim kaydı oluştur
   */
  private audit(
    pluginId: string, 
    action: string, 
    resource: string, 
    result: 'allowed' | 'denied' | 'prompted',
    metadata?: Record<string, any>
  ): void {
    const auditLog: SecurityAuditLog = {
      id: crypto.randomUUID(),
      pluginId,
      action,
      resource,
      result,
      timestamp: new Date(),
      metadata
    };

    this.auditLogs.push(auditLog);
    this.auditSubject.next(auditLog);

    // Audit log boyutu kontrolü
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-5000); // Son 5000 kaydı tut
    }
  }

  /**
   * Güvenlik istatistikleri al
   */
  getSecurityStats() {
    const violationsByType = this.violations.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const violationsBySeverity = this.violations.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalViolations: this.violations.length,
      violationsByType,
      violationsBySeverity,
      totalAuditLogs: this.auditLogs.length,
      activePolicies: this.securityPolicies.size,
      lastUpdate: new Date()
    };
  }

  /**
   * Güvenlik raporunu al
   */
  getSecurityReport(pluginId?: string) {
    const violations = pluginId 
      ? this.violations.filter(v => v.pluginId === pluginId)
      : this.violations;
    
    const auditLogs = pluginId
      ? this.auditLogs.filter(log => log.pluginId === pluginId)
      : this.auditLogs;

    return {
      violations: violations.slice(-100), // Son 100 ihlal
      auditLogs: auditLogs.slice(-1000), // Son 1000 audit log
      stats: this.getSecurityStats(),
      policies: Array.from(this.securityPolicies.values()),
      generatedAt: new Date()
    };
  }

  /**
   * Güvenlik verilerini temizle
   */
  clearSecurityData(pluginId?: string): void {
    if (pluginId) {
      this.violations = this.violations.filter(v => v.pluginId !== pluginId);
      this.auditLogs = this.auditLogs.filter(log => log.pluginId !== pluginId);
      this.pluginPermissions.delete(pluginId);
    } else {
      this.violations = [];
      this.auditLogs = [];
      this.pluginPermissions.clear();
    }
  }
}