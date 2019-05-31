'use strict'

let path = require('path')
let express = require('express')
let bodyParser = require('body-parser')
let favicon = require('serve-favicon')
let ms = require('ms')
let compression = require('compression')

let routes = require('./app/routes')

let app = express()

app.set('homedir', __dirname)
app.set('port', process.env.PORT || 3000)
app.set('views', __dirname + '/public/views/pug')
app.set('view engine', 'pug')

app.locals.year = new Date().getFullYear()
app.locals.designerPersonThree = 'Team BudgetChain' // 'Michael Ogezi'
app.locals.designerPersonThreeSite = 'http://github.com/okibeogezi'

app.use(compression())
app.use(express.static(path.join(__dirname + '/public'), {
    maxAge: process.env.NODE_ENV == 'production' ? ms('365 days') : ms('0')
}))
app.use(bodyParser.json())
app.use(favicon(path.join(__dirname, '/public/images/icon.ico')))
app.use(bodyParser.urlencoded({
    extended: false
}))

app.get('/', routes.index)

app.get('/allocate-budget', routes.allocateBudget)
app.post('/allocate-budget', routes.postAllocateBudget)

app.get('/spend-budget', routes.spendBudget)
app.post('/spend-budget', routes.postSpendBudget)

app.get('/view-blockchain/:id?', routes.viewBlockchain)
app.get('/view-blockchain-diagram', routes.viewBlockchainDiagram)

app.get('/db', routes.dbMethods)
app.get('/populate-db', routes.populateDB)
app.get('/clear-db', routes.clearDB)

app.locals.pretty = true

app.listen(app.get('port'), () => {
    console.log(`Listening or port ${app.get('port')} in ${process.env.NODE_ENV} mode`)
})
