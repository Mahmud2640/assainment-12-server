const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
app = express();
port = process.env.PORT || 5000;

// middleware added to express app
app.use(cors());
app.use(express.json());

// mongoDB connection url
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xjpc8.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// verify JWT token
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

// function to connect to mongoDB database
async function run() {
  try {
    await client.connect();
    const partsCollection = client.db("h-power").collection("parts");
    const ordersCollection = client.db("h-power").collection("orders");
    const userCollection = client.db("h-power").collection("users");
    const reviewCollection = client.db("h-power").collection("review");

    // verify admin
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

    // root api
    app.get("/", (req, res) => {
      res.send("Manufacture Server is Running Successfully.");
    });

    // user get api
    app.get("/users", async (req, res) => {
      const users = await userCollection.find({}).toArray();
      res.send(users);
    });

    // admin get api
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    // user admin put api
    app.put("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // review post api
    app.post("/review", async (req, res) => {
      const newProducts = req.body;
      const result = await reviewCollection.insertOne(newProducts);
      res.send(result);
    });

    // review get api
    app.get("/review", async (req, res) => {
      const review = await reviewCollection.find({}).toArray();
      res.send(review);
    });

    // parts get api
    app.get("/parts", async (req, res) => {
      const parts = await partsCollection.find({}).toArray();
      res.send(parts);
    });

    // parts id get api
    app.get("/parts/:id", async (req, res) => {
      const id = req.params;
      const query = { _id: ObjectId(id) };
      const result = await partsCollection.findOne(query);
      res.send(result);
    });

    // parts post api
    app.post("/parts", async (req, res) => {
      const products = req.body;
      const result = await partsCollection.insertOne(products);
      res.send(result);
    });

    // parts put api
    app.delete("/parts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await partsCollection.deleteOne(query);
      res.send(result);
    });

    // orders put api
    app.post("/orders", async (req, res) => {
      const orders = req.body;
      const result = await ordersCollection.insertOne(orders);
      res.send(result);
    });

    // orders put api
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    });

    // orders get api
    app.get("/orders", async (req, res) => {
      const users = await ordersCollection.find().toArray();
      res.send(users);
    });

    // orders get api
    app.get("/orderss", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const cursor = ordersCollection.find(query);
        const orders = await cursor.toArray();
        res.send(orders);
      } else {
        res.status(403).send({ message: "forbidden access" });
      }
    });

    // users get api
    app.get("/users", async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    // users put api
    app.put("/users/:email", async (req, res) => {
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
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`manufacture app listening on port ${port}`);
});
