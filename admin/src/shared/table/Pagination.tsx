import { FC } from 'react'
import { Pagination, PaginationItem, PaginationLink } from 'reactstrap'
import SvgIcon from '../icons/SvgIcon'
import { CommonPaginationProps } from '../../types'

const CommonPagination: FC<CommonPaginationProps> = ({ currentPage, itemsPerPage, totalItems, goToPage }) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)
  const maxPagesToShow = 3
  const halfMaxPages = Math.floor(maxPagesToShow / 2)
  let startPage = Math.max(1, safeCurrentPage - halfMaxPages)
  let endPage = Math.min(totalPages, safeCurrentPage + halfMaxPages)
  if (totalPages > maxPagesToShow) {
    if (safeCurrentPage <= halfMaxPages) {
      endPage = maxPagesToShow
    } else if (safeCurrentPage + halfMaxPages >= totalPages) {
      startPage = totalPages - maxPagesToShow + 1
    }
  }
  const middleStart = Math.max(2, startPage)
  const middleEnd = Math.min(totalPages - 1, endPage)
  const middlePages = middleStart <= middleEnd ? Array.from({ length: middleEnd - middleStart + 1 }, (_, i) => middleStart + i) : []
  const showLeadingEllipsis = middleStart > 2
  const showTrailingEllipsis = middleEnd < totalPages - 1
  const safeGoto = (page: number) => {
    if (page < 1 || page > totalPages || page === safeCurrentPage) return
    goToPage(page)
  }

  return (
    <div className="table-pagination">
      <Pagination className="pagination pagination-primary pagin-border-secondary-color" aria-label="Pagination">
        <PaginationItem disabled={safeCurrentPage === 1}>
          <PaginationLink
            onClick={(e) => {
              e.preventDefault()
              safeGoto(1)
            }}
            first
          >
            <SvgIcon iconId="double-arrow-left" className="pagination-btn" />
          </PaginationLink>
        </PaginationItem>
        <PaginationItem disabled={safeCurrentPage === 1}>
          <PaginationLink
            onClick={(e) => {
              e.preventDefault()
              safeGoto(safeCurrentPage - 1)
            }}
            previous
          >
            <SvgIcon iconId="previews" className="pagination-btn" />
          </PaginationLink>
        </PaginationItem>
        <PaginationItem active={safeCurrentPage === 1}>
          <PaginationLink
            onClick={(e) => {
              e.preventDefault()
              safeGoto(1)
            }}
          >
            1
          </PaginationLink>
        </PaginationItem>
        {totalItems > 0 && showLeadingEllipsis && (
          <PaginationItem disabled>
            <PaginationLink>...</PaginationLink>
          </PaginationItem>
        )}
        {totalItems > 0 &&
          middlePages.map((page) => (
            <PaginationItem key={page} active={page === safeCurrentPage}>
              <PaginationLink
                onClick={(e) => {
                  e.preventDefault()
                  safeGoto(page)
                }}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
        {totalItems > 0 && showTrailingEllipsis && (
          <PaginationItem disabled>
            <PaginationLink>...</PaginationLink>
          </PaginationItem>
        )}
        {totalPages > 1 && (
          <PaginationItem active={safeCurrentPage === totalPages}>
            <PaginationLink
              onClick={(e) => {
                e.preventDefault()
                safeGoto(totalPages)
              }}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        )}
        <PaginationItem disabled={safeCurrentPage === totalPages}>
          <PaginationLink
            onClick={(e) => {
              e.preventDefault()
              safeGoto(safeCurrentPage + 1)
            }}
            next
          >
            <SvgIcon iconId="next" className="pagination-btn" />
          </PaginationLink>
        </PaginationItem>
        <PaginationItem disabled={safeCurrentPage === totalPages}>
          <PaginationLink
            onClick={(e) => {
              e.preventDefault()
              safeGoto(totalPages)
            }}
            last
          >
            <SvgIcon iconId="double-arrow-right" className="pagination-btn" />
          </PaginationLink>
        </PaginationItem>
      </Pagination>
    </div>
  )
}

export default CommonPagination
