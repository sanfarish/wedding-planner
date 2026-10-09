import { Router } from 'express'
import * as guests from '../controllers/guests.js'

export const guestRoutes = Router()
guestRoutes.get('/', guests.list)
guestRoutes.get('/groups', guests.groups)
guestRoutes.post('/', guests.create)
guestRoutes.get('/:id', guests.show)
guestRoutes.patch('/:id', guests.update)
guestRoutes.delete('/:id', guests.remove)
