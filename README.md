# 🧠 CogUI - Bilişsel Uyumlu UI Toolkit

CogUI, nöro-çeşitli kullanıcılar için bilişsel yükü azaltan, kişiselleştirilebilir ve erişilebilir UI bileşenleri sunan açık kaynak toolkit'idir. Kullanıcıların bilişsel durumlarını gerçek zamanlı olarak analiz ederek UI'yi otomatik olarak adapte eder.

## ✨ Özellikler

### 🎨 Adaptif Tema Sistemi
- **Otomatik Tema Seçimi**: Kullanıcı tercihlerine göre tema otomatiği
- **Yüksek Kontrast Desteği**: WCAG AAA uyumluluğu
- **Disleksi Dostu**: OpenDyslexic font desteği
- **Karanlık/Açık Mod**: Sistem tercihi ile senkronizasyon

### 🧠 Bilişsel Analiz
- **Mouse Tracking**: Hareket analizi ile motor zorluk tespiti
- **Dikkat Analizi**: Odaklanma süresi ve görev değişim analizi
- **Bilişsel Yük Tespiti**: Otomatik UI basitleştirme
- **Yorgunluk Analizi**: Adaptif yardım önerileri

### ♿ Erişilebilirlik Öncelikli
- **WCAG 2.1 AA/AAA Uyumluluğu**
- **Screen Reader Desteği**
- **Klavye Navigasyonu**
- **Odak Yönetimi**
- **Reduced Motion Desteği**

### 🔧 Modüler Yapı
- **React Components**: Modern React hooks ile
- **TypeScript**: Tam tip güvenliği
- **CSS-in-JS**: Emotion ile dinamik stillendirme
- **RxJS**: Reaktif sensor data streams

## 🚀 Hızlı Başlangıç

### Kurulum

```bash
npm install @cogui/core
# Sensör özellikleri için
npm install @cogui/sensors
```

### Temel Kullanım

```tsx
import React from 'react';
import { CogUIProvider, Button, Input } from '@cogui/core';

function App() {
  return (
    <CogUIProvider>
      <div>
        <Button variant="primary" size="md">
          Erişilebilir Buton
        </Button>
        
        <Input 
          label="Ad Soyad"
          placeholder="Adınızı girin"
          required
        />
      </div>
    </CogUIProvider>
  );
}
```

### Sensör Entegrasyonu

```tsx
import { useSensorManager, useMouseTracking } from '@cogui/sensors';

function MyComponent() {
  const { startSession, getRecommendations } = useSensorManager();
  const { metrics, startTracking } = useMouseTracking();

  React.useEffect(() => {
    startSession();
    startTracking();
  }, []);

  return (
    <div>
      {metrics && (
        <p>Mouse Hızı: {metrics.averageSpeed.toFixed(2)} px/ms</p>
      )}
    </div>
  );
}
```

## 📦 Paketler

### @cogui/core
Ana UI bileşenleri ve tema sistemi:
- `CogUIProvider` - Ana provider
- `Button` - Adaptif buton bileşeni
- `Input` - Akıllı input bileşeni
- `useTheme`, `useAccessibility` hooks

### @cogui/sensors
Sensor entegrasyonu ve analiz:
- `MouseTracker` - Mouse hareketleri analizi
- `AttentionTracker` - Dikkat ve odaklanma analizi
- `SensorManager` - Merkezi sensor yönetimi

## 🎯 Kullanım Senaryoları

### 1. Eğitim Platformları
```tsx
// Öğrenci zorlandığında otomatik yardım
const { needsSimplification } = useAdaptiveUI();

return needsSimplification ? (
  <SimplifiedQuiz />
) : (
  <DetailedQuiz />
);
```

### 2. E-ticaret Siteleri
```tsx
// Motor zorluk tespit edildiğinde hedef boyutları büyütme
const { needsLargerTargets } = useAccessibility();

return (
  <Button size={needsLargerTargets ? "lg" : "md"}>
    Sepete Ekle
  </Button>
);
```

### 3. Kurumsal Uygulamalar
```tsx
// Yüksek bilişsel yük durumunda UI basitleştirme
const { cognitiveState } = useAdaptiveUI();

return cognitiveState?.cognitiveLoad === 'high' ? (
  <SimpleNavigation />
) : (
  <FullNavigation />
);
```

