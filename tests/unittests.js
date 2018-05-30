const test = require('tape')
const server = require('../src/server')
const fetch = require('node-fetch')
console.log("the server should be started now");
server.SKIP_AUTH = true
console.log("the server is",server)
//connect to the server to get info
//verify the info is good
//
const BASE = "http://localhost:39176/api"

function GET(url) {
    return fetch(url)
        .then(res=>res.json())
}
function POST(url,body) {
    return fetch(url,{
        method:'POST',
        body:JSON.stringify(body),
        headers: {
            'content-type': 'application/json'
        },
    })
        .then(res=>res.json())
}

test('run queue',t => {
    let doc = null
    GET(`${BASE}/modules`)
        .then(mods=> {
            // console.log("got the modules",mods)
            if(!mods) t.fail()
        })
        .then(()=> {
            //publish a module and verify that it worked
            const mod = {title: 'unit test'}
            return POST(`${BASE}/publish`, mod)
                .then((ret) => {
                    console.log("got the return value", ret)
                    t.equal(ret.success, true)
                    doc = ret.doc
                    return doc
                })
        })
        .then(doc => {
            //verify the new doc is most recent module, and we have more than one
            return GET(`${BASE}/modules`).then((mods)=>{
                console.log("got back the modules",mods)
                t.equal(mods[0]._id,doc._id)
                t.true(mods.length>1)
                return doc
            })
        })
        .then((doc)=>{
            //submit to the queue and verify it's the only one
            const queue = [doc._id]
            console.log("submitting the queue",queue)
            return POST(`${BASE}/updatequeue`,queue)
                .then(ret=> t.true(ret.success))
                .then(()=>GET(`${BASE}/queue`))
                .then(ret=>{
                    t.true(ret.success)
                    t.equal(ret.queue.modules[0],doc._id)
                })
                .then(()=> {
                    t.end()
                    process.exit(0)
                })
        })
        .catch(e => {
            console.log('had an error',e)
            t.fail()
            process.exit(-1)
        })
})


