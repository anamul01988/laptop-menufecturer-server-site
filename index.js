const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();
//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lugn3.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
// console.log(uri);
function verifyJWT(req, res, next) {
  // console.log('verifyjwt')
  const authHeader = req.headers.authorization;
  // console.log(authHeader);
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthirzed Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const partsCollection = client.db("laptop-menufecture").collection("parts");
    const orderCollection = client.db("laptop-menufecture").collection("order");
    const userCollection = client.db("laptop-menufecture").collection("users");
    //server api
    app.get("/parts", async (req, res) => {
      const query = {};
      const cursor = partsCollection.find(query);
      const parts = await cursor.toArray();
      // console.log(parts);
      res.send(parts);
    });

    app.get("/parts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const parts = await partsCollection.findOne(query);
      res.send(parts);
    });

    app.get("/user", verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.get('/admin/:email', async(req, res) =>{
      const email = req.params.email;
      const user = await userCollection.findOne({email: email});
      const isAdmin = user.role === 'admin';
      res.send({admin: isAdmin})
    })

    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });

    app.get("/order", verifyJWT, async (req, res) => {
      // const query = {};
      // const order = orderCollection.find(query);
      // const result = await order.toArray();
      // res.send(result)

      const user = req.query.user;
      const decodedEmail = req.decoded.email;
      if (user === decodedEmail) {
        const query = { user: user };
        const result = await orderCollection.find(query).toArray();
        return res.send(result);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      // const authorization = req.headers.authorization;
      // console.log("authorization", authorization);
      // const query = {user: user};
      // const result = await orderCollection.find(query).toArray();
      // res.send(result)
    });

    app.post("/order", async (req, res) => {
      const order = req.body;
      // console.log(order);
      const query = {
        id: order.orderId,
        orderItem: order.order,
        user: order.user,
      };
      // console.log(query);
      const exists = await orderCollection.findOne(query);
      if (exists) {
        console.log("exists");
        return res.send({ success: false, order: exists });
      }
      const result = await orderCollection.insertOne(order);
      return res.send({ success: true, result });
    });
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
