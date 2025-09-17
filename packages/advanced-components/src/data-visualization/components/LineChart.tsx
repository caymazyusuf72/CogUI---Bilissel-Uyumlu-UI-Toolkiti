import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { BaseComponentProps, ChartData, ChartOptions, Axis, DataPoint } from '../../types';

export interface LineChartProps extends BaseComponentProps {
  data: ChartData;
  options?: ChartOptions & {
    xAxis?: Axis;
    yAxis?: Axis;
    smooth?: boolean;
    showPoints?: boolean;
    pointRadius?: number;
    strokeWidth?: number;
    gradient?: boolean;
    area?: boolean;
    interactive?: boolean;
    crosshair?: boolean;
    zoom?: boolean;
    brush?: boolean;
  };
  onPointHover?: (point: DataPoint | null, event: MouseEvent) => void;
  onPointClick?: (point: DataPoint, event: MouseEvent) => void;
  onZoom?: (domain: [Date | number, Date | number]) => void;
  onBrush?: (selection: [Date | number, Date | number] | null) => void;
}

/**
 * LineChart - Gelişmiş çizgi grafiği bileşeni
 * D3.js tabanlı, etkileşimli ve erişilebilir line chart
 */
export const LineChart: React.FC<LineChartProps> = ({
  data,
  options = {},
  onPointHover,
  onPointClick,
  onZoom,
  onBrush,
  className,
  style,
  testId,
  ariaLabel = 'Line chart',
  ariaDescription
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Chart dimensions ve margin hesaplama
  const dimensions = useMemo(() => {
    const {
      width = 800,
      height = 400,
      padding = { top: 20, right: 30, bottom: 40, left: 50 }
    } = options;

    return {
      width,
      height,
      margin: padding,
      innerWidth: width - padding.left - padding.right,
      innerHeight: height - padding.top - padding.bottom
    };
  }, [options]);

  // Scales oluşturma
  const scales = useMemo(() => {
    if (!data.datasets?.length) return null;

    const allPoints = data.datasets.flatMap(dataset => dataset.data);
    
    // X scale
    const xExtent = d3.extent(allPoints, d => {
      const xVal = d.x;
      return xVal instanceof Date ? xVal : new Date(xVal);
    }) as [Date, Date];

    const xScale = d3.scaleTime()
      .domain(xExtent)
      .range([0, dimensions.innerWidth]);

    // Y scale  
    const yExtent = d3.extent(allPoints, d => d.y) as [number, number];
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
    
    const yScale = d3.scaleLinear()
      .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
      .range([dimensions.innerHeight, 0]);

    return { xScale, yScale };
  }, [data, dimensions]);

  // Line generator
  const lineGenerator = useMemo(() => {
    if (!scales) return null;

    const line = d3.line<DataPoint>()
      .x(d => scales.xScale(new Date(d.x)))
      .y(d => scales.yScale(d.y));

    if (options.smooth) {
      line.curve(d3.curveCatmullRom.alpha(0.5));
    }

    return line;
  }, [scales, options.smooth]);

  // Area generator (area chart için)
  const areaGenerator = useMemo(() => {
    if (!scales || !options.area) return null;

    return d3.area<DataPoint>()
      .x(d => scales.xScale(new Date(d.x)))
      .y0(scales.yScale(0))
      .y1(d => scales.yScale(d.y))
      .curve(options.smooth ? d3.curveCatmullRom.alpha(0.5) : d3.curveLinear);
  }, [scales, options.area, options.smooth]);

  // Tooltip gösterme
  const showTooltip = useCallback((point: DataPoint, event: MouseEvent) => {
    if (!tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    tooltip.style.display = 'block';
    tooltip.style.left = `${event.pageX + 10}px`;
    tooltip.style.top = `${event.pageY - 10}px`;
    
    tooltip.innerHTML = `
      <div>
        <strong>${point.label || new Date(point.x).toLocaleDateString()}</strong><br/>
        Value: ${point.y.toFixed(2)}
      </div>
    `;

    onPointHover?.(point, event);
  }, [onPointHover]);

  // Tooltip gizleme
  const hideTooltip = useCallback(() => {
    if (tooltipRef.current) {
      tooltipRef.current.style.display = 'none';
    }
    onPointHover?.(null, {} as MouseEvent);
  }, [onPointHover]);

  // Chart render etme
  useEffect(() => {
    if (!svgRef.current || !scales || !lineGenerator || !data.datasets?.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Temizle

    const g = svg
      .append('g')
      .attr('transform', `translate(${dimensions.margin.left},${dimensions.margin.top})`);

    // Gradient tanımları
    if (options.gradient) {
      const defs = svg.append('defs');
      
      data.datasets.forEach((dataset, index) => {
        const gradient = defs
          .append('linearGradient')
          .attr('id', `gradient-${index}`)
          .attr('gradientUnits', 'userSpaceOnUse')
          .attr('x1', 0).attr('y1', 0)
          .attr('x2', 0).attr('y2', dimensions.innerHeight);

        gradient
          .append('stop')
          .attr('offset', '0%')
          .attr('stop-color', dataset.color || '#3b82f6')
          .attr('stop-opacity', 0.8);

        gradient
          .append('stop')
          .attr('offset', '100%')
          .attr('stop-color', dataset.color || '#3b82f6')
          .attr('stop-opacity', 0.1);
      });
    }

    // Grid çizgileri
    if (options.xAxis?.grid?.visible !== false) {
      g.selectAll('.grid-line-x')
        .data(scales.xScale.ticks(10))
        .enter()
        .append('line')
        .attr('class', 'grid-line-x')
        .attr('x1', d => scales.xScale(d))
        .attr('x2', d => scales.xScale(d))
        .attr('y1', 0)
        .attr('y2', dimensions.innerHeight)
        .attr('stroke', options.xAxis?.grid?.color || '#e5e7eb')
        .attr('stroke-width', 1)
        .attr('opacity', 0.5);
    }

    if (options.yAxis?.grid?.visible !== false) {
      g.selectAll('.grid-line-y')
        .data(scales.yScale.ticks(8))
        .enter()
        .append('line')
        .attr('class', 'grid-line-y')
        .attr('x1', 0)
        .attr('x2', dimensions.innerWidth)
        .attr('y1', d => scales.yScale(d))
        .attr('y2', d => scales.yScale(d))
        .attr('stroke', options.yAxis?.grid?.color || '#e5e7eb')
        .attr('stroke-width', 1)
        .attr('opacity', 0.5);
    }

    // Eksenler
    const xAxis = d3.axisBottom(scales.xScale)
      .tickFormat(d3.timeFormat('%m/%d'));
    
    const yAxis = d3.axisLeft(scales.yScale)
      .tickFormat(d => d.toString());

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${dimensions.innerHeight})`)
      .call(xAxis);

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);

    // Çizgiler ve alanlar
    data.datasets.forEach((dataset, index) => {
      if (!dataset.visible && dataset.visible !== undefined) return;

      const color = dataset.color || d3.schemeCategory10[index % 10];

      // Area path (eğer area modu açıksa)
      if (options.area && areaGenerator) {
        g.append('path')
          .datum(dataset.data)
          .attr('class', `area-${index}`)
          .attr('fill', options.gradient ? `url(#gradient-${index})` : color)
          .attr('opacity', 0.3)
          .attr('d', areaGenerator);
      }

      // Line path
      const path = g.append('path')
        .datum(dataset.data)
        .attr('class', `line-${index}`)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', options.strokeWidth || 2)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('d', lineGenerator);

      // Animasyon
      const totalLength = path.node()?.getTotalLength() || 0;
      path
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(1500)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0);

      // Points (eğer showPoints açıksa)
      if (options.showPoints) {
        g.selectAll(`.point-${index}`)
          .data(dataset.data)
          .enter()
          .append('circle')
          .attr('class', `point-${index}`)
          .attr('cx', d => scales.xScale(new Date(d.x)))
          .attr('cy', d => scales.yScale(d.y))
          .attr('r', options.pointRadius || 4)
          .attr('fill', color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
          .style('cursor', 'pointer')
          .on('mouseover', function(event, d) {
            d3.select(this)
              .transition()
              .duration(150)
              .attr('r', (options.pointRadius || 4) * 1.5);
            
            showTooltip(d, event);
          })
          .on('mouseout', function() {
            d3.select(this)
              .transition()
              .duration(150)
              .attr('r', options.pointRadius || 4);
            
            hideTooltip();
          })
          .on('click', (event, d) => {
            onPointClick?.(d, event);
          });
      }
    });

    // Crosshair (eğer enabled)
    if (options.crosshair) {
      const crosshair = g.append('g')
        .attr('class', 'crosshair')
        .style('display', 'none');

      crosshair.append('line')
        .attr('class', 'crosshair-x')
        .attr('y1', 0)
        .attr('y2', dimensions.innerHeight);

      crosshair.append('line')
        .attr('class', 'crosshair-y')
        .attr('x1', 0)
        .attr('x2', dimensions.innerWidth);

      g.append('rect')
        .attr('class', 'mouse-overlay')
        .attr('width', dimensions.innerWidth)
        .attr('height', dimensions.innerHeight)
        .style('fill', 'none')
        .style('pointer-events', 'all')
        .on('mousemove', function(event) {
          const [mouseX, mouseY] = d3.pointer(event);
          
          crosshair.style('display', null);
          crosshair.select('.crosshair-x')
            .attr('x1', mouseX)
            .attr('x2', mouseX);
          crosshair.select('.crosshair-y')
            .attr('y1', mouseY)
            .attr('y2', mouseY);
        })
        .on('mouseout', () => {
          crosshair.style('display', 'none');
        });
    }

  }, [
    data, 
    scales, 
    lineGenerator, 
    areaGenerator, 
    dimensions, 
    options, 
    showTooltip, 
    hideTooltip, 
    onPointClick
  ]);

  return (
    <div 
      ref={containerRef}
      className={`cogui-line-chart ${className || ''}`}
      style={style}
      data-testid={testId}
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        role="img"
        aria-label={ariaLabel}
        aria-description={ariaDescription}
        style={{
          maxWidth: '100%',
          height: 'auto'
        }}
      />
      
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="cogui-chart-tooltip"
        style={{
          position: 'absolute',
          display: 'none',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          pointerEvents: 'none',
          zIndex: 1000
        }}
      />

      {/* CSS Styles */}
      <style jsx>{`
        .cogui-line-chart {
          position: relative;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .cogui-line-chart .x-axis,
        .cogui-line-chart .y-axis {
          font-size: 12px;
          color: #6b7280;
        }
        
        .cogui-line-chart .crosshair line {
          stroke: #6b7280;
          stroke-width: 1;
          stroke-dasharray: 3,3;
          pointer-events: none;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .cogui-line-chart path {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LineChart;