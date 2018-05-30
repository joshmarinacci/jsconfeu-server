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

test('archive test',t => {
    //get all the modules
    GET(`${BASE}/modules`)
        //add the first module to the queue
        .then(mods=> {
            const mod = mods[0]
            console.log("the first module is", mod)
            const queue = [mod._id]
            console.log("submitting the queue", queue)
            return POST(`${BASE}/updatequeue`, queue)
        })
        .then(ret=> t.true(ret.success))
        //get the queue
        .then(()=> GET(`${BASE}/queue`))
        //mark the first module of the queue as completed
        .then(res=> {
            console.log("the queue is", res.queue)
            const mod = res.queue.modules[0]
            console.log("the first module is", mod)
            return POST(`${BASE}/queue/complete/${mod}`)
        })
        //verify it worked
        .then(ret => t.true(ret.success))
        //verify the module is no longer in the queue
        .then(ret => GET(`${BASE}/queue`))
        .then(res => {
            console.log("the queue is", res.queue)
            const match = res.queue.modules.filter(mod => mod !== mod._id)
            console.log("confirming it's really gone",match)
            t.equal(match.length,0)
        })
        .then(()=> {
            t.end()
            process.exit(0)
        })
        .catch(e => {
            console.log('had an error',e)
            t.fail()
            process.exit(-1)
        })
})


