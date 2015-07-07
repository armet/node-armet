import _ from "lodash"
import Str from "underscore.string"
import path from "path"
// import sql from "sql-bricks-postgres"
import {db, util} from "bardo"
import route from "./route"

export function mount(path) {
  function decorator(path, cls) {
    cls.mount(path)
    return cls
  }

  if (_.isString(path)) {
    return decorator.bind(undefined, path)
  }

  return decorator("/", path)
}

// TODO: Split up `Resource` and `ModelResource`
export class Resource {
  static mount(base="/") {
    // Dasherize the name of this class
    let name = Str.dasherize(Str.camelize(this.name, true))
    let url = path.join(base, name)

    // NOTE: It'd be nice if resitfy supported a way to bind a handler to
    //       all methods
    let dispatch = this.dispatch.bind(this)
    let methods = ["head", "get", "post", "put", "patch", "del"]
    for (let method of methods) {
      route[method](url, dispatch)
      route[method](path.join(url, ":id"), dispatch)
    }
  }

  static dispatch(req, res, next) {
    let resource = new this()

    // Collect `before` and `after` methods
    let before = []
    let after = []

    // Add the local `after` first
    if (resource.after != null) {
      after.push(resource.after.bind(resource))
    }

    // TODO: Collect `before` and `after` from mixins
    for (let mix of (resource.mixins || [])) {
      if (mix.prototype != null) {
        mix = mix.prototype
      }

      if (mix.before != null) {
        before.push(mix.before.bind(resource))
      }

      if (mix.after != null) {
        after.push(mix.after.bind(resource))
      }
    }

    // Add the local `before` last
    if (resource.before != null) {
      before.push(resource.before.bind(resource))
    }

    // Determine an appropriate handler method
    let handler = resource[req.method.toLowerCase()]
    if (handler == null) {
      // No handler found: Method not allowed
      // TODO: Should return allowed methods
      res.send(405)
      return next(false)
    }

    let beforeIndex = 0
    let afterIndex = 0
    let routed = false
    let cleanup = false

    function finalize() {
      db.end()
      return next()
    }

    let nextFn = (function() {
      // Determine what method to call next
      let method = null
      if (beforeIndex < before.length) {
        method = before[beforeIndex]
        beforeIndex += 1
      } else if (!routed) {
        method = handler
        routed = true
      } else if (afterIndex < after.length) {
        method = after[afterIndex]
        afterIndex += 1
      } else if (!cleanup) {
        method = finalize
        cleanup = false
      }

      // Call the method
      Promise.resolve(method.call(this, req, res, nextFn)).catch(function(err) {
        // Raise the error upwards (if this was an async method)
        throw err
      })
    }).bind(resource)

    nextFn()
  }

  constructor() {
    // NOTE: Does nothing (for the moment)
  }

  prepare(req, row) {
    // If only one parameter is passed; assume the one parameter is the `row`
    if (row == null) row = req

    // NOTE: Could be overridden by a derived class
    return this.serialize(row)
  }

  clean(req, item) {
    // If only one parameter is passed; assume the one parameter is the `item`
    if (item == null) item = req

    // NOTE: Could be overridden by a derived class
    return this.deserialize(item)
  }

  // Transform from `a__b_c` into `a.bC`
  serialize(row) {
    return util.serialize(row)
  }

  // Transform from `a.bC` into `a__b_c`
  deserialize(item) {
    return util.deserialize(item)
  }
}

export default {
  Resource,
  mount
}
