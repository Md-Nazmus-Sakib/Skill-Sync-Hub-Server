const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middle wear
app.use(cors())
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.91makds.mongodb.net/?retryWrites=true&w=majority`;

// const uri = process.env.DB_URI;
// console.log(uri)

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
        await client.connect();
        //all Collection
        const userCollection = client.db("SkillSyncHub").collection("users");
        const teacherCollection = client.db("SkillSyncHub").collection("teachers");
        const classCollection = client.db("SkillSyncHub").collection("classes");
        const assignmentCollection = client.db("SkillSyncHub").collection("assignments");
        // users related api
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });
        app.get('/users/:email', async (req, res) => {

            const email = req.params.email;
            // console.log(email)
            const query = { email: email }
            const result = await userCollection.findOne(query);
            res.send(result);
        });

        app.get('/users/role/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const projection = { role: 1 };
            // console.log(projection)

            const user = await userCollection.findOne(query, projection);
            if (user && user.role) {
                res.send({ role: user.role }); // Send only the role in the response
            } else {
                res.send([]);
            }

        })
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'Admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })
        app.patch('/users/role/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updatedDoc = {
                $set: {
                    role: 'Teacher'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })
        //teacher api
        app.get('/teacher', async (req, res) => {
            const result = await teacherCollection.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        app.post('/teacher', async (req, res) => {
            const teacher = req.body;
            const query = { teacherEmail: teacher.teacherEmail }
            const existingUser = await teacherCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'teacher already exists', insertedId: null })
            }
            const result = await teacherCollection.insertOne(teacher);
            res.send(result);
        });

        app.patch('/teacher/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'Accepted'
                }
            }
            const result = await teacherCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.patch('/teacher/reject/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'Rejected'
                }
            }
            const result = await teacherCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })
        // class related api 


        app.get('/allCourse', async (req, res) => {
            const query = { status: 'approved' }
            const result = await classCollection.find(query).sort({ _id: -1 }).toArray();
            res.send(result);
        });
        app.get('/class', async (req, res) => {
            const result = await classCollection.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });
        app.get('/class/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await classCollection.findOne(query);
            res.send(result);
        });
        app.get('/class/add/:email', async (req, res) => {
            const email = req.params.email;
            const query = { teacherEmail: email }
            // console.log()
            const result = await classCollection.find(query).toArray();
            res.send(result);
        });

        app.post('/class', async (req, res) => {
            const addClass = req.body;
            const result = await classCollection.insertOne(addClass);
            res.send(result);
        });

        app.put('/class/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateCourse = req.body;
            const course = {
                $set: {
                    title: updateCourse.title,
                    coursePhoto: updateCourse.coursePhoto,
                    price: updateCourse.price,
                    details: updateCourse.details,
                }
            }
            const result = await classCollection.updateOne(filter, course, options);
            res.send(result)

        })

        app.patch('/class/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'approved'
                }
            }
            const result = await classCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })
        app.patch('/class/reject/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: 'reject'
                }
            }
            const result = await classCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.delete('/class/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await classCollection.deleteOne(query)
            res.send(result)
        })
        //Assignment Api
        app.post('/assignment', async (req, res) => {
            const assignment = req.body;
            const result = await assignmentCollection.insertOne(assignment);
            res.send(result);
        });





        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Skill Sync Server is Running')
})

app.listen(port, () => {
    console.log(`Skill Sync is running on port: ${port}`)
})
