import type { Request } from 'express'
import { id } from '../validation/common.js'

/** Parses the :id route param, throwing a 400 for anything but a positive integer. */
export function paramId(req: Request): number {
  return id.parse(req.params.id)
}
