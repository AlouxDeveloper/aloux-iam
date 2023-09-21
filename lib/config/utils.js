const self = module.exports


self.responseError = async (res, error, code, title, suggestion) => {
    let obj = error
    if(!error.code){
        obj = {
            code: code,
            title: title,
            detail: error.message,
            suggestion: suggestion
        }
    }
    res.status(obj.code).send(obj)
}