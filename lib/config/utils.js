const self = module.exports

self.responseError = async (res, error) => {
    let obj = error
    if(!error.code){
        obj = {
            code: 400,
            title: 'Error',
            detail: error.message,
            suggestion: 'Revisar el detalle'
        }
    }
    res.status(obj.code).send(obj)
}