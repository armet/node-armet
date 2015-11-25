import _ from "lodash"
import {ValidationError} from "./errors"

export function isRequired(val) {
  if (val == null) {
    throw new ValidationError("Field is required.", "missing")
  }

  // Treat empty string identically to `null`
  if (_.isString(val) && val.length === 0) {
    throw new ValidationError("Field is required.", "missing")
  }

  return val
}

export function isIn(values) {
  return function(val) {
    if (val && values.indexOf(val) < 0) {
      throw new ValidationError(
        "Not one of the allowed choices.",
        "invalid-choice")
    }

    return val
  }
}

export default {
  isRequired,
  isIn
}
