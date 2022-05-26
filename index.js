
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// const stripe = require('stripe')('sk_test_51L0rfOBAAde9UJpJiJdJTfAVaC1D1zbukwLWDbE19Kan52s8BmFQIrH0K2h7hsUTY1SWHQ033jbv5bfJAp45luWR00QhxQ2g3h');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { ObjectID } = require("bson");
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;
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
    const profileCollection = client.db("laptop-menufecture").collection("profile");
    const reviewCollection = client.db("laptop-menufecture").collection("review");
    const productCollection = client.db("laptop-menufecture").collection("product");
    const paymentCollection = client.db("laptop-menufecture").collection("payments");

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    };

    app.post("/create-payment-intent", verifyJWT, async(req, res) => {
      const product_payment = req.body;
      const price = parseInt(product_payment.price);
      // console.log(price)
      const amount = price * 100;
      // console.log(amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      })
      res.send({clientSecret: paymentIntent.client_secret})
    })

   

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

      // app.delete("/order/:id", verifyJWT, async (req, res) => {
      //   const id = req.params.id;
      //   console.log(id);
      //   const query = {_id: ObjectId(id)};
      //   const result = await orderCollection.deleteOne(query);
      //   console.log(result);
      //   res.send(result);
      // });

      app.delete("/userOrder/:_id", async (req, res) => {
        const _id = req.params._id;
        console.log(_id);
        const query = {_id: ObjectID(_id)};
        const result = await orderCollection.deleteOne(query);
        console.log(result);
        res.send(result);
      });



      // console.log(query);
      const exists = await orderCollection.findOne(query);
      if (exists) {
        console.log("exists");
        return res.send({ success: false, order: exists });
      }
      const result = await orderCollection.insertOne(order);
      return res.send({ success: true, result });
    });

    app.get("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await orderCollection.findOne(query);
      res.send(order);
    });

    app.patch("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      console.log(payment);
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const result = await paymentCollection.insertOne(payment);
      const updatedOrder = await orderCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(updatedDoc);
    });

    app.get("/getOrders", verifyJWT, verifyAdmin, async (req, res) => {
      const query={};

      const order = await orderCollection.find(query).toArray();
      res.send(order);
    });


    
    // app.post('/profile', async(req, res)=>{
    //   const profile = req.body;
    //   console.log(profile);
    //   const query = {
    //     email: profile.user
    //   }
    //   console.log(query);
    //   const exists = await profileCollection.findOne(query);
    //   if (exists) {
    //     return res.send({ success: false, booking: exists });
    //   }
    //   const result = await userCollection.insertOne(profile);
    //   res.send({ success: true, result })
    // })


    app.put("/profileUpdate/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const profile = req.body;
      // const options = { upsert: true };
      const updateDoc = {
        $set: profile,
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send( result);
    });




    app.post("/review", verifyJWT, async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    app.get("/review", async (req, res) => {
      const review = await reviewCollection.find().toArray();
      res.send(review);
       
    });

    app.post('/product',async(req, res)=>{
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result)
  })
  app.get("/product", async (req, res) => {
    const product = await productCollection.find().toArray();
    res.send(product);
     
  });

  app.delete("/product/:_id", async (req, res) => {
    const _id = req.params._id;
    console.log(_id);
    const query = {_id: ObjectID(_id)};
    const result = await productCollection.deleteOne(query);
    console.log(result);
    res.send(result);
  });

  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Anamul!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
