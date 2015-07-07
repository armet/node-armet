import {get as getServer} from "./server"

export function head(path, ...handlers) {
  getServer().head(path, ...handlers)
}

export function get(path, ...handlers) {
  getServer().get(path, ...handlers)
}

export function post(path, ...handlers) {
  getServer().post(path, ...handlers)
}

export function put(path, ...handlers) {
  getServer().put(path, ...handlers)
}

export function patch(path, ...handlers) {
  getServer().patch(path, ...handlers)
}

export function del(path, ...handlers) {
  getServer().del(path, ...handlers)
}

export default {
  head,
  get,
  post,
  put,
  patch,
  del
}
