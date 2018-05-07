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


const DB_FILE = path.join(process.cwd(),'modules.db')
const DB = new Datastore({filename: DB_FILE, autoload:true})

const USERS = {}

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
    //turn on CORS, Cross Origin Resource Sharing. allow all origins
    app.use(cors({origin:"*"}))
    //assume all bodies will be JSON and parse them automatically
    app.use(bodyParser.json())

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

    // api.post('/api/publish/')

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
        console.log("user info request", req.query)
        const user = USERS[req.query.accesstoken]
        if(user) return res.json({success:true,user:user})
        res.json({success:false,message:"no user found with access token"+req.query.accesstoken})
    })

    app.listen(PORT, () => console.log(`
        modules server http://localhost:${PORT}/ 
        database  ${DB_FILE}`))
}

setupServer()

