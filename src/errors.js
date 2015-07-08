import util from "util"

export function HTTPError(status, body) {
  this.statusCode = status
  this.body = body
}

util.inherits(HTTPError, Error)

export function ValidationError(message, code="Invalid", status="422") {
  this.message = message
  this.code = code
  this.status = status
}

util.inherits(ValidationError, Error)

export default {
  HTTPError,
  ValidationError
}
