import _ from "lodash"
import restify from "restify"
import cluster from "cluster"
import config from "./config"
import log from "./log"
import {db} from "bardo"

var server = null
export function get() {
  if (server == null) {
    // Create "restify" server object (if has not yet been created)
    server = restify.createServer({
      name: config.get("name"),
    })
  }

  return server
}

function runWorker() {
  // Start listening ...
  var port = config.get("port")
  get().listen(port, () => {
    if ((cluster.isMaster || process.env.CHILD_ID === "1")
          && process.env.NODE_ENV !== "test") {
      log.warn("Listening at %s", get().url)
    }
  })
}

let gracefulExit = _.once(function() {
  // Wait at most 25~ seconds for requests to finish and then forcibly
  // terminate
  var timeout = 25000
  setTimeout(function() {
    process.exit(1)
  }, timeout).unref()

  // Request restify to close gracefully
  get().close(function() {
    // Drain the database connection queue
    db.quit().then(function() {
      // If this is a worker; let the master know
      if (cluster.worker) {
        cluster.worker.disconnect()
      }
    })
  })
})

export function run() {
  // Log initial information (ensuring to only print it once)
  let name = config.get("name")
  if (cluster.isMaster && process.env.NODE_ENV !== "test") {
    log.info(`Starting ${name}`)
  }

  if (cluster.isMaster && config.get("cluster")) {
    // In production environment, create a cluster
    var concurrency = os.cpus().length * 2 + 1
    log.info(`Creating cluster of ${concurrency} processes (pre-forking)`)

    // Create `concurrency` number of workers
    for (let i = 0; i < concurrency; i += 1) {
      cluster.fork({"CHILD_ID": i})
    }

    // Setup an `exit` handler to restart the workers
    // NOTE: This shouldn't be able to happen because of the
    //  request domains, but if something goes wrong with that...
    cluster.on("exit", function(worker) {
      log.warn(`worker ${worker.process.pid} has exited, restarting ...`)

      // Restart the worker
      cluster.fork()
    })

  } else {
    // In development or test environments, run a single process
    runWorker()
  }

  // Hook into termination and interrupt signals to gracefully exit
  process.on("SIGTERM", gracefulExit)
  process.on("SIGINT", gracefulExit)
}

export default {
  run
}
