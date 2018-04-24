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


//call nedb.find as a promise
function pFind(query,options) {
    return new Promise((res,rej)=>{
        DB.find(query,options,(err,docs)=>{
            if(err) return rej(err)
            return res(docs)
        })
    })
}

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
    app.get('/api/modules/:id', (req,res) => pFind({_id:req.params.id}).then(doc => res.json(doc)))
    //list all modules, sorted by name, without the code
    app.get('/api/modules/', (req,res) => pFind({type:'module'},{name:1}).then(docs=>res.json(docs)))
    //return the queue object which lists ids of
    app.get('/api/queue/',(req,res) =>
        pFind({type:'queue'})
            .then((queue)=>{
                return Promise.all(queue[0].modules.map(id=>pFind({_id:id})))
            })
            .then((docs)=>{
                return docs.map(doc=>doc[0])
            })
        .then(doc=>res.json(doc)))

    app.listen(PORT, () => console.log(`
        modules server http://localhost:${PORT}/ 
        database  ${DB_FILE}`))
}

setupServer()

