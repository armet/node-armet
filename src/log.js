import config from "./config"
export default require("simple-bunyan")("armet", config.get("log"))
