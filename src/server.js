import _ from "lodash"
import os from "os"
import restify from "restify"
import cluster from "cluster"
import config from "./config"
import log from "./log"
import {db} from "bardo"

// TODO: Should this move elsewhere?
function parseObjectReference(req, res, next) {
  if (req.body == null || Object.keys(req.body).length === 0) {
    // Body is empty
    return next()
  }

  function explode(segment) {
    if (segment.indexOf("[") === 0) {
      return segment.slice(1, segment.length - 1)
    }

    return segment
  }

  const pattern = /([^\[\]]+)|\[([^\[\]]+?)\]/g
  for (let key of Object.keys(req.body)) {
    let ctx = req.body
    let value = req.body[key]
    let match = key.match(pattern)
    if (match != null && match.length >= 2) {
      // Remove the [..] around the segments
      match = match.map(explode)

      for (let segment of match.slice(0, match.length - 1)) {
        // Ensure we have an object and forward the context
        if (!_.has(ctx, segment)) ctx[segment] = {}
        ctx = ctx[segment]
      }

      // Set the value on the inner-most context
      ctx[match[match.length - 1]] = value

      // Remove the now parsed key
      delete req.body[key]
    }
  }

  return next()
}

var server = null
export function get() {
  if (server == null) {
    // Create "restify" server object (if has not yet been created)
    server = restify.createServer({
      name: config.get("name"),
    })

    // TODO: Re-direct on case mismatch or trailing slash mismatch

    // TODO: Setup CORS

    // Establish middleware (built-in)
    server.use(restify.acceptParser(server.acceptable))
    server.use(restify.queryParser())
    server.use(restify.authorizationParser())
    server.use(restify.dateParser())
    server.use(restify.bodyParser({
      maxBodySize: 0,
      mapParams: false,
    }))

    // Setup a body parser to explode field references as x[y][z] to x.y.z
    server.use(parseObjectReference)
  }

  return server
}

function runWorker() {
  // Start listening ...
  var port = config.get("port")
  get().listen(port, () => {
    if ((cluster.isMaster || process.env.CHILD_ID === "0")
          && process.env.NODE_ENV !== "test") {
      log.warn("Listening at %s", get().url)
    }
  })
}

function gracefulExit() {
  // Wait at most 25~ seconds for requests to finish and then forcibly
  // terminate
  var timeout = 25000
  /* eslint-disable */
  setTimeout(function() {
    process.exit(1)
  }, timeout).unref()
  /* eslint-enable */

  // Request restify to close gracefully
  get().close(function() {
    // Drain the database connection queue
    db.quit().then(function() {
      // If this is a worker; let the master know
      if (cluster.worker) {
        cluster.worker.kill()
      } else {
        // The world has been cleaned; exit now
        /* eslint-disable */
        process.exit(128)
        /* eslint-enable */
      }
    })
  })
}

let terminateCount = 0
function onTerminate() {
  if (terminateCount === 0) {
    terminateCount += 1
    gracefulExit()
  } else {
    // Force exit immediately
    /* eslint-disable */
    process.exit(128)
    /* eslint-enable */
  }
}

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

    // Hook into termination and interrupt signals to gracefully stop
    cluster.on("disconnect", _.after(concurrency, function() {
      /* eslint-disable */
      process.exit(128);
      /* eslint-enable */
    }))

    // Restart the worker that exited pre-maturely
    var terminating = false;
    cluster.on('exit', function(worker) {
      if (terminating) return

      log.warn(`worker ${worker.process.pid} has exited, restarting ...`)

      // Restart the worker
      cluster.fork()
    })

    // Ignore termination signals on master
    function ignore() {
      terminating = true;
    }

    process.on("SIGTERM", ignore)
    process.on("SIGINT", ignore)

  } else {
    // In development or test environments, run a single process
    runWorker()

    // Hook into termination and interrupt signals to gracefully exit
    process.on("SIGTERM", onTerminate)
    process.on("SIGINT", onTerminate)
  }
}

export default {
  run
}
