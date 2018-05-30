console.log("starting the jsconf eu server")
const PORT = 39176

const cors = require('cors')
const bodyParser = require('body-parser')
const fs = require('fs')
const express = require('express')
const path = require('path')
const Datastore = require('nedb')
const passport = require('passport')
const GithubStrategy = require('passport-github')

const SECRETS = {
    GITHUB_CLIENT_ID:'f85c3170e290cad01938',
    GITHUB_CLIENT_SECRET:'b08c48e264f24ef13ce369936365b1829598390c',
    GITHUB_CALLBACK_URL:'https://vr.josh.earth/jsconfeu-builder/api/github/callback'
}

const ADMIN_USERS = ['joshmarinacci','slightlyoffbeat','sandrapersing','linclark','tschneidereit']


const DB_FILE = path.join(process.cwd(),'modules.db')
const DB = new Datastore({filename: DB_FILE, autoload:true})

const ANIM_DIR = path.join(process.cwd(),'anims')
console.log(fs.existsSync(ANIM_DIR))
if(!fs.existsSync(ANIM_DIR)) fs.mkdirSync(ANIM_DIR)

const USERS = {}
const SETTINGS = {
    SKIP_AUTH:false,
}

//call nedb.find as a promise
function pFind(query,options) {
    return new Promise((res,rej)=>{
        DB.find(query,options,(err,docs)=>{
            if(err) return rej(err)
            return res(docs)
        })
    })
}

function pInsert(doc) {
    return new Promise((res,rej)=>{
        DB.insert(doc,(err,newDoc)=>{
            if(err) return rej(err)
            return res(newDoc)
        })
    })
}

function saveModule(module) {
    return Promise.resolve(null).then(() => {
        module.type = 'module'
        module.timestamp = Date.now()
        const manifest = module.manifest
        delete module.manifest
        module.animpath = `anim_${Math.random()}_.json`
        const apath = path.join(ANIM_DIR,module.animpath)
        fs.writeFileSync(apath,JSON.stringify(manifest))
        return pInsert(module)
    })
}

function pUpdate(query,doc) {
    return new Promise((res,rej)=>{
        DB.update(query,doc,{returnUpdatedDocs:true},(err,num,newDoc)=>{
            if(err) return rej(err)
            return res(newDoc)
        })
    })
}

function findAllModules() {
    return new Promise((res,rej)=>{
        DB.find({type:'module', $not:{archived:true}})
            .sort({timestamp:-1})
            .projection({javascript:0, json:0, manifest:0})
            .exec((err,docs)=>{
            if(err) return rej(err)
            return res(docs)
        })
    })
}

function findModuleByIdCompact(id) {
    return new Promise((res,rej)=>{
        DB.find({_id:id})
            .projection({javascript:0, json:0, manifest:0})
            .exec((err,docs)=>{
                if(err) return rej(err)
                return res(docs[0])
            })
    })
}

function getFullModuleById(id) {
    return new Promise((res,rej)=>{
        DB.find({_id:id})
            .exec((err,docs)=>{
                if(err) return rej(err)
                const mod = docs[0]
                mod.manifest = JSON.parse(fs.readFileSync(path.join(ANIM_DIR,mod.animpath)).toString())
                return res(mod)
            })
    })
}

function pUpdateFields(query, fields) {
    return new Promise((res,rej)=>{
        DB.update(query,
            {$set:fields},
            {returnUpdatedDocs:true},
            (err,num,docs)=>{
                if(err) return rej(err)
                console.log("num updated",num)
                return res(docs)
            })
    })
}

function checkAuth(req,res,next) {
    if(SETTINGS.SKIP_AUTH) return next()
    if(!req.headers['access-key']) return res.json({success:false,message:'missing access token'})
    const token = req.headers['access-key']
    const user = USERS[token]
    if(!user) return res.json({success:false,message:'invalid access token, cannot find user'})
    next()
}

function checkAdminAuth(req,res,next) {
    if(SETTINGS.SKIP_AUTH) return next()
    if(!req.headers['access-key']) return res.json({success:false,message:'missing access token'})
    const token = req.headers['access-key']
    const user = USERS[token]
    if(!user) return res.json({success:false,message:'invalid access token, cannot find user'})
    if(ADMIN_USERS.indexOf(user.username) < 0) {
        return res.json({success:false,message:'this user is not allowed to update the queue'})
    }
    next()
}

