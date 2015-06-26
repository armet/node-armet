process.env.SUPPRESS_NO_CONFIG_WARNING = 'y';
var config = require('config');

// Declare default configuration
let defaults = {
  // Name of the API server (for the `Server` response header)
  name: "Armet",

  // Enable cluster by-default if we're in production
  cluster: (process.env.NODE_ENV === "production"),

  // Bind address of the API server
  host: "0.0.0.0",
  port: 9090,

  // Default log-level
  log: "info"
}

// Setup default configuration
config.util.setModuleDefaults('armet', defaults);

export function configure(options = {}) {
  // Mixin configs that have been passed in, and make those my defaults
  config.util.extendDeep(defaults, options);
  config.util.setModuleDefaults('armet', defaults);
}

export function has(key) { return config.has(`armet.${key}`) }
export function get(key) { return config.get(`armet.${key}`) }

export default {
  configure,
  get,
  has
}
