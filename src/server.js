import shortid from "shortid"
import microtime from "microtime"
import _ from "lodash"
import os from "os"
import restify from "restify"
import cluster from "cluster"
import config from "./config"
import log from "./log"
import {db} from "bardo"
import {HTTPError} from "./errors"

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

function trace(req, statusCode) {
  let elapsed = +((microtime.now() - req.startedAt) / 1000).toFixed(2)
  if (config.get("trace")) {
    // Log the request latency
    var level = statusCode >= 500 ? "error" : "info"
    req.log[level]({elapsed: `${elapsed}ms`}, "%s %s -> %s",
      req.method, req.path(), statusCode)
  }
}

function uncaughtException(req, res, route, err) {
  let statusCode = 500
  let body = null

  function inner() {
    // Release the database connection (if it has been acquired)
    Promise.resolve(db.end()).then(function() {
      if (err instanceof HTTPError) {
        // Yes return the proper validation error
        statusCode = err.statusCode
        body = err.body
      } else {
        // Log the exception
        log.error(err)
      }

      if (res.headersSent) {
        return
      }

      // Trace the request
      trace(req, statusCode)

      // Send the error response back to the client
      res.send(statusCode, body)
    })
  }

  req.domain.run(inner)
}

var server = null
export function get() {
  if (server == null) {
    // Create "restify" server object (if has not yet been created)
    server = restify.createServer({
      name: config.get("name"),
    })

    // Setup a request logger (to both log and time requests)
    server.pre(function(req, res, next) {
      // Bind the logger to the request
      // var reqId = shortid.generate()
      req.id = shortid.generate()
      req.log = log.child({"req_id": req.id})

      // Store the start time for the request
      req.startedAt = microtime.now()

      return next()
    })

    // TODO: Re-direct on case mismatch or trailing slash mismatch

    // Setup CORS
    // This is for simple request methods: GET POST HEAD, and actual requests, and
    // redirects.
    server.use(function(req, res, next) {
      // Grab the origin header. If there's no origin, we need to gtfo.
      // If the supplied origin is not on our allowed list, back out.
      // This is shared between preflights and requests, so just do it here.
      let origin = req.header("Origin")
      if (origin == null) return next()
      let allowedOrigins = config.get("origins")
      let valid = false
      if (allowedOrigins === "*") valid = true
      else {
        for (let allowedOrigin of allowedOrigins) {
          if (_.endsWith(origin, allowedOring)) {
            valid = true
            break
          }
        }
      }
      if (!valid) return next()
      res.header("Access-Control-Allow-Origin", origin)
      res.header("Access-Control-Allow-Credentials", "true")

      // Check to see if this a preflight request. If so, this isn't where we
      // handle it.
      if (req.method === "OPTIONS") return next()

      // Add our exposed headers
      let exposedHeaders = config.get("headers.response")
      if (exposedHeaders.length > 0) {
        res.header("Access-Control-Expose-Headers", exposedHeaders.join(","))
      }

      return next()
    })

    // Set up a global options route
    // This will handle the preflight CORS issues.
    server.opts(/.*/, function(req, res, next) {
      // We've already taken care of the origin portion of the CORS preflight.
      // Grab the requested method, and parse the requested headers.
      let method = req.header("Access-Control-Request-Method")
      let requestHeaders = req.header("Access-Control-Request-Headers") || ""
      requestHeaders = requestHeaders
        .toLowerCase().replace(/\s/g, "").split(",")

      // Ensure that we have a valid handler for this method, for this route
      var pathname = require("url").parse(req.url).pathname
      if (!_.any(server.router.routes[method], route => {
        return route.path.test(pathname)
      })) {
        res.send(200)
        return next()
      }

      // Add our allowed method (just the method requested)
      res.header("Access-Control-Allow-Methods", method)

      // Add our max Cache time
      res.header("Access-Control-Max-Age", config.maxCacheInterval)

      // Check to make sure that the requested headers are part of our allowed
      // headers.
      let allowedHeaders = config.get("headers.request").map(
        x => x.toLowerCase())

      if (_.difference(requestHeaders, allowedHeaders).length !== 0) {
        res.send(200)
        return next()
      }

      // Add our allowed headers
      res.header("Access-Control-Allow-Headers",
        config.get("headers.request").join(","))

      res.send(200)
      return next()
    })

    // Establish middleware (built-in)
    server.use(restify.acceptParser(server.acceptable))
    server.use(restify.queryParser())
    server.use(restify.authorizationParser())
    server.use(restify.dateParser())
    server.use(restify.bodyParser({
      maxBodySize: 0,
      maxFieldsSize: 30 * 1024 * 1024,  // 30 MiB
      mapParams: false,
    }))

    // Setup a body parser to explode field references as x[y][z] to x.y.z
    server.use(parseObjectReference)

    // Setup a NotFound handler
    // NOTE: This prevents restify from sending a response on 404; keep
    //       our errors clean
    server.on("NotFound", function(req, res, err, next) {
      res.send(404)
      return next()
    })

    // Setup a request exception handler
    server.on("uncaughtException", uncaughtException)

    // Trace the request
    server.on("after", function(req, res) {
      // Release the database connection (if it has been acquired)
      req.domain.run(function() {
        Promise.resolve(db.end()).then(function() {
          // Trace the request
          trace(req, res.statusCode)
        })
      })
    })
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
    var terminating = false
    cluster.on("exit", function(worker) {
      if (terminating) return

      log.warn(`worker ${worker.process.pid} has exited, restarting ...`)

      // Restart the worker
      cluster.fork()
    })

    // Ignore termination signals on master
    function ignore() {
      terminating = true
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
