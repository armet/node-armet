import server_ from "./server"
export const run = server_.run

import resource_ from "./resource"
export const Resource = resource_.Resource
export const mount = resource_.mount

import route_ from "./route"
export const head = route_.head
export const get = route_.get
export const post = route_.post
export const put = route_.put
export const patch = route_.patch
export const del = route_.del

import errors from "./errors"
export errors from "./errors"

import validators_ from "./validators"
import validate_ from "./validate"
export const validators = validators_
export const validate = validate_

import hub_ from "./hub"
export const on = hub_.on.bind(hub_)
export const off = hub_.removeListener.bind(hub_)
export const emit = hub_.emit.bind(hub_)

export default {
  run,
  Resource,
  mount,
  head, get, post, put, patch, del,
  errors,
  validators: validators_,
  validate: validate_,
  on, off, emit,
}
