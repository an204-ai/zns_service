import React from 'react';
import {
  CaretLeft,
  CaretRight,
  CaretDoubleLeft,
  CaretDoubleRight,
  CaretDown,
} from '@phosphor-icons/react';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  pageSize = 10,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}) {
  const safeTotalPages = Math.max(1, totalPages || 1);

  // Generate page numbers to show (e.g. 1, 2, 3...)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > safeTotalPages) {
      endPage = safeTotalPages;
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="table-pagination">
      <div className="table-pagination-left">
        {onPageSizeChange && (
          <div className="page-size-wrapper">
            <div className="pagination-select-box">
              <select
                className="table-page-select"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                aria-label="Chọn số dòng mỗi trang"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <CaretDown size={12} className="select-caret" />
            </div>
            <span className="page-size-label">Dòng mỗi trang</span>
          </div>
        )}
      </div>

      <div className="table-pagination-right">
        <span className="page-indicator">
          Trang {currentPage} / {safeTotalPages}
        </span>

        <div className="page-buttons">
          <button
            type="button"
            className="page-btn icon-btn"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(1)}
            title="Trang đầu"
            aria-label="Trang đầu"
          >
            <CaretDoubleLeft size={13} weight="bold" />
          </button>

          <button
            type="button"
            className="page-btn icon-btn"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            title="Trang trước"
            aria-label="Trang trước"
          >
            <CaretLeft size={13} weight="bold" />
          </button>

          {pages.map((p) => (
            <button
              key={p}
              type="button"
              className={`page-btn num-btn ${p === currentPage ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            className="page-btn icon-btn"
            disabled={currentPage >= safeTotalPages}
            onClick={() => onPageChange(currentPage + 1)}
            title="Trang sau"
            aria-label="Trang sau"
          >
            <CaretRight size={13} weight="bold" />
          </button>

          <button
            type="button"
            className="page-btn icon-btn"
            disabled={currentPage >= safeTotalPages}
            onClick={() => onPageChange(safeTotalPages)}
            title="Trang cuối"
            aria-label="Trang cuối"
          >
            <CaretDoubleRight size={13} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
