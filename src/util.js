import glob from "glob"
import callsite from "callsite"
import path from "path"
import Str from "underscore.string"

export function requireAll(pattern) {
  var requester = callsite()[1].getFileName()
  var cwd = path.dirname(requester)

  glob.glob(pattern, {cwd}, function(err, filenames) {
    if (err) throw err
    for (let filename of filenames) {
      if (!Str.endsWith(filename, "index.js")) {
        var {dir, name} = path.parse(filename)
        var modName = path.join(cwd, path.join(dir, name))
        require(modName)
      }
    }
  })
}
