const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();
//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lugn3.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// console.log(uri);
async function run() {
  try {
    await client.connect();
    const partsCollection = client.db('laptop-menufecture').collection('parts');
    const orderCollection = client.db('laptop-menufecture').collection('order');
    //server api
    app.get('/parts',async(req,res)=>{
        const query = {}; 
        const cursor = partsCollection.find(query);
        const parts = await cursor.toArray();
        // console.log(parts);
        res.send(parts)
    });

    app.get('/parts/:id', async(req,res)=>{
        const id = req.params.id;
        const query = {_id: ObjectId(id)};
        const parts = await partsCollection.findOne(query);
        res.send(parts);
    });

    app.get('/order', async(req, res)=>{
      // const query = {};
      // const order = orderCollection.find(query);
      // const result = await order.toArray();
      // res.send(result)

      const user = req.query.user;
      const query = {user: user};
      console.log(query);
      const result = await orderCollection.find(query).toArray();
      console.log(result);
      res.send(result)
    })

    app.post('/order', async(req, res)=>{
      const order = req.body;
      // console.log(order);
      const query = {id: order.orderId, orderItem: order.order, user: order.user}
      // console.log(query);
      const exists = await orderCollection.findOne(query);
      if(exists){
        console.log('exists');
        return res.send({success: false, order: exists})
      }
      const result = await orderCollection.insertOne(order);
      return res.send({success: true, result})
    })

  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
