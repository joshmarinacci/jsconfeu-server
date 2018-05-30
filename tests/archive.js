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
    let doc = null
    GET(`${BASE}/modules`)
        .then(mods=> {
            const mod = mods[0]
            console.log("the first module is",mod)
            POST(`${BASE}/modules/archive/${mod._id}`)
                .then(ret => {
                    t.true(ret.success)
                    return GET(`${BASE}/modules`)
                })
                .then(mods => {
                    console.log("confirming it's really gone",mods)
                    t.notEqual(mods[0]._id,mod._id)
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


