import config from "./config"
export default require("simple-bunyan")(
  config.get("name").toLowerCase(),
  config.get("log")
)
