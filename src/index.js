import server from "./server"
import resource from "./resource"
import config from "./config"
import route from "./route"
import * as util_ from "./util"

export let Resource = resource.Resource
export let mount = resource.mount
export let configure = config.configure
export let run = server.run
export let util = util_

export let head = route.head
export let get = route.get
export let post = route.post
export let put = route.put
export let patch = route.patch
export let del = route.del

export default {
  Resource,
  mount,
  configure,
  run,
  util,
  head,
  get,
  post,
  put,
  patch,
  del
}