## 🔧 Konfigürasyon

### Tema Kustomizasyonu

```tsx
import { defaultTheme } from '@cogui/core';

const customTheme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    primary: '#your-color',
  }
};

<CogUIProvider initialTheme={customTheme}>
  <App />
</CogUIProvider>
```

### Sensör Ayarları

```tsx
const sensorConfig = {
  enableMouseTracking: true,
  enableAttentionTracking: true,
  mouseTrackingSampleRate: 50, // ms
  hesitationThreshold: 200, // ms
};

<CogUIProvider>
  <SensorManager config={sensorConfig}>
    <App />
  </SensorManager>
</CogUIProvider>
```

## 📊 Metrikler ve Analiz

CogUI aşağıdaki metrikleri real-time olarak toplar:

### Mouse Metrikleri
- **Hareket Düzgünlüğü** (0-1): Tremor ve titreme tespiti
- **Click Doğruluğu** (0-1): Hedef isabetle oranı
- **Hesitation Count**: Kararsızlık anları
- **Ortalama Hız**: px/ms cinsinden

### Dikkat Metrikleri
- **Ortalama Odaklanma Süresi**: ms cinsinden
- **Görev Değişim Sıklığı**: dakika başına
- **Dikkat Kararlılığı** (0-1): Konsantrasyon seviyesi
- **Engagement Score** (0-1): Katılım puanı

### Bilişsel Durum
- **Cognitive Load**: low/medium/high
- **Attention Level**: low/medium/high  
- **Fatigue Level**: low/medium/high
- **Stress Level**: low/medium/high

## 🤝 Katkıda Bulunma

CogUI açık kaynaklı bir projedir ve katkılarınızı bekliyoruz!

### Geliştirme Kurulumu

```bash
# Repository'yi klonlayın
git clone https://github.com/cogui/cogui-toolkit.git
cd cogui-toolkit

# Bağımlılıkları yükleyin
yarn install

# Geliştirme sunucusunu başlatın
yarn dev

# Storybook'u çalıştırın
yarn storybook
```

### Katkı Rehberi

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📚 Dokümantasyon

- **[API Reference](./docs/api.md)** - Tüm bileşen ve hook'lar
- **[Theme Guide](./docs/theming.md)** - Tema sistemi rehberi
- **[Accessibility Guide](./docs/accessibility.md)** - Erişilebilirlik rehberi
- **[Sensor Integration](./docs/sensors.md)** - Sensör entegrasyon kılavuzu
- **[Examples](./examples/)** - Kullanım örnekleri

## 🧪 Test Etme

```bash
# Tüm testleri çalıştır
yarn test

# Test coverage
yarn test:coverage

# E2E testler
yarn test:e2e
```

## 📈 Roadmap

### v0.1.0 (Mevcut)
- ✅ Temel UI bileşenleri (Button, Input)
- ✅ Tema sistemi
- ✅ Mouse ve dikkat tracking
- ✅ Temel adaptasyon

### v0.2.0 (Gelecek)
- [ ] Card, Modal, Navigation bileşenleri
- [ ] Göz takibi entegrasyonu
- [ ] Makine öğrenmesi modeli
- [ ] A/B testing desteği

### v1.0.0 (Hedef)
- [ ] Tam bileşen kütüphanesi
- [ ] Gelişmiş AI analizi
- [ ] Enterprise özellikler
- [ ] İstatistik dashboard'u

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 🙏 Teşekkürler

CogUI, nöro-çeşitli kullanıcıların dijital deneyimlerini iyileştirmek için çalışan araştırmacılar, geliştiriciler ve aktivistlerin katkılarıyla geliştirilmiştir.

### Inspirasyon
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Inclusive Design Principles](https://inclusivedesignprinciples.org/)
- [Cognitive Accessibility Research](https://www.w3.org/WAI/cognitive/)

---

**CogUI ile herkes için daha erişilebilir bir web! 🌟**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![npm version](https://badge.fury.io/js/@cogui%2Fcore.svg)](https://badge.fury.io/js/@cogui%2Fcore)
[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![Accessibility](https://img.shields.io/badge/a11y-WCAG%202.1%20AAA-green)](https://www.w3.org/WAI/WCAG21/Understanding/)