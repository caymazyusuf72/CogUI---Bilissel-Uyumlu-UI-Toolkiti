import { PluginManifest, ValidationResult, ValidationError, ValidationWarning, PluginDependency } from '../types';

/**
 * Plugin Validator - Plugin doğrulama ve validasyon sistemi
 * Plugin'lerin güvenlik, uyumluluk ve kalite standartlarına uygunluğunu kontrol eder
 */
export class PluginValidator {
  private validationRules: ValidationRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Varsayılan validasyon kurallarını başlat
   */
  private initializeDefaultRules(): void {
    this.validationRules = [
      // Manifest validasyon kuralları
      {
        id: 'manifest-required-fields',
        name: 'Gerekli Alan Kontrolü',
        type: 'error',
        check: (manifest: PluginManifest) => {
          const requiredFields = ['name', 'version', 'author', 'description', 'license', 'main', 'cogui'];
          const missing = requiredFields.filter(field => !manifest[field as keyof PluginManifest]);
          
          return {
            valid: missing.length === 0,
            message: missing.length > 0 ? `Eksik gerekli alanlar: ${missing.join(', ')}` : '',
            suggestion: 'Tüm gerekli alanları manifest dosyasına ekleyin'
          };
        }
      },
      
      {
        id: 'version-format',
        name: 'Versiyon Format Kontrolü',
        type: 'error',
        check: (manifest: PluginManifest) => {
          const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/;
          const isValid = semverRegex.test(manifest.version);
          
          return {
            valid: isValid,
            message: isValid ? '' : `Geçersiz versiyon formatı: ${manifest.version}`,
            suggestion: 'Semantic versioning formatını kullanın (örn: 1.0.0)'
          };
        }
      },

      {
        id: 'cogui-compatibility',
        name: 'CogUI Uyumluluk Kontrolü',
        type: 'error',
        check: (manifest: PluginManifest) => {
          const coguiVersion = manifest.cogui;
          if (typeof coguiVersion !== 'string' || !coguiVersion) {
            return {
              valid: false,
              message: 'CogUI versiyon bilgisi eksik',
              suggestion: 'manifest.cogui alanını ekleyin'
            };
          }
          
          // CogUI versiyon uyumluluğu kontrolü
          const currentVersion = '1.0.0';
          const isCompatible = this.isVersionCompatible(currentVersion, coguiVersion);
          
          return {
            valid: isCompatible,
            message: isCompatible ? '' : `CogUI versiyon uyumsuzluğu: ${coguiVersion}`,
            suggestion: 'Desteklenen CogUI versiyonunu kullanın'
          };
        }
      },

      {
        id: 'entry-point-check',
        name: 'Giriş Noktası Kontrolü',
        type: 'error',
        check: (manifest: PluginManifest) => {
          const main = manifest.main;
          const isValid = main && (main.endsWith('.js') || main.endsWith('.ts') || main.endsWith('.tsx'));
          
          return {
            valid: !!isValid,
            message: isValid ? '' : `Geçersiz giriş noktası: ${main}`,
            suggestion: 'JavaScript/TypeScript dosya uzantısı kullanın (.js, .ts, .tsx)'
          };
        }
      },

      // İzin validasyon kuralları
      {
        id: 'permission-limit',
        name: 'İzin Limiti Kontrolü',
        type: 'warning',
        check: (manifest: PluginManifest) => {
          const permissions = manifest.permissions || [];
          const maxPermissions = 15;
          const isValid = permissions.length <= maxPermissions;
          
          return {
            valid: isValid,
            message: isValid ? '' : `Çok fazla izin isteniyor: ${permissions.length}`,
            suggestion: `Maksimum ${maxPermissions} izin kullanın`
          };
        }
      },

      {
        id: 'sensitive-permissions',
        name: 'Hassas İzin Kontrolü',
        type: 'warning',
        check: (manifest: PluginManifest) => {
          const permissions = manifest.permissions || [];
          const sensitivePermissions = ['camera', 'microphone', 'location', 'files', 'system'];
          
          const hasSensitive = permissions.some(p => 
            sensitivePermissions.includes(p.scope?.[0] || '')
          );
          
          return {
            valid: !hasSensitive, // Warning olduğu için valid false
            message: hasSensitive ? 'Hassas izinler tespit edildi' : '',
            suggestion: 'Hassas izinler için gerekçe belirtin ve kullanıcı onayı alın'
          };
        }
      },

      // Bağımlılık validasyon kuralları
      {
        id: 'dependency-limit',
        name: 'Bağımlılık Limiti Kontrolü',
        type: 'warning',
        check: (manifest: PluginManifest) => {
          const dependencies = manifest.dependencies || [];
          const maxDependencies = 10;
          const isValid = dependencies.length <= maxDependencies;
          
          return {
            valid: isValid,
            message: isValid ? '' : `Çok fazla bağımlılık: ${dependencies.length}`,
            suggestion: `Maksimum ${maxDependencies} bağımlılık kullanın`
          };
        }
      },

      {
        id: 'circular-dependency',
        name: 'Döngüsel Bağımlılık Kontrolü',
        type: 'error',
        check: (manifest: PluginManifest) => {
          // Bu kontrolü DependencyResolver ile entegre edilmeli
          return {
            valid: true,
            message: '',
            suggestion: ''
          };
        }
      },

      // Güvenlik validasyon kuralları
      {
        id: 'suspicious-code-patterns',
        name: 'Şüpheli Kod Pattern Kontrolü',
        type: 'error',
        check: (manifest: PluginManifest) => {
          // Bu kontrolü kod analizi ile yapılmalı
          const suspiciousPatterns = [
            'eval(',
            'Function(',
            'document.cookie',
            'localStorage.clear()',
            'sessionStorage.clear()'
          ];
          
          // Manifest içinde şüpheli pattern kontrolü
          const manifestStr = JSON.stringify(manifest);
          const foundPatterns = suspiciousPatterns.filter(pattern => 
            manifestStr.includes(pattern)
          );
          
          return {
            valid: foundPatterns.length === 0,
            message: foundPatterns.length > 0 ? 
              `Şüpheli kod pattern'leri: ${foundPatterns.join(', ')}` : '',
            suggestion: 'Güvenli kod pratiklerini kullanın'
          };
        }
      },

      // Kalite kontrol kuralları
      {
        id: 'description-length',
        name: 'Açıklama Uzunluk Kontrolü',
        type: 'warning',
        check: (manifest: PluginManifest) => {
          const description = manifest.description;
          const minLength = 20;
          const maxLength = 500;
          const isValid = description.length >= minLength && description.length <= maxLength;
          
          return {
            valid: isValid,
            message: !isValid ? 
              `Açıklama uzunluğu: ${description.length} karakter` : '',
            suggestion: `Açıklama ${minLength}-${maxLength} karakter arasında olmalı`
          };
        }
      },

      {
        id: 'keywords-check',
        name: 'Anahtar Kelime Kontrolü',
        type: 'warning',
        check: (manifest: PluginManifest) => {
          const keywords = manifest.keywords || [];
          const minKeywords = 3;
          const maxKeywords = 10;
          const isValid = keywords.length >= minKeywords && keywords.length <= maxKeywords;
          
          return {
            valid: isValid,
            message: !isValid ? 
              `Anahtar kelime sayısı: ${keywords.length}` : '',
            suggestion: `${minKeywords}-${maxKeywords} anahtar kelime kullanın`
          };
        }
      }
    ];
  }

