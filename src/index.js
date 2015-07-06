import server from "./server"
import resource from "./resource"
import config from "./config"
import * as util_ from "./util"

export let Resource = resource.Resource
export let mount = resource.mount
export let configure = config.configure
export let run = server.run
export let util = util_

export default {
  Resource,
  mount,
  configure,
  run,
  util
}
