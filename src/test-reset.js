const path = require('path')
const fs = require('fs')
const Datastore = require('nedb')
const DB_FILE = path.join(process.cwd(),'modules.db')
const DB = new Datastore({filename: DB_FILE, autoload:true})

function deleteAllDocs() {
    return new Promise((res,rej)=>{
        DB.remove({},{multi:true},(err,num) => {
            if(err) return rej(err)
            return res(num)
        })

    })
}

function insertDoc(doc) {
    return new Promise((res,rej) => {
        DB.insert(doc,(err,newDoc)=>{
            if(err) return rej(err)
            return res(newDoc)
        })
    })
}

function loadTestDocs() {
    return new Promise((res,rej)=>{
        fs.readFile(path.join(process.cwd(),'src','test-modules.json'),(err,json) => {
            if(err) return rej(err)
            return res(JSON.parse(json.toString()))
        })
    })
}


Promise.resolve()
    .then(deleteAllDocs)
    .then(loadTestDocs)
    .then(docs=> Promise.all(docs.modules.map(insertDoc)))
    .then((results)=>{
        console.log(`inserted ${results.length} modules`)
    })
    .catch((e)=>{
        console.log("error ",e)
    })
