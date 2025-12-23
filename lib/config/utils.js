const self = module.exports

self.responseError = async (res, error) => {
    let obj = error
    if (!error.code) {
        obj = {
            code: 400,
            title: 'Error',
            detail: error.message,
            suggestion: 'Revisar el detalle'
        }
    }
    res.status(obj.code).send(obj)
}

self.generatePaginationResponse = async (count, page, itemsPerPage, items) => {
    const totalPages = Math.ceil(count / itemsPerPage)
    const currentPage = Math.max(1, Math.min(Number(page), totalPages))
    const finalCurrentPage = totalPages === 0 ? 1 : currentPage
    const remainingPages = Math.max(0, totalPages - finalCurrentPage)
    return { currentPage: finalCurrentPage, totalPages, perPage: Number(itemsPerPage), count, remainingPages, items }
}