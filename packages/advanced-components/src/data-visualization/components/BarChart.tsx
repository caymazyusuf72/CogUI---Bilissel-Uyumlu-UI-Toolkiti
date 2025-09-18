import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { BaseComponentProps, ChartData, ChartOptions } from '../../types';

export interface BarChartProps extends BaseComponentProps {
  data: ChartData;
  options?: ChartOptions & {
    orientation?: 'vertical' | 'horizontal';
    barPadding?: number;
    showValues?: boolean;
    gradient?: boolean;
  };
  onBarClick?: (data: any, event: MouseEvent) => void;
  onBarHover?: (data: any, event: MouseEvent) => void;
}

/**
 * BarChart - Modern bar chart bileşeni
 * D3.js ile oluşturulan, etkileşimli bar chart
 */
export const BarChart: React.FC<BarChartProps> = ({
  data,
  options = {},
  onBarClick,
  onBarHover,
  className,
  style,
  testId,
  ariaLabel = 'Bar chart'
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const dimensions = useMemo(() => {
    const {
      width = 600,
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

  useEffect(() => {
    if (!svgRef.current || !data.datasets?.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${dimensions.margin.left},${dimensions.margin.top})`);

    const dataset = data.datasets[0];
    const barData = dataset.data;

    // Scales
    const xScale = d3.scaleBand()
      .domain(barData.map(d => d.x.toString()))
      .range([0, dimensions.innerWidth])
      .padding(options.barPadding || 0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(barData, d => d.y) || 0])
      .range([dimensions.innerHeight, 0]);

    // Color scale
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Bars
    g.selectAll('.bar')
      .data(barData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.x.toString()) || 0)
      .attr('y', dimensions.innerHeight)
      .attr('width', xScale.bandwidth())
      .attr('height', 0)
      .attr('fill', (d, i) => dataset.color || colorScale(i.toString()))
      .style('cursor', 'pointer')
      .on('click', (event, d) => onBarClick?.(d, event))
      .on('mouseover', (event, d) => onBarHover?.(d, event))
      .transition()
      .duration(750)
      .attr('y', d => yScale(d.y))
      .attr('height', d => dimensions.innerHeight - yScale(d.y));

    // Axes
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${dimensions.innerHeight})`)
      .call(d3.axisBottom(xScale));

    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale));

    // Values on bars
    if (options.showValues) {
      g.selectAll('.bar-value')
        .data(barData)
        .enter()
        .append('text')
        .attr('class', 'bar-value')
        .attr('x', d => (xScale(d.x.toString()) || 0) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.y) - 5)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#333')
        .text(d => d.y.toString());
    }

  }, [data, dimensions, options, onBarClick, onBarHover]);

  return (
    <div className={`cogui-bar-chart ${className || ''}`} style={style} data-testid={testId}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        role="img"
        aria-label={ariaLabel}
      />
    </div>
  );
};

export default BarChart;