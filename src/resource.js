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

    // Collect `before` and `after` methods
    // NOTE: It'd be nice if there was to do metaclass-style initialization
    this._before = []
    this._after = []

    // Add the local `after` first
    if (this.prototype.after != null) {
      this._after.push(this.prototype.after)
    }

    // TODO: Collect `before` and `after` from mixins
    for (let mix of (this.mixins || [])) {
      if (mix.prototype != null) {
        mix = mix.prototype
      }

      if (mix.before != null) {
        this._before.push(mix.before)
      }

      if (mix.after != null) {
        this._after.push(mix.after)
      }
    }

    // Add the local `before` last
    if (this.prototype.before != null) {
      this._before.push(this.prototype.before)
    }
  }

  static dispatch(req, res, next) {
    let resource = new this()

    // Determine an appropriate handler method
    let handler = resource[req.method.toLowerCase()]
    if (handler == null) {
      // No handler found: Method not allowed
      // TODO: Should return allowed methods
      res.send(405)
      return next(false)
    }

    let cls = this
    let beforeIndex = 0
    let afterIndex = 0
    let routed = false
    let cleanup = false

    function finalize() {
      // TODO: This also happens in the uncaughtException handler;
      //       perhaps there is a way to generalize?
      db.end()
      return next()
    }

    let nextFn = req.domain.bind((function() {
      // Determine what method to call next
      let method = null
      if (beforeIndex < cls._before.length) {
        method = cls._before[beforeIndex]
        beforeIndex += 1
      } else if (!routed) {
        method = handler
        routed = true
      } else if (afterIndex < cls._after.length) {
        method = cls._after[afterIndex]
        afterIndex += 1
      } else if (!cleanup) {
        method = finalize
        cleanup = false
      }

      // Bind the method to the request domain
      method = req.domain.bind(method)

      // Call the method
      Promise.resolve(method.call(this, req, res, nextFn)).catch(function(err) {
        // Raise the error upwards (if this was an async method)
        throw err
      })
    }).bind(resource))
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
