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


const WHITE = 0xFFFFFFFF;
const BLACK = 0x000000FF;
const RED   = 0xFF0000FF;
const GREEN   = 0x00FF00FF;

function makeFrameset(w,h,frameCount) {
    const frames = []
    // const w = 44
    // const h = 36
    // const frameCount = 10;
    for(let i=0; i<frameCount; i++) {
        const f1 = []
        for(let x = 0; x<w*h; x++) {
            f1[x] = BLACK
        }
        frames.push(f1)
    }
    return {
        width:w,
        height:h,
        frames:frames
    }
}

function getWidth(fs) { return fs.width }
function getHeight(fs) { return fs.height }
function getColorAt(fs, x,y, t) {
    const n = y * getWidth(fs) + x
    return fs.frames[t][n]
}

function getPixelRGBA(fs, x,y, f) {
    const n = y * getWidth(fs) + x
    return fs.frames[f][n]
}
function setPixelRGBA(fs, x,y, f, c) {
    const n = y * getWidth(fs) + x
    fs.frames[f][n] = c
    return c
}
function getFrameCount(fs) { return fs.frames.length }

function performDiagonalLines(old,ctx) {
    for(let f=0; f<ctx.getFrameCount(); f++) {
        for (let y = 0; y < ctx.getHeight(); y++) {
            for (let x = 0; x < ctx.getWidth(); x++) {
                ctx.setPixelRGBA(x, y, f, Math.floor((x + y) / 2) % 2 === 0 ? WHITE : BLACK)
            }
        }
    }
}

function makeStaticRed(ctx) {
    for(let f=0; f<ctx.getFrameCount(); f++) {
        for (let y = 0; y < ctx.getHeight(); y++) {
            for (let x = 0; x < ctx.getWidth(); x++) {
                ctx.setPixelRGBA(x, y, f, RED)
            }
        }
    }
}

function makeStaticDiagonals(ctx) {
    for(let f=0; f<ctx.getFrameCount(); f++) {
        for (let y = 0; y < ctx.getHeight(); y++) {
            for (let x = 0; x < ctx.getWidth(); x++) {
                ctx.setPixelRGBA(x, y, f, Math.floor((x + y) / 2) % 2 === 0 ? WHITE : BLACK)
            }
        }
    }
}

function performVerticalLines(old,ctx) {
    const w = ctx.getWidth()
    for(let f=0; f<ctx.getFrameCount(); f++) {
        for (let y = 0; y < ctx.getHeight(); y++) {
            for (let x = 0; x < ctx.getWidth(); x++) {
                if (x % 5 === 0) {
                    ctx.setPixelRGBA((x + f)%w, y, f, RED)
                } else {
                    ctx.setPixelRGBA((x + f)%w, y, f, old.getPixelRGBA((x+f)%w, y, f))
                }
            }
        }
    }
}

function makeMovingHorizLines(ctx) {
    for(let f=0; f<ctx.getFrameCount(); f++) {
        for (let y = 0; y < ctx.getHeight(); y++) {
            for (let x = 0; x < ctx.getWidth(); x++) {
                const col = (y+f)%5===0?GREEN:WHITE //make every 5th line be GREEN instead of WHITE
                ctx.setPixelRGBA(x, y, f, col)
            }
        }
    }
}

function performHorizontalLines(old_ctx,new_ctx) {
    for(let f=0; f<new_ctx.getFrameCount(); f++) {
        for (let y = 0; y < new_ctx.getHeight(); y++) {
            for (let x = 0; x < new_ctx.getWidth(); x++) {
                const old_color = old_ctx.getPixelRGBA(x,y,f)
                const col = y%5===0?RED:old_color //make every 5th line be red
                new_ctx.setPixelRGBA(x, y, f, col)
            }
        }
    }
}

function makeContext(frameset) {
    return {
        getHeight: function() { return getHeight(frameset)},
        getWidth: function() { return getWidth(frameset)},
        setPixelRGBA: function(x,y,f,c) { return setPixelRGBA(frameset, x,y,f,c) },
        getPixelRGBA: function(x,y,f  ) { return getPixelRGBA(frameset, x,y,f) },
        getFrameCount: function() { return getFrameCount(frameset)},
    }
}

function makeStaticRedDoc() {
    //insert red doc
    const frameset = makeFrameset(2,2,1)
    const ctx = makeContext(frameset)
    makeStaticRed(ctx)
    // console.log('made static red')
    const json = JSON.stringify(frameset)
    // console.log("json is",json)
    return {
        "type": "module",
        "origin": "builtin",
        "author": "jmarinacci@mozilla.com",
        "title": "plain red",
        "tags": ["builtin", "static", "javascript"],
        "description": "1 second frame of pure red",
        "javascript": makeStaticRed.toString(),
        "json": frameset
    }
}

function makeStaticDiagonalsDoc() {
    const frameset = makeFrameset(4,4,20)
    const ctx = makeContext(frameset)
    makeStaticDiagonals(ctx)
    const json = JSON.stringify(frameset)
    return {
        "type": "module",
        "origin": "builtin",
        "author": "jmarinacci@mozilla.com",
        "title": "plain red",
        "tags": ["builtin", "static", "javascript"],
        "description": "20 frames of 4x4 checkerboard",
        "javascript": makeStaticDiagonals.toString(),
        "json": frameset
    }
}

function makeHorizDoc() {
    const frameset = makeFrameset(20,20,20)
    const ctx = makeContext(frameset)
    makeMovingHorizLines(ctx)
    const json = JSON.stringify(frameset)
    return {
        "type": "module",
        "origin": "builtin",
        "author": "jmarinacci@mozilla.com",
        "title": "plain red",
        "tags": ["builtin", "static", "javascript"],
        "description": "20 frames of 4x4 checkerboard",
        "javascript": makeMovingHorizLines.toString(),
        "json": frameset
    }
}
Promise.resolve()
    .then(deleteAllDocs)
    .then(loadTestDocs)
    .then(docs=> Promise.all(docs.modules.map(insertDoc)))
    .then((results)=> {
        console.log(`inserted ${results.length} modules`)
        return Promise.resolve(results)
            .then((results)=>{
                return insertDoc(makeStaticRedDoc()).then((res)=>{
                    results.push(res);
                    return results
                })
            })
            .then((results)=>{
                return insertDoc(makeStaticDiagonalsDoc()).then((doc)=>{
                    results.push(doc)
                    return results
                })
            })
            .then((results)=>{
                return insertDoc(makeHorizDoc()).then((doc)=>{
                    results.push(doc)
                    return results
                })
            })
    })
    .then((results)=> {
        const queue = { type:'queue', modules:results.map(doc=>doc._id)}
        console.log("adding everything to the queue",queue)
        return insertDoc(queue)
    })
    .then((queue)=>{
        console.log("inserted the queue",queue)
    })
    .catch((e)=>{
        console.log("error ",e)
    })
