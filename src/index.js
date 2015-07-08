module.exports = {}

module.exports.run = require("./server").run
module.exports.configure = require("./config").configure
module.exports.util = require("./util")

var res = require("./resource")
module.exports.Resource = res.Resource
module.exports.mount = res.mount

var route = require("./route")
for (let name of Object.keys(route)) {
  if (name !== "default") {
    module.exports[name] = route[name]
  }
}

var errors = require("./errors")
for (let name of Object.keys(errors)) {
  if (name !== "default") {
    module.exports[name] = errors[name]
  }
}

module.exports.validators = require("./validators")
module.exports.validate = require("./validate")
