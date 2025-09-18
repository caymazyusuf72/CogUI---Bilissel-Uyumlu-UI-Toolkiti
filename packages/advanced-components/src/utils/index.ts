import * as d3 from 'd3';

/**
 * Advanced Components Utility Functions
 * D3.js yardımcıları, performans optimizasyonları ve genel araçlar
 */

// D3.js Scale Utilities
export const createScale = {
  /**
   * Linear scale oluşturucu
   */
  linear: (domain: [number, number], range: [number, number]) => {
    return d3.scaleLinear()
      .domain(domain)
      .range(range)
      .nice();
  },

  /**
   * Band scale oluşturucu (bar charts için)
   */
  band: (domain: string[], range: [number, number], padding: number = 0.1) => {
    return d3.scaleBand()
      .domain(domain)
      .range(range)
      .padding(padding);
  },

  /**
   * Time scale oluşturucu
   */
  time: (domain: [Date, Date], range: [number, number]) => {
    return d3.scaleTime()
      .domain(domain)
      .range(range);
  },

  /**
   * Color scale oluşturucu
   */
  color: (domain: string[], scheme: string[] = d3.schemeCategory10) => {
    return d3.scaleOrdinal<string>()
      .domain(domain)
      .range(scheme);
  }
};

// Data Processing Utilities
export const dataUtils = {
  /**
   * CSV data'yı parse et
   */
  parseCSV: (csvText: string) => {
    return d3.csvParse(csvText);
  },

  /**
   * JSON data'yı normalize et
   */
  normalizeData: (data: any[], keyMap: Record<string, string>) => {
    return data.map(item => {
      const normalized: any = {};
      Object.entries(keyMap).forEach(([oldKey, newKey]) => {
        if (item[oldKey] !== undefined) {
          normalized[newKey] = item[oldKey];
        }
      });
      return normalized;
    });
  },

  /**
   * Data'yı gruplama
   */
  groupBy: <T>(data: T[], key: keyof T) => {
    return d3.group(data, (d: T) => d[key]);
  },

  /**
   * Data'yı rollup (aggregate)
   */
  rollup: <T>(
    data: T[], 
    aggregateFunc: (values: T[]) => number,
    groupKey: keyof T
  ) => {
    return d3.rollup(data, aggregateFunc, (d: T) => d[groupKey]);
  },

  /**
   * Data'yı sıralama
   */
  sortBy: <T>(data: T[], key: keyof T, ascending: boolean = true) => {
    const sorted = [...data].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return ascending ? aVal - bVal : bVal - aVal;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return ascending 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return 0;
    });
    
    return sorted;
  }
};

// Animation Utilities
export const animationUtils = {
  /**
   * Easing fonksiyonları
   */
  easing: {
    linear: d3.easeLinear,
    quadIn: d3.easeQuadIn,
    quadOut: d3.easeQuadOut,
    quadInOut: d3.easeQuadInOut,
    cubicIn: d3.easeCubicIn,
    cubicOut: d3.easeCubicOut,
    cubicInOut: d3.easeCubicInOut,
    bounce: d3.easeBounce,
    elastic: d3.easeElastic
  },

  /**
   * Transition oluşturucu
   */
  createTransition: (
    duration: number = 750,
    delay: number = 0,
    ease = d3.easeQuadInOut
  ) => {
    return d3.transition()
      .duration(duration)
      .delay(delay)
      .ease(ease);
  },

  /**
   * Staggered transition
   */
  staggerTransition: (
    selection: d3.Selection<any, any, any, any>,
    duration: number = 750,
    staggerDelay: number = 50
  ) => {
    return selection
      .transition()
      .duration(duration)
      .delay((_, i) => i * staggerDelay);
  }
};

// Chart Utilities
export const chartUtils = {
  /**
   * Margin convention uygula
   */
  applyMargin: (
    width: number,
    height: number,
    margin: { top: number; right: number; bottom: number; left: number }
  ) => {
    return {
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
      transform: `translate(${margin.left}, ${margin.top})`
    };
  },

  /**
   * Responsive boyutlar hesapla
   */
  calculateResponsiveDimensions: (
    container: HTMLElement,
    aspectRatio: number = 16/9,
    maxWidth?: number
  ) => {
    const containerWidth = container.clientWidth;
    const width = maxWidth ? Math.min(containerWidth, maxWidth) : containerWidth;
    const height = width / aspectRatio;
    
    return { width, height };
  },

  /**
   * Tick formatları
   */
  formatters: {
    number: (value: number, decimals: number = 0) => {
      return d3.format(`,.${decimals}f`)(value);
    },
    
    currency: (value: number, currency: string = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
      }).format(value);
    },
    
    percentage: (value: number, decimals: number = 1) => {
      return d3.format(`.${decimals}%`)(value);
    },
    
    date: (value: Date, format: string = '%Y-%m-%d') => {
      return d3.timeFormat(format)(value);
    },
    
    shortDate: d3.timeFormat('%m/%d'),
    longDate: d3.timeFormat('%B %d, %Y'),
    time: d3.timeFormat('%H:%M'),
    
    compactNumber: (value: number) => {
      if (value >= 1e9) return d3.format('.1s')(value);
      if (value >= 1e6) return d3.format('.1s')(value);
      if (value >= 1e3) return d3.format('.1s')(value);
      return d3.format(',')(value);
    }
  },

  /**
   * Axis helper
   */
  createAxis: {
    bottom: (scale: any, tickCount?: number, tickFormat?: any) => {
      const axis = d3.axisBottom(scale);
      if (tickCount) axis.ticks(tickCount);
      if (tickFormat) axis.tickFormat(tickFormat);
      return axis;
    },
    
    left: (scale: any, tickCount?: number, tickFormat?: any) => {
      const axis = d3.axisLeft(scale);
      if (tickCount) axis.ticks(tickCount);
      if (tickFormat) axis.tickFormat(tickFormat);
      return axis;
    }
  }
};

