import { Router } from 'express'
import { categoryController } from '../controllers/categories.js'
import * as tasks from '../controllers/tasks.js'
import { taskCategories } from '../services/categories.js'

export const taskRoutes = Router()
taskRoutes.get('/', tasks.list)
taskRoutes.post('/', tasks.create)
taskRoutes.get('/:id', tasks.show)
taskRoutes.patch('/:id', tasks.update)
taskRoutes.patch('/:id/complete', tasks.complete)
taskRoutes.delete('/:id', tasks.remove)

const categories = categoryController(taskCategories)
export const taskCategoryRoutes = Router()
taskCategoryRoutes.get('/', categories.list)
taskCategoryRoutes.post('/', categories.create)
taskCategoryRoutes.patch('/:id', categories.update)
taskCategoryRoutes.delete('/:id', categories.remove)
