import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface VirtualizedListProps<T> {
  data: T[];
  itemHeight: number | ((item: T, index: number) => number);
  containerHeight: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  onScroll?: (scrollTop: number) => void;
  overscan?: number;
  className?: string;
  style?: React.CSSProperties;
  scrollToIndex?: number;
  onItemsRendered?: (startIndex: number, endIndex: number) => void;
}

/**
 * VirtualizedList - Yüksek performanslı sanal liste bileşeni
 * Binlerce öğe için optimize edilmiş rendering
 */
export function VirtualizedList<T>({
  data,
  itemHeight,
  containerHeight,
  renderItem,
  onScroll,
  overscan = 5,
  className = '',
  style = {},
  scrollToIndex,
  onItemsRendered
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Item yüksekliklerini hesapla
  const getItemHeight = useCallback((index: number): number => {
    if (typeof itemHeight === 'function') {
      return itemHeight(data[index], index);
    }
    return itemHeight;
  }, [itemHeight, data]);

  // Toplam yükseklik hesapla
  const totalHeight = useMemo(() => {
    if (typeof itemHeight === 'number') {
      return data.length * itemHeight;
    }

    let height = 0;
    for (let i = 0; i < data.length; i++) {
      height += getItemHeight(i);
    }
    return height;
  }, [data.length, getItemHeight, itemHeight]);

  // Görünür item range'ini hesapla
  const visibleRange = useMemo(() => {
    if (data.length === 0) {
      return { startIndex: 0, endIndex: 0 };
    }

    let startIndex = 0;
    let endIndex = 0;
    let accumulatedHeight = 0;

    if (typeof itemHeight === 'number') {
      // Sabit yükseklik optimizasyonu
      startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      endIndex = Math.min(
        data.length - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
      );
    } else {
      // Değişken yükseklik hesaplaması
      for (let i = 0; i < data.length; i++) {
        const height = getItemHeight(i);
        
        if (accumulatedHeight + height > scrollTop && startIndex === 0) {
          startIndex = Math.max(0, i - overscan);
        }
        
        if (accumulatedHeight > scrollTop + containerHeight) {
          endIndex = Math.min(data.length - 1, i + overscan);
          break;
        }
        
        accumulatedHeight += height;
      }
      
      if (endIndex === 0) {
        endIndex = data.length - 1;
      }
    }

    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, data.length, getItemHeight, overscan, itemHeight]);

  // Item pozisyonunu hesapla
  const getItemOffset = useCallback((index: number): number => {
    if (typeof itemHeight === 'number') {
      return index * itemHeight;
    }

    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getItemHeight(i);
    }
    return offset;
  }, [getItemHeight, itemHeight]);

  // Scroll event handler
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // Belirli bir index'e scroll
  const scrollToIndexFunc = useCallback((index: number) => {
    if (!scrollElementRef.current || index < 0 || index >= data.length) {
      return;
    }

    const offset = getItemOffset(index);
    scrollElementRef.current.scrollTop = offset;
  }, [data.length, getItemOffset]);

  // scrollToIndex prop değiştiğinde scroll yap
  useEffect(() => {
    if (scrollToIndex !== undefined) {
      scrollToIndexFunc(scrollToIndex);
    }
  }, [scrollToIndex, scrollToIndexFunc]);

  // Rendered items callback
  useEffect(() => {
    onItemsRendered?.(visibleRange.startIndex, visibleRange.endIndex);
  }, [visibleRange.startIndex, visibleRange.endIndex, onItemsRendered]);

  // Rendered items
  const renderedItems = useMemo(() => {
    const items: React.ReactNode[] = [];

    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      const item = data[i];
      const offset = getItemOffset(i);
      const height = getItemHeight(i);

      const itemStyle: React.CSSProperties = {
        position: 'absolute',
        top: offset,
        left: 0,
        right: 0,
        height,
        boxSizing: 'border-box'
      };

      items.push(
        <div key={i} style={itemStyle}>
          {renderItem(item, i, itemStyle)}
        </div>
      );
    }

    return items;
  }, [visibleRange, data, getItemOffset, getItemHeight, renderItem]);

  return (
    <div
      className={`cogui-virtualized-list ${className}`}
      style={{ ...style, position: 'relative' }}
    >
      <div
        ref={scrollElementRef}
        className="virtualized-list-container"
        style={{
          height: containerHeight,
          overflow: 'auto',
          position: 'relative'
        }}
        onScroll={handleScroll}
      >
        {/* Spacer for total height */}
        <div
          className="virtualized-list-spacer"
          style={{
            height: totalHeight,
            position: 'relative'
          }}
        >
          {renderedItems}
        </div>
      </div>

      <style jsx>{`
        .cogui-virtualized-list {
          font-family: system-ui, sans-serif;
        }

        .virtualized-list-container {
          scrollbar-width: thin;
          scrollbar-color: #888 #f1f1f1;
        }

        .virtualized-list-container::-webkit-scrollbar {
          width: 12px;
        }

        .virtualized-list-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 6px;
        }

        .virtualized-list-container::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 6px;
        }

        .virtualized-list-container::-webkit-scrollbar-thumb:hover {
          background: #555;
        }

        .virtualized-list-spacer {
          will-change: transform;
        }

        /* Performance optimizations */
        .cogui-virtualized-list * {
          box-sizing: border-box;
        }

        /* Smooth scrolling on supported browsers */
        @supports (scroll-behavior: smooth) {
          .virtualized-list-container {
            scroll-behavior: smooth;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .virtualized-list-container {
            scroll-behavior: auto;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .virtualized-list-container::-webkit-scrollbar-thumb {
            background: #000;
          }
          
          .virtualized-list-container {
            scrollbar-color: #000 #fff;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .virtualized-list-container::-webkit-scrollbar-track {
            background: #2d2d2d;
          }
          
          .virtualized-list-container::-webkit-scrollbar-thumb {
            background: #666;
          }
          
          .virtualized-list-container {
            scrollbar-color: #666 #2d2d2d;
          }
        }
      `}</style>
    </div>
  );
}

export default VirtualizedList;