// Performance Utilities
export const performanceUtils = {
  /**
   * Debounce fonksiyonu
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  },

  /**
   * Throttle fonksiyonu
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let isThrottled = false;
    
    return (...args: Parameters<T>) => {
      if (!isThrottled) {
        func.apply(null, args);
        isThrottled = true;
        setTimeout(() => {
          isThrottled = false;
        }, delay);
      }
    };
  },

  /**
   * RAF ile optimize edilmiş güncelleme
   */
  rafThrottle: <T extends (...args: any[]) => any>(func: T) => {
    let rafId: number | null = null;
    
    return (...args: Parameters<T>) => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          func.apply(null, args);
          rafId = null;
        });
      }
    };
  },

  /**
   * Memory-efficient data updates
   */
  updateDataEfficiently: (
    oldData: any[],
    newData: any[],
    keyField: string = 'id'
  ) => {
    const oldMap = new Map(oldData.map(d => [d[keyField], d]));
    const newMap = new Map(newData.map(d => [d[keyField], d]));
    
    const added = newData.filter(d => !oldMap.has(d[keyField]));
    const removed = oldData.filter(d => !newMap.has(d[keyField]));
    const updated = newData.filter(d => {
      const old = oldMap.get(d[keyField]);
      return old && JSON.stringify(old) !== JSON.stringify(d);
    });
    
    return { added, removed, updated };
  }
};

// Color Utilities
export const colorUtils = {
  /**
   * Renk paletleri
   */
  palettes: {
    categorical: d3.schemeCategory10,
    blues: d3.schemeBlues[9],
    greens: d3.schemeGreens[9],
    reds: d3.schemeReds[9],
    oranges: d3.schemeOranges[9],
    purples: d3.schemePurples[9],
    viridis: d3.schemeViridis,
    plasma: d3.schemePlasma,
    inferno: d3.schemeInferno
  },

  /**
   * Renk interpolasyonu
   */
  interpolateColor: (color1: string, color2: string, t: number) => {
    return d3.interpolate(color1, color2)(t);
  },

  /**
   * Hex to RGB
   */
  hexToRgb: (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },

  /**
   * RGB to Hex
   */
  rgbToHex: (r: number, g: number, b: number) => {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  },

  /**
   * Renk parlaklığı hesapla
   */
  getBrightness: (color: string) => {
    const rgb = colorUtils.hexToRgb(color);
    if (!rgb) return 0;
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  },

  /**
   * Kontrast rengi öner (beyaz/siyah)
   */
  getContrastColor: (backgroundColor: string) => {
    return colorUtils.getBrightness(backgroundColor) > 128 ? '#000000' : '#ffffff';
  }
};

// Accessibility Utilities
export const a11yUtils = {
  /**
   * ARIA etiketleri oluştur
   */
  createAriaLabels: (data: any[], labelField: string, valueField: string) => {
    return data.map((d, i) => ({
      ...d,
      'aria-label': `${d[labelField]}: ${d[valueField]}`,
      'aria-describedby': `chart-description-${i}`,
      'tabindex': 0
    }));
  },

  /**
   * Keyboard navigation desteği
   */
  addKeyboardNavigation: (
    selection: d3.Selection<any, any, any, any>,
    onEnter?: (d: any, i: number) => void,
    onArrowKey?: (direction: 'up' | 'down' | 'left' | 'right') => void
  ) => {
    selection.on('keydown', function(event, d) {
      const i = selection.nodes().indexOf(this);
      
      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          onEnter?.(d, i);
          break;
        case 'ArrowUp':
          event.preventDefault();
          onArrowKey?.('up');
          break;
        case 'ArrowDown':
          event.preventDefault();
          onArrowKey?.('down');
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onArrowKey?.('left');
          break;
        case 'ArrowRight':
          event.preventDefault();
          onArrowKey?.('right');
          break;
      }
    });
  }
};

export default {
  createScale,
  dataUtils,
  animationUtils,
  chartUtils,
  performanceUtils,
  colorUtils,
  a11yUtils
};