const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

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
        // await client.connect();
        //all Collection
        const userCollection = client.db("SkillSyncHub").collection("users");
        const teacherCollection = client.db("SkillSyncHub").collection("teachers");
        const classCollection = client.db("SkillSyncHub").collection("classes");
        const assignmentCollection = client.db("SkillSyncHub").collection("assignments");
        const paymentCollection = client.db("SkillSyncHub").collection("payments");
        const studentCollection = client.db("SkillSyncHub").collection("students");
        const feedbackCollection = client.db("SkillSyncHub").collection("feedbacks");
        const submitAssignmentCollection = client.db("SkillSyncHub").collection("submitAssignments");

        const verifyJWT = (req, res, next) => {
            const authorization = req.headers.authorization;
            if (!authorization) {
                return res.status(401).send({ error: true, message: 'unauthorized user' });
            }
            const token = authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ err: true, message: 'unauthorized user' });
                }
                req.decoded = decoded;
                next();
            })
        }





        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })
        //Create Payment Intent
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            // console.log(price, amount)
            // console.log(process.env.PAYMENT_SECRET_KEY)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })
        //payment related api
        app.post('/payment', async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);
            res.send(result)
        })




        // users related api
        app.get('/users', verifyJWT, async (req, res) => {
            const result = await userCollection.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });
        app.get('/users/:email', verifyJWT, async (req, res) => {

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
        app.patch('/users/admin/:id', verifyJWT, async (req, res) => {
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

        app.patch('/users/student/:email', verifyJWT, async (req, res) => {

            try {
                const userEmail = req.params.email;
                const filter = { email: userEmail };
                const updatedDoc = {
                    $set: {
                        role: 'Student'
                    }
                };
                const result = await userCollection.updateOne(filter, updatedDoc);
                res.send(result);
            } catch (error) {
                console.error("Error updating document:", error);

            }
        })
        //teacher api
        app.get('/teacher', verifyJWT, async (req, res) => {
            const result = await teacherCollection.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        app.post('/teacher', verifyJWT, async (req, res) => {
            const teacher = req.body;
            const query = { teacherEmail: teacher.teacherEmail }
            const existingUser = await teacherCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'teacher already exists', insertedId: null })
            }
            const result = await teacherCollection.insertOne(teacher);
            res.send(result);
        });

        app.patch('/teacher/:id', verifyJWT, async (req, res) => {
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

        app.patch('/teacher/reject/:id', verifyJWT, async (req, res) => {
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

            const classes = await classCollection.find({ status: 'approved' }).toArray();

            const result = [];
            for (const cls of classes) {
                const enrollmentsCount = await studentCollection.countDocuments({ courseId: cls._id.toString() });
                result.push({ ...cls, numberOfStudents: enrollmentsCount });
            }
            res.send(result);
        });


        app.get('/class', async (req, res) => {
            const result = await classCollection.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });
        app.get('/class/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await classCollection.findOne(query);
            res.send(result);
        });
        app.get('/class/add/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { teacherEmail: email }
            // console.log()
            const result = await classCollection.find(query).toArray();
            res.send(result);
        });


        app.get('/popular-courses', async (req, res) => {
            const classes = await classCollection.find({ status: 'approved' }).toArray();

            const course = [];
            for (const cls of classes) {
                const enrollmentsCount = await studentCollection.countDocuments({ courseId: cls._id.toString() });
                course.push({ ...cls, numberOfStudents: enrollmentsCount });
            }

            // Sort the course array based on numberOfStudents in descending order
            course.sort((a, b) => b.numberOfStudents - a.numberOfStudents);

            // Limit the course to the top 6 classes with the highest numberOfStudents
            const result = course.slice(0, 6);

            res.send(result);
        })

        app.post('/class', verifyJWT, async (req, res) => {
            const addClass = req.body;
            const result = await classCollection.insertOne(addClass);
            res.send(result);
        });

        app.put('/class/:id', verifyJWT, async (req, res) => {
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

        app.patch('/class/:id', verifyJWT, async (req, res) => {
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
        app.patch('/class/reject/:id', verifyJWT, async (req, res) => {
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

        app.delete('/class/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await classCollection.deleteOne(query)
            res.send(result)
        })

        //Student api
        app.get('/enrollClass/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const studentWithEmail = await studentCollection.find({ email: email }).toArray();
            let allClass = []

            for (const student of studentWithEmail) {
                const { teacherEmail, title } = student;
                const Classes = await classCollection.find({ teacherEmail, title }).toArray();

                allClass = allClass.concat(Classes);

            }
            res.send(allClass);
        });

        app.post('/student', verifyJWT, async (req, res) => {
            const student = req.body;
            const result = await studentCollection.insertOne(student);
            res.send(result);
        });



        //Assignment Api
        app.get('/assignment/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { courseId: id };
            const result = await assignmentCollection.find(query).toArray();
            res.send(result);
        });
        app.post('/assignment', verifyJWT, async (req, res) => {
            const assignment = req.body;
            const result = await assignmentCollection.insertOne(assignment);
            res.send(result);
        });
        //submit Assignment api
        app.post('/submitAssignment', verifyJWT, async (req, res) => {
            const assignmentData = req.body;
            const result = await submitAssignmentCollection.insertOne(assignmentData);
            res.send(result);
        });
        //Feedback Api
        app.get('/feedback', async (req, res) => {
            const result = await feedbackCollection.find().toArray();
            res.send(result);
        });

        app.post('/feedback', verifyJWT, async (req, res) => {
            const feedback = req.body;
            const result = await feedbackCollection.insertOne(feedback);
            res.send(result);
        });

        // Estimate Count 
        app.get('/total-count', async (req, res) => {
            const totalUsers = await userCollection.estimatedDocumentCount();
            const totalClass = await classCollection.estimatedDocumentCount();
            const totalStudent = await studentCollection.estimatedDocumentCount();

            res.send({
                totalUsers,
                totalClass,
                totalStudent
            })
        })

        //teacher Progress
        app.get('/teacher-progress/:id', async (req, res) => {
            const id = req.params.id;
            const totalAssignment = await assignmentCollection.find({ courseId: id }).toArray();
            const totalEnroll = await studentCollection.find({ courseId: id }).toArray();
            const assignmentSubmit = await submitAssignmentCollection.find({ courseId: id }).toArray();

            res.send({
                totalAssignment: totalAssignment.length,
                totalEnroll: totalEnroll.length,
                assignmentSubmit: assignmentSubmit.length
            })
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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
