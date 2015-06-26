import bunyan from "bunyan"
import config from "config"
import PrettyStream from "bunyan-prettystream"

// Create a stdout pipe (to format the output from bunyan)
var stdout = new PrettyStream()
stdout.pipe(process.stdout)

let log = bunyan.createLogger({
  name: "armet",
  stream: stdout,
  level: config.get("armet.log.level")
})

export default log
