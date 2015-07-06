import Str from "underscore.string"
import path from "path"
import sql from "sql-bricks-postgres"
import {db} from "bardo"
import {get as getServer} from "./server"

export function mount(path) {
  function decorator(path, cls) {
    cls.mount(path)
    return cls
  }

  if (_.isString(path)) {
    return decorator.bind(undefined, path)
  } else {
    return decorator("/", cls)
  }
}

// TODO: Split up `Resource` and `ModelResource`
export class Resource {
  static mount(base="/") {
    // Dasherize the name of this class
    let name = Str.dasherize(Str.camelize(this.name, true))
    let route = path.join(base, name)

    // NOTE: It'd be nice if resitfy supported a way to bind a handler to
    //       all methods
    getServer().head(route, this.dispatch.bind(this))
    getServer().get(route, this.dispatch.bind(this))
    getServer().post(route, this.dispatch.bind(this))
    getServer().patch(route, this.dispatch.bind(this))
    getServer().put(route, this.dispatch.bind(this))
    getServer().del(route, this.dispatch.bind(this))
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
      throw err;
      return next(false);
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
