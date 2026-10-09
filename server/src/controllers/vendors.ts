import type { Request, Response } from 'express'
import { currentUser } from '../middleware/requireAuth.js'
import { createVendor, deleteVendor, getVendorDetail, listVendors, updateVendor } from '../services/vendors.js'
import { sendItem, sendList, sendNoContent } from '../utils/respond.js'
import { vendorCreateSchema, vendorQuerySchema, vendorUpdateSchema } from '../validation/vendors.js'
import { paramId } from './helpers.js'

export function list(req: Request, res: Response): void {
  const { rows, total } = listVendors(vendorQuerySchema.parse(req.query))
  sendList(res, rows, total)
}

export function show(req: Request, res: Response): void {
  sendItem(res, getVendorDetail(paramId(req)))
}

export function create(req: Request, res: Response): void {
  sendItem(res, createVendor(currentUser(req).id, vendorCreateSchema.parse(req.body)), 201)
}

export function update(req: Request, res: Response): void {
  sendItem(res, updateVendor(currentUser(req).id, paramId(req), vendorUpdateSchema.parse(req.body)))
}

export function remove(req: Request, res: Response): void {
  deleteVendor(currentUser(req).id, paramId(req))
  sendNoContent(res)
}