function setupServer() {
    //create the server
    const app = express()
    //make json formatting of REST APIs be pretty
    app.set("json spaces",4)
    //turn on CORS, Cross Origin Resource Sharing. allow all origins
    app.use(cors({origin:"*"}))
    //assume all bodies will be JSON and parse them automatically
    app.use(bodyParser.json({limit:'20MB'}))

    passport.use(new GithubStrategy({
        clientID: SECRETS.GITHUB_CLIENT_ID,
        clientSecret: SECRETS.GITHUB_CLIENT_SECRET,
        callbackURL: SECRETS.GITHUB_CALLBACK_URL
    },function(accessToken, refreshToken, profile, done) {
        //store the user profile in memory by access token
        USERS[accessToken] = profile
        done(null, {id:profile.id, accessToken: accessToken})
    }))

    app.use(passport.initialize())


    //get full info of a particular module
    app.post('/api/modules/archive/:id', (req,res)=>{
        pUpdateFields({_id:req.params.id},{archived:true}).then((doc)=>{
            console.log("successfully archived it",doc)
            res.json({success:true, doc:doc})
        })
    })
    app.get('/api/modules/:id', (req,res) =>
        getFullModuleById(req.params.id)
            .then(mod => res.json({success:true, doc:mod}))
            .catch(e => {
                console.log("error getting full module by id",e)
                res.json({success:false, error:e})
            })
    )
    //list all modules, sorted by name, without the code
    app.get('/api/modules/', (req,res) =>
        findAllModules()
            .then(docs=>res.json(docs))
            .catch(e => {
                console.log("/api/modules error",e)
                res.json({success:false, error:e})
            })
        )
    //mark a particular item in the queue as completed
    app.post('/api/queue/complete/:id', (req,res)=>{
        console.log("trying to complete", req.params.id)
        pUpdateFields({_id:req.params.id},{completed:true}).then((doc)=> {
            console.log("successfully completed it", doc)
            return pFind({type: 'queue'})
        })
        .then((queues)=> {
            const queue = queues[0]
            console.log("old queue count",queue.modules)
            queue.modules = queue.modules.filter(mod=>mod !== req.params.id)
            console.log("new queue count", queue.modules)
            pUpdate({type:'queue'},queue)
                        .then(queue => res.json({success:true, queue:queue}))
        })
    })
    //return the queue object which lists ids of
    app.get('/api/queue/',(req,res) =>
        pFind({type:'queue'})
            .then((queues)=>{
                const queue = queues[0]
                return Promise.all(queue.modules.map(id=>findModuleByIdCompact(id)))
                .then(modules=>{
                    queue.expanded = modules
                    queue.expanded = queue.expanded.filter(mod => !mod.completed)
                    res.json({success:true, queue:queue})
                })
            }).catch((e)=>{
                console.log("/api/queue error",e)
                res.json({success:false, error:e})
            })
    )

    app.post('/api/publish/', checkAuth, (req,res)=>{
        saveModule(req.body)
            .then(doc => res.json({success:true, doc:doc}))
            .catch(e => {
                console.log("error inside save module",e)
                res.json({success:false, error:e})
            })
    })

    app.get('/api/github/login', (req,res)=>{
        const url = `https://github.com/login/oauth/authorize?client_id=${SECRETS.GITHUB_CLIENT_ID}&redirect_uri=${SECRETS.GITHUB_CALLBACK_URL}`
        console.log("requesting github login with url", url)
        res.json({action:'open-window', url:url})
    })

    app.get('/api/github/callback',
        passport.authenticate('github', {session:false}),
        (req,res) => {
            console.log("successfully authenticated from github")
            res.send(`<html>
<body>
    <p>great. you are authenticated. you may close this window now.</p>
    <script>
        document.body.onload = function() {
            const injectedUser = ${JSON.stringify(req.user)}
            console.log("the user is",injectedUser)
            const msg = {payload:injectedUser, status:'success'}
            console.log("msg",msg)
            console.log('location',window.opener.location,'*')
            window.opener.postMessage(msg, '*')
            console.log("done popsting a message")
        }
</script>
</body>
</html>`)
    })


    app.get('/api/userinfo', (req,res) => {
        const user = USERS[req.query.accesstoken]
        if(user) {
            user.admin = (ADMIN_USERS.indexOf(user.username) >= 0)
            return res.json({success:true,user:user})
        }
        res.json({success:false,message:"no user found with access token"+req.query.accesstoken})
    })

    app.post('/api/updatequeue', checkAdminAuth, (req,res) => {
        pFind({type:'queue'})
            .then((queues)=> {
                const queue = queues[0]
                queue.modules = req.body
                pUpdate({type:'queue'},queue)
                    .then(queue => res.json({success:true, queue:queue}))
            })
    })

    app.get('/metadata', (req,res) => generateEndpointMetadata(req,res))
    app.get('/frames/:chunknum', (req,res) => generateChunk(req,res))

    app.listen(PORT, () => console.log(`
        modules server http://localhost:${PORT}/ 
        database  ${DB_FILE}`))
}

function getFirstQueueModule() {
    return pFind({type:'queue'})
        .then((queues)=> {
            const queue = queues[0]
            console.log("the queue is", queue)
            const first = queue.modules[0]
            console.log("hte first is", first)
            return getFullModuleById(first).then(mod => {
                return mod
            })
        })
}
function generateEndpointMetadata(req,res) {
    return getFirstQueueModule().then(mod => {
        const anim = mod.manifest.animation
        res.json({
            fps: anim.fps,
            rows: anim.rows,
            cols: anim.cols,
            seconds: Math.floor(anim.frameCount / anim.fps),
            frameCount: anim.frameCount,
            chunks: 1,
        })
    })
}

function generateChunk(req,res) {
    return getFirstQueueModule().then(mod => {
        const anim = mod.manifest.animation
        const data = anim.data
        console.log('got the first module',data.length)
        const f1 = data[0]
        console.log("the first frame is", f1)
        const frame = decodePNGURL(f1,anim.rows, anim.cols)
        const chunk = [frame]
        return res.json(chunk)
    })
}


function decodePNGURL(url,rows,cols) {
    console.log("decoding",url,rows,cols)
    const frame = []
    for(let r=0; r<rows; r++) {
        const row = []
        for(let c=0; c<cols; c++) {
            if(c%2 ===0) {
                row[c] = [0, 0, 0]
            } else {
                row[c] = [255,0,0]
            }
        }
        frame[r] = row
    }
    return frame
}




setupServer()
module.exports = SETTINGS

