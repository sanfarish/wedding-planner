import { Router } from 'express'
import { categoryController } from '../controllers/categories.js'
import * as expenses from '../controllers/expenses.js'
import { budgetCategories } from '../services/categories.js'

export const budgetRoutes = Router()
budgetRoutes.get('/summary', expenses.summary)

export const expenseRoutes = Router()
expenseRoutes.get('/', expenses.list)
expenseRoutes.post('/', expenses.create)
expenseRoutes.get('/:id', expenses.show)
expenseRoutes.patch('/:id', expenses.update)
expenseRoutes.delete('/:id', expenses.remove)

const categories = categoryController(budgetCategories)
export const budgetCategoryRoutes = Router()
budgetCategoryRoutes.get('/', categories.list)
budgetCategoryRoutes.post('/', categories.create)
budgetCategoryRoutes.patch('/:id', categories.update)
budgetCategoryRoutes.delete('/:id', categories.remove)
