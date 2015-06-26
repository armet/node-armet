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
      Promise.resolve(handler.call(resource, req, res)).then(function() {
        // Close the active database context
        db.end().then(function() {
          // Get out and let resitfy known we're done
          return next()
        })
      }).catch(except)
    }).catch(except)
  }

  constructor() {
  }

  initialize(/* req */) {
    // NOTE: To be overridden by a derived class
  }

  read(/* req */) {
    // NOTE: To be overridden by a derived class
  }

  create(/* req, item */) {
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

  post(req, res) {
    return new Promise((resolve) => {
      // Request the creation statement
      Promise.resolve(this.create(clean(req, item))).then((stmt) => {
        stmt = stmt.returning("*")

        // Execute the creation statement
        db.execute(stmt).then((rows) => {
          // TODO: Handle batch-creation
          let row = rows[0]

          // Send back the response to the client
          res.send(201, prepare(req, row))
          return resolve()
        })
      })
    })
  }

  get(req, res) {
    return new Promise((resolve) => {
      // Request the primary statement
      Promise.resolve(this.read(req)).then((stmt) => {
        stmt = stmt.toParams()

        // Get the `total count` of items
        let countStmt = sql.select("COUNT(*)").from(`(${stmt.text}) _`)
        db.execute(countStmt, stmt.values).then((rows) => {
          let count = rows[0].count

          // Execute the primary statement and prepare the items
          db.execute(stmt.text, stmt.values).then((rows) => {
            let items = rows.map(this.prepare.bind(undefined, req))

            // Send back the response to the client
            res.send(200, items)
            return resolve()
          })
        })
      })
    })
  }
}

export default {
  Resource,
  mount
}
