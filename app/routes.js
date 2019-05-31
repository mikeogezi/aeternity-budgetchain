'use strict'

let _ = require('underscore')
let fs = require('fs')
let path = require('path')
let request = require('request')
let util = require('util')

let Datastore = require('nedb')
let db = {
    budgets: new Datastore({
        filename: './db/budgets',
        autoload: true
    })
}

const BUDGET_ALLOCATION = 'allocation'
const BUDGET_SPENDING = 'spending'

const insErrMsg = 'An error occured while inserting a new budget document'
const qErrMsg = 'An error occured while querying the database'
const sMsg = 'A new budget document was successfully inserted'

let index = (req, res, next) => {
    res.render('home', {
        title: 'Home - BudgetChain'
    })
}

/*
    This shows a form where a new budget can be allocated
*/
let allocateBudget = (req, res, next) => {
    res.render('allocateBudget', {
        title: 'Record Budget Allocation - BudgetChain'
    })
}

/*
    This controls how the submissions from the budget allocation form are handled
*/
let postAllocateBudget = (req, res, next) => {
    let { description, 
        from, 
        to, 
        amount } = req.body


    const fields = [ description, from, to ]
    for (let i in fields) {
        let field = fields[i]
        if (!util.isString(field)) {
            return res.send(`The \'${i == 0 ? 'description' : i == 1 ? 'from' : 'to'}\' field must be a string`)
        }
    }

    amount = parseFloat(amount)
    if (!util.isNumber(amount) || Number.isNaN(amount) || amount < 0) {
        return res.send('The \'amount\' field must be a positive number')
    }

    let doc = {
        description,
        from, 
        to,
        amount,
        type: BUDGET_ALLOCATION,
        timestamp: Date.now()
    }

    console.log(doc)

    db.budgets.insert(doc, (err, newDoc) => {
        if (err) {
            console.error(err)
            return res.send(insErrMsg)
        }
        console.log(sMsg)
        return res.redirect('/spend-budget')
    })
}

/*
    This shows a form where funds from an already allocated budget can be spent
*/
let spendBudget = (req, res, next) => {
    db.budgets.find({}, (err, docs) => {
        if (err) {
            console.error(err)
            return res.send(qErrMsg)
        }

        res.render('spendBudget', {
            title: 'Record Budget Spending - BudgetChain',
            budgets: docs
        })
    })
}

/*
    Calculate the balance of a budget after subtracting the amounts that have been removed from it
*/
function calculateBalance (budget, budgets) {
    var balance = budget.amount
    for (const b of budgets) {
        if (b._id != budget._id && b.parentId == budget._id) {
            balance -= b.amount
        }
    }

    return balance
}

/*
    This controls the submissions to the budget spending form
*/
let postSpendBudget = (req, res, next) => {
    // budgetId examples
    // allocation_xcknfinuenofs
    // spending_xcknfinuenofs
    let { budgetId, 
        reason, 
        amount, 
        description } = req.body

        console.log(req.body)

    const fields = [ budgetId, reason, description ]
    for (let i in fields) {
        let field = fields[i]
        if (!util.isString(field)) {
            return res.send(`The \'${i == 0 ? 'budgetId' : i == 1 ? 'reason' : 'description'}\' field must be a string`)
        }
    }

    amount = parseFloat(amount)
    if (!util.isNumber(amount) || Number.isNaN(amount) || amount < 0) {
        return res.send('The \'amount\' field must be a positive number')
    }

    let isAllocation = budgetId.startsWith(BUDGET_ALLOCATION + '_')
    let isSpending = budgetId.startsWith(BUDGET_SPENDING + '_')
    if (!isAllocation && !isSpending) {
        return res.send('The \'budgetId\' field is invalid')
    }
    budgetId = budgetId.split('_')[1]

    let doc = {
        reason,
        amount,
        description,
        type: BUDGET_SPENDING,
        parentId: budgetId,
        timestamp: Date.now()
    }

    console.log(doc)

    let query = { _id: budgetId }
    db.budgets.findOne(query, (qErr, qDoc) => {
        console.log(qDoc, doc.amount)
        if (qErr) {
            console.error(qErr)
            return res.send(qErrMsg)
        }
        else {
            db.budgets.find({ parentId: budgetId }, (e, budgets) => {
                if (e) {
                    console.error(e)
                    return res.send(qErrMsg)
                }

                let balance = calculateBalance(qDoc, budgets)
                if (balance < doc.amount) {
                    const errMsg = `The amount being spent (NGN ${doc.amount.toLocaleString()}) is greater than the available budget (NGN ${balance.toLocaleString()})`
                    console.error(errMsg)
                    return res.send(errMsg)
                }

                doc.parentDescription = qDoc.description || qDoc.parentDescription
                doc.parentTo = qDoc.to || qDoc.parentTo
                doc.parentReason = qDoc.reason || ''
                db.budgets.insert(doc, (iErr, iDoc) => {
                    if (iErr) {
                        console.error(err)
                        return res.send(insErrMsg)
                    }
                    console.log(sMsg)
                    return res.redirect('/view-blockchain-diagram')
                })
            })
        }
    })
}

