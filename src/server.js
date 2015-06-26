import _ from "lodash"
import restify from "restify"

export class Server {
  constructor(options) {
    if (_.isString(options)) {
      options = {name: options}
    }

    this._obj = restify.createServer({
      name: options.name,
    })
  }

  listen(port) {
    return this._obj.listen(port)
  }

  head() { this._obj.head.apply(this._obj, arguments) }
  get() { this._obj.get.apply(this._obj, arguments) }
  opts() { this._obj.opts.apply(this._obj, arguments) }
  post() { this._obj.post.apply(this._obj, arguments) }
  put() { this._obj.put.apply(this._obj, arguments) }
  patch() { this._obj.patch.apply(this._obj, arguments) }
  del() { this._obj.del.apply(this._obj, arguments) }
}

export default {
  Server,
}
