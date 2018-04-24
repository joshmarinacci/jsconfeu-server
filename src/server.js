console.log("starting the jsconf eu server")
const PORT = 39176

const cors = require('cors')
const bodyParser = require('body-parser')
const fs = require('fs')
const express = require('express')
const path = require('path')
const Datastore = require('nedb')

const DB_FILE = path.join(process.cwd(),'modules.db')
const DB = new Datastore({filename: DB_FILE, autoload:true})

function setupServer() {
    //create the server
    const app = express()
    //make json formatting of REST APIs be pretty
    app.set("json spaces",4)
    //turn on CORS, Cross Origin Resource Sharing
    app.use(cors({origin:true}))
    //assume all bodies will be JSON and parse them automatically
    app.use(bodyParser.json())

    //get full info of a particular module
    app.get('/api/modules/:id', (req,res) => pFind({_id:id})).then(doc => res.json(doc))
    //list all modules, sorted by name, without the code
    app.get('/api/modules/', (req,res) => pFind({type:'module'},{name:1}).then(docs=>res.json(docs)))

}