/*
    This shows the blockchain and how funds can be tracked on it
*/
let viewBlockchain = (req, res, next) => {
    let { id } = req.params

    res.render('viewBlockchain', {
        title: 'View Budget Blockchain - BudgetChain'
    })
}

/*
    This shows a tree diagram of the blockchain entries
*/
let viewBlockchainDiagram = (req, res, next) => {
    db.budgets.find({}, (err, docs) => {
        if (err) {
            console.error(err)
            return res.send(qErrMsg)
        }

        res.render('viewBlockchainDiagram', {
            title: 'Blockchain Diagram - BudgetChain',
            needTree: true,
            budgets: docs
        })
    })
}

/*
    This method populates the database with some dummy data
*/
let populateDB = (req, res, next) => {
    const docs = [
        {
            _id: '1',
            from: 'University of Jos Management',
            to: 'ICT Directorate',
            amount: 5000000,
            description: 'Annual Budget',
            type: BUDGET_ALLOCATION,
            timestamp: 1000,
        },
        {
            _id: '2',
            reason: 'Purchasing PCs',
            amount: 500000,
            description: '',
            type: BUDGET_SPENDING,
            parentId: '1',
            parentTo: 'ICT Directorate',
            parentDescription: 'Annual Budget',
            timestamp: 10000,
        },
        {
            _id: '3',
            reason: 'Upgrading Network Infrastructure',
            amount: 1000000,
            description: '',
            type: BUDGET_SPENDING,
            parentId: '1',
            parentTo: 'ICT Directorate',
            parentDescription: 'Annual Budget',
            timestamp: 20000,
        },
        {
            _id: '4',
            reason: 'Buying Routers',
            amount: 500000,
            description: '',            
            parentReason: 'Upgrading Network Infrastructure',
            type: BUDGET_SPENDING,
            parentId: '3',
            parentTo: 'ICT Directorate',
            parentDescription: 'Annual Budget',
            timestamp: 400000,
        },
        {
            _id: '5',
            reason: 'Improved ISP Annual Fees',
            amount: 500000,
            description: '',
            parentReason: 'Upgrading Network Infrastructure',
            type: BUDGET_SPENDING,
            parentId: '3',
            parentTo: 'ICT Directorate',
            parentDescription: 'Annual Budget',
            timestamp: 200000,
        }
    ]

    db.budgets.insert(docs, (err, newDoc) => {
        if (err) {
            console.error(err)
            return res.send(insErrMsg)
        }
        return res.redirect('/db')
    })
}

/*
    This clears the contents of the database by deleting the database file
*/
let clearDB = (req, res, next) => {
    require('fs').unlink('./db/budgets', err => {
        if (err) {
            console.error(err)
            return res.send('An error occured while deleting the database')
        }
        db.budgets.loadDatabase()
        return res.redirect('/db')
    })
}

/*
    This method renders a view that provides links to database methods of clear and populate
*/
let dbMethods = (req, res, next) => { 
    res.render('dbMethods')
}

module.exports = {
    index,

    allocateBudget,
    postAllocateBudget,

    spendBudget,
    postSpendBudget,

    viewBlockchain,
    viewBlockchainDiagram,

    dbMethods,
    populateDB,
    clearDB,
}
