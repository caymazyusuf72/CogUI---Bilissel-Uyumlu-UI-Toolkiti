import React, { useState, useMemo, useCallback } from 'react';
import { DataGridProps, DataGridColumn } from '../../types';

/**
 * DataGrid - Gelişmiş veri tablosu bileşeni
 * Virtualization, sıralama, filtreleme desteği
 */
export const DataGrid: React.FC<DataGridProps> = ({
  data,
  columns,
  height = 400,
  rowHeight = 40,
  headerHeight = 50,
  virtualized = true,
  sortable = true,
  filterable = true,
  selectable = false,
  multiSelect = false,
  selectedRows = new Set(),
  onSelectionChange,
  onSort,
  onFilter,
  ...props
}) => {
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const handleSort = useCallback((columnId: string) => {
    if (!sortable) return;
    
    const newDirection = sortColumn === columnId && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(columnId);
    setSortDirection(newDirection);
    onSort?.(columnId, newDirection);
  }, [sortColumn, sortDirection, sortable, onSort]);

  const handleFilter = useCallback((columnId: string, value: string) => {
    if (!filterable) return;
    
    const newFilters = { ...filters, [columnId]: value };
    setFilters(newFilters);
    onFilter?.(newFilters);
  }, [filters, filterable, onFilter]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const cellValue = row[key]?.toString().toLowerCase() || '';
        return cellValue.includes(value.toLowerCase());
      });
    });
  }, [data, filters]);

  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      const comparison = aVal > bVal ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  const handleRowSelect = useCallback((rowId: string | number, selected: boolean) => {
    if (!selectable || !onSelectionChange) return;
    
    const newSelection = new Set(selectedRows);
    if (selected) {
      newSelection.add(rowId);
    } else {
      newSelection.delete(rowId);
    }
    onSelectionChange(newSelection);
  }, [selectable, selectedRows, onSelectionChange]);

  return (
    <div className="cogui-data-grid" style={{ height }}>
      {/* Header */}
      <div className="grid-header" style={{ height: headerHeight }}>
        <div className="grid-row">
          {selectable && (
            <div className="grid-cell checkbox-cell">
              <input
                type="checkbox"
                checked={selectedRows.size === data.length && data.length > 0}
                onChange={(e) => {
                  if (!onSelectionChange) return;
                  const newSelection = e.target.checked 
                    ? new Set(data.map((_, i) => i))
                    : new Set();
                  onSelectionChange(newSelection);
                }}
              />
            </div>
          )}
          {columns.map((column) => (
            <div
              key={column.id}
              className={`grid-cell header-cell ${sortable ? 'sortable' : ''}`}
              style={{ 
                width: column.width,
                minWidth: column.minWidth,
                maxWidth: column.maxWidth,
                textAlign: column.align || 'left'
              }}
              onClick={() => sortable && handleSort(column.id)}
            >
              {column.renderHeader ? column.renderHeader() : column.header}
              {sortable && sortColumn === column.id && (
                <span className="sort-indicator">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </div>
          ))}
        </div>
        
        {/* Filter Row */}
        {filterable && (
          <div className="grid-row filter-row">
            {selectable && <div className="grid-cell checkbox-cell"></div>}
            {columns.map((column) => (
              <div key={column.id} className="grid-cell filter-cell">
                {column.filterable !== false && (
                  <input
                    type="text"
                    placeholder={`Filter ${column.header}`}
                    value={filters[column.id] || ''}
                    onChange={(e) => handleFilter(column.id, e.target.value)}
                    className="filter-input"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="grid-body" style={{ height: height - headerHeight - (filterable ? 40 : 0) }}>
        {sortedData.map((row, rowIndex) => (
          <div key={rowIndex} className="grid-row" style={{ height: rowHeight }}>
            {selectable && (
              <div className="grid-cell checkbox-cell">
                <input
                  type="checkbox"
                  checked={selectedRows.has(rowIndex)}
                  onChange={(e) => handleRowSelect(rowIndex, e.target.checked)}
                />
              </div>
            )}
            {columns.map((column) => {
              const value = typeof column.accessor === 'function' 
                ? column.accessor(row) 
                : row[column.accessor];
              
              return (
                <div
                  key={column.id}
                  className="grid-cell data-cell"
                  style={{ 
                    width: column.width,
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth,
                    textAlign: column.align || 'left'
                  }}
                >
                  {column.renderCell ? column.renderCell(value, row) : value}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <style jsx>{`
        .cogui-data-grid {
          border: 1px solid #e0e0e0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: white;
        }
        
        .grid-header {
          border-bottom: 2px solid #e0e0e0;
          background: #f5f5f5;
        }
        
        .grid-row {
          display: flex;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .grid-cell {
          padding: 8px 12px;
          border-right: 1px solid #e0e0e0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .header-cell {
          font-weight: 600;
          background: #f5f5f5;
        }
        
        .sortable {
          cursor: pointer;
          user-select: none;
        }
        
        .sortable:hover {
          background: #eeeeee;
        }
        
        .checkbox-cell {
          width: 40px;
          min-width: 40px;
          text-align: center;
        }
        
        .filter-input {
          width: 100%;
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 12px;
        }
        
        .sort-indicator {
          margin-left: 4px;
          color: #666;
        }
        
        .grid-body {
          overflow: auto;
        }
        
        .grid-row:nth-child(even) {
          background: #f9f9f9;
        }
        
        .grid-row:hover {
          background: #f0f0f0;
        }
      `}</style>
    </div>
  );
};

export default DataGrid;