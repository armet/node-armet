import util from "util"

export function HTTPError(status, body) {
  this.statusCode = status
  this.body = body
}

util.inherits(HTTPError, Error)

export default {
  HTTPError
}
