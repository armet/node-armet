import _ from "lodash"
import {ValidationError, HTTPError} from "./errors"

/**
 * @param {Object} item - The object to run a set of validators against;
 *                        normally would be `req.body`.
 * @param {Object} schema - The object validation schema.
 * @param {Object} context - Optional context to be given along with the item (
 *                           but will not allow mutation).
 */
export default async function validate(
  item={},
  schema,
  context={},
  _rootItem={},
  _key=null
) {
  let result

  // Pull out a sub-object from result (allows for nested object
  // validation)
  if (_key != null) {
    if (_rootItem[_key] == null) {
      _rootItem[_key] = {}
    }

    result = _rootItem[_key]
  } else {
    result = _rootItem
  }

  let errors = {}
  let status = 422

  // Enumerate through each key in the validation schema
  for (let key of _.keys(schema)) {
    let fns = schema[key]

    // NOTE: Allows for a single `validator` or an array/chain of validators
    //       to be defined for a given schema key
    for (let fn of (_.isArray(fns) ? fns : [fns])) {
      try {
        // Get the value for this key
        let val = (result[key] || item[key])

        // If we have an object, we need to recurse into this
        // sub-object for validation
        if (_.isPlainObject(fn)) {
          result[key] = await validate(val, fn, context, result, key)
        } else if (fn === true) {
          // No validation is performed; pass-through to the result (only
          // if it isn't undefined)
          result[key] = val
        } else {
          // Attempt to run the validator to check and clean the value
          result[key] = await fn.call(_.extend(_rootItem, context), val)
        }
      } catch (err) {
        if (err instanceof ValidationError) {
          // Capture error and store in our error block
          errors[key] = _.omit(err, "status")
          break
        }

        if (err instanceof HTTPError) {
          status = err.statusCode
          errors[key] = err.body
          break
        }

        throw err
      }
    }
  }

  // If there were errors throw them back to the caller
  if (_.keys(errors).length > 0) {
    throw new HTTPError(status, errors)
  }

  // Return the fully cleaned item
  return _.omit(_.pick(result, (val) => {
    return val != null
  }), _.keys(context))
}
