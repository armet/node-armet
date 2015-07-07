import _ from "lodash"
import Str from "underscore.string"
import path from "path"
// import sql from "sql-bricks-postgres"
import {db} from "bardo"
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
    route.head(url, this.dispatch.bind(this))
    route.get(url, this.dispatch.bind(this))
    route.get(path.join(url, ":id"), this.dispatch.bind(this))
    route.post(url, this.dispatch.bind(this))
    route.post(path.join(url, ":id"), this.dispatch.bind(this))
    route.patch(url, this.dispatch.bind(this))
    route.patch(path.join(url, ":id"), this.dispatch.bind(this))
    route.put(url, this.dispatch.bind(this))
    route.put(path.join(url, ":id"), this.dispatch.bind(this))
    route.del(url, this.dispatch.bind(this))
    route.del(path.join(url, ":id"), this.dispatch.bind(this))
  }

  static dispatch(req, res, next) {
    let resource = new this()

    let handler = resource[req.method.toLowerCase()]
    if (handler == null) {
      // No handler found: Method not allowed
      // TODO: Should return allowed methods
      res.send(405)
      return next(false)
    }

    function except(err) {
      // TODO: Do something useful with this exception
      throw err
    }

    // Initialize the resource object; gives the resource
    // author a moment to prepare
    Promise.resolve(resource.initialize(req)).then(function() {
      // Execute the specific method handler for this
      // resource, method combination
      Promise.resolve(handler.call(resource, req, res, next)).then(function() {
        // Close the active database context
        db.end()
      }).catch(except)
    }).catch(except)
  }

  constructor() {
  }

  initialize(/* req */) {
    // NOTE: To be overridden by a derived class
  }

  prepare(req, item) {
    // NOTE: To be overridden by a derived class
    return item
  }

  clean(req, item) {
    // NOTE: To be overridden by a derived class
    return item
  }
}

export default {
  Resource,
  mount
}