  /**
   * Plugin manifest validasyonu
   */
  async validateManifest(manifest: PluginManifest): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let score = 100;

    for (const rule of this.validationRules) {
      try {
        const result = rule.check(manifest);
        
        if (!result.valid) {
          if (rule.type === 'error') {
            errors.push({
              code: rule.id,
              message: result.message,
              severity: 'high',
              path: `manifest.${rule.id}`,
              suggestion: result.suggestion
            });
            score -= 15; // Error için büyük puan kaybı
          } else {
            warnings.push({
              code: rule.id,
              message: result.message,
              path: `manifest.${rule.id}`,
              suggestion: result.suggestion
            });
            score -= 5; // Warning için küçük puan kaybı
          }
        }
      } catch (error) {
        console.error(`Validation rule error (${rule.id}):`, error);
        errors.push({
          code: 'validation-error',
          message: `Validasyon kuralı hatası: ${rule.id}`,
          severity: 'medium',
          suggestion: 'Lütfen destek ekibi ile iletişime geçin'
        });
      }
    }

    // Ek özel kontroller
    await this.performAdditionalChecks(manifest, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score)
    };
  }

  /**
   * Ek özel kontroller
   */
  private async performAdditionalChecks(
    manifest: PluginManifest,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Bağımlılık versiyon kontrolü
    this.validateDependencyVersions(manifest, errors, warnings);
    
    // Uyumluluk kontrolü
    this.validateCompatibility(manifest, errors, warnings);
    
    // Lisans kontrolü
    this.validateLicense(manifest, errors, warnings);
  }

  /**
   * Bağımlılık versiyon validasyonu
   */
  private validateDependencyVersions(
    manifest: PluginManifest,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const dependencies = manifest.dependencies || [];
    
    for (const dep of dependencies) {
      if (!this.isValidVersionRange(dep.version)) {
        errors.push({
          code: 'invalid-dependency-version',
          message: `Geçersiz bağımlılık versiyonu: ${dep.name}@${dep.version}`,
          severity: 'medium',
          path: `dependencies.${dep.id}`,
          suggestion: 'Geçerli semver aralığı kullanın (örn: ^1.0.0, ~2.1.0)'
        });
      }
    }
  }

  /**
   * Uyumluluk validasyonu
   */
  private validateCompatibility(
    manifest: PluginManifest,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const compatibility = manifest.compatibility;
    if (!compatibility) {
      warnings.push({
        code: 'missing-compatibility',
        message: 'Uyumluluk bilgisi eksik',
        path: 'compatibility',
        suggestion: 'Tarayıcı, cihaz ve işletim sistemi uyumluluğunu belirtin'
      });
      return;
    }

    // Tarayıcı uyumluluğu kontrolü
    if (!compatibility.browsers || compatibility.browsers.length === 0) {
      warnings.push({
        code: 'missing-browser-compatibility',
        message: 'Tarayıcı uyumluluk bilgisi eksik',
        path: 'compatibility.browsers',
        suggestion: 'Desteklenen tarayıcıları belirtin'
      });
    }
  }

  /**
   * Lisans validasyonu
   */
  private validateLicense(
    manifest: PluginManifest,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const license = manifest.license;
    const validLicenses = [
      'MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'ISC',
      'GPL-2.0', 'LGPL-3.0', 'AGPL-3.0', 'Unlicense', 'BSD-2-Clause'
    ];

    if (!validLicenses.includes(license)) {
      warnings.push({
        code: 'unknown-license',
        message: `Bilinmeyen lisans: ${license}`,
        path: 'license',
        suggestion: 'Standart OSI onaylı lisans kullanın'
      });
    }
  }

  /**
   * Versiyon uyumluluğu kontrolü
   */
  private isVersionCompatible(current: string, required: string): boolean {
    try {
      // Basit uyumluluk kontrolü
      if (required === '*' || required === 'latest') {
        return true;
      }

      // Range kontrolü için semver kütüphanesi kullanılmalı
      return true; // Şimdilik tümü uyumlu
    } catch {
      return false;
    }
  }

  /**
   * Versiyon aralığı validasyonu
   */
  private isValidVersionRange(version: string): boolean {
    if (!version) return false;
    
    // Geçerli semver pattern'leri
    const validPatterns = [
      /^\d+\.\d+\.\d+$/, // Exact version: 1.0.0
      /^\^\d+\.\d+\.\d+$/, // Caret range: ^1.0.0
      /^~\d+\.\d+\.\d+$/, // Tilde range: ~1.0.0
      /^>=\d+\.\d+\.\d+$/, // Greater than or equal: >=1.0.0
      /^>\d+\.\d+\.\d+$/, // Greater than: >1.0.0
      /^<=\d+\.\d+\.\d+$/, // Less than or equal: <=1.0.0
      /^<\d+\.\d+\.\d+$/, // Less than: <1.0.0
      /^\*$/, // Any version: *
      /^latest$/ // Latest version
    ];

    return validPatterns.some(pattern => pattern.test(version));
  }

  /**
   * Özel validasyon kuralı ekle
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
  }

  /**
   * Validasyon kuralını kaldır
   */
  removeValidationRule(ruleId: string): void {
    this.validationRules = this.validationRules.filter(rule => rule.id !== ruleId);
  }

  /**
   * Validasyon istatistikleri
   */
  getValidationStats() {
    const rulesByType = this.validationRules.reduce((acc, rule) => {
      acc[rule.type] = (acc[rule.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRules: this.validationRules.length,
      rulesByType,
      lastUpdate: new Date()
    };
  }

  /**
   * Plugin validasyonu (PluginManager uyumluluğu için)
   */
  async validate(pluginData: any): Promise<ValidationResult> {
    if (pluginData.manifest) {
      return await this.validateManifest(pluginData.manifest);
    }
    
    return {
      valid: false,
      errors: [{
        code: 'no-manifest',
        message: 'Plugin manifest bulunamadı',
        severity: 'critical',
        suggestion: 'Plugin manifest dosyasını ekleyin'
      }],
      warnings: [],
      score: 0
    };
  }
}

interface ValidationRule {
  id: string;
  name: string;
  type: 'error' | 'warning';
  check: (manifest: PluginManifest) => {
    valid: boolean;
    message: string;
    suggestion: string;
  };
}