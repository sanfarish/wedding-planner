import { Router, type RequestHandler } from 'express'

interface CrudController {
  list: RequestHandler
  show: RequestHandler
  create: RequestHandler
  update: RequestHandler
  remove: RequestHandler
}

/** Standard REST routes: GET /, POST /, GET /:id, PATCH /:id, DELETE /:id. */
export function crudRoutes(controller: CrudController): Router {
  const router = Router()
  router.get('/', controller.list)
  router.post('/', controller.create)
  router.get('/:id', controller.show)
  router.patch('/:id', controller.update)
  router.delete('/:id', controller.remove)
  return router
}
