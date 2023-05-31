const express = require("express")
const cors = require("cors")
const port = process.env.PORT || 1000
const jwt = require('jsonwebtoken')
const app = express()
require('dotenv').config()

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

 

app.use(express.json())
app.use(cors())


const verifyJWT = (req,res,next) =>{
  const authorization = req.headers.authorization
  if(!authorization){
    res.status(401).res.send( {error:true,message:"unauthorization access"})
  }

  // token 
  const token = authorization.split(' ')[1]
  jwt.verify(token,process.env.ACCESS_TOKEN, (err,decoded)=>{
    if(err){
      return res.status(401).res.send({error:true,message:"unauthorization access"})
    }
    req.decoded = decoded
    next()
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.va9oo.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    const userDatabase = client.db("bistroDB").collection("users")
    const bistroDatabase = client.db("bistroDB").collection("menu")
    const reviewsDatabase = client.db("bistroDB").collection("reviews")
    const cartCollection = client.db("bistroDB").collection("carts")

    // json token // 

    app.post('/jwt',(req,res)=>{
      const user = req.body 
      const token = jwt.sign(user,process.env.ACCESS_TOKEN,  { expiresIn: '1h' })
      res.send({token})
    })
    //get the data 
    app.get("/menu",async(req,res)=>{
      const result = await bistroDatabase.find().toArray()
      res.send(result)
    })

        // Warning: use verifyJWT before using verifyAdmin
        const verifyAdmin = async (req, res, next) => {
          const email = req.decoded.email;
          const query = { email: email }
          const user = await userDatabase.findOne(query);
          if (user?.role !== 'admin') {
            return res.status(403).send({ error: true, message: 'forbidden message' });
          }
          next();
        }
    app.get("/users",verifyJWT, verifyAdmin, async(req,res)=>{
      const result = await userDatabase.find().toArray()
      res.send(result)
    })


    // security layer: verifyJWT
    // email same 
    // check admin
      // app.get("/users/admin/:email",verifyJWT, async(req,res) =>{
      //   const email = req.params.email 
      //   if(req.decoded.email !==email){
      //     res.send({admin:false})
      //   }
      //   const query = {email:email}
      //   const user = await userDatabase.findOne(query)
      //   const result = {admin: user?.role ==='admin'}
      //   res.send(result)
      // })

       // security layer: verifyJWT
    // email same
    // check admin
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await userDatabase.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })
    // app update data 
    app.patch('/users/admin/:id', async(req,res) =>{
      const id = req.params.id 
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          role:'admin'
        },
      };

      const result = await userDatabase.updateOne(filter,updateDoc)
      res.send(result)
    })
    app.post("/users",async(req,res)=>{
      const user = req.body
      console.log(user)
      const query = {email: user.email}
      const existingUser = await userDatabase.findOne(query)
      console.log('existing user',existingUser)
      if(existingUser){
        return res.send({message:'user already exits'})
      }
      const result = await userDatabase.insertOne(user)
      res.send(result)
    })

    
    // pratice 
    // app.post("/userss", async(req,res)=>{
    //   const user = req.body 
    //   const query = {email:user.email}
    //   const result = await userDatabase.insertOne()
    // }) 
    // or more practice 

    //get the data 
    app.get("/reviews",async(req,res)=>{
      const result = await reviewsDatabase.find().toArray()
      res.send(result)
    })

    // cart collection 
    app.get("/carts",verifyJWT, async(req,res)=>{
      const email = req.query.email
      if(!email){
         res.send([])
      }
      const decodedEmail = req.decoded.email 
      if(email !==decodedEmail){
        return res.status(403).send({error:true,message:'Porviden access'})
      }
        const query = {email:email}
       const result = await cartCollection.find(query).toArray()
     return res.send(result)
    })
    app.post("/carts",async(req,res) =>{
      const item = req.body 
      const result = await cartCollection.insertOne(item)
      res.send(result)
    })

    app.delete("/carts/:id",async(req,res) =>{
      const id = req.params.id 
      const query = {_id: new ObjectId(id)}
      const result = await cartCollection.deleteOne(query)
      res.send(result)
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/",async(req,res)=>{
  res.send("Bistro server is running")
})

app.listen(port,()=>{
  console.log(`Bistro server is running on ${port}`)
})
