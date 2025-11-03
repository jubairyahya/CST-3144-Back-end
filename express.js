require('dotenv').config();
const express = require("express");
const app = express();
const path=require('path');
const cors=require('cors');
const {MongoClient, ObjectId}=require('mongodb');


const port = process.env.PORT || 5000;


const multer=require('multer');


//--middleware

app.use(cors());
app.use(express.json());

//mongodb connection
const user = encodeURIComponent(process.env.DB_USER);
const pass = encodeURIComponent(process.env.DB_PASS);
const cluster = process.env.DB_CLUSTER;
const dbName = process.env.DB_NAME;

const uri = `mongodb+srv://${user}:${pass}@${cluster}/${dbName}?retryWrites=true&w=majority`;
const client = new MongoClient(uri);


let lessonsCollection;
let ordersCollection;

async function connectDB() {
  try {
    await client.connect();
    const db = client.db('lessonShopDB');
    lessonsCollection = db.collection('lessons');
    ordersCollection = db.collection('orders');
    console.log(' MongoDB connected to lessonShopDB');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
}
connectDB();

// multer set up

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'images')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });


app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
}); 
//admin 
const ADMIN_USERNAME = 'zuzu';
const ADMIN_PASSWORD = '1234';
const ADMIN_KEY = 'secret123';

function checkAdmin(req, res, next) {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(403).json({ message: 'Forbidden' });
  next();
}
//admin login
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD)
    return res.json({ message: 'Login successful', adminKey: ADMIN_KEY });
  res.status(401).json({ message: 'Invalid credentials' });
});

// Get all lessons
app.get('/lessons', async (req, res) => {
  try {
    const lessons = await lessonsCollection.find().toArray();
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch lessons', error: err.message });
  }
});

// Admin adds lesson
app.post('/admin/lessons', checkAdmin, upload.single('image'), async (req, res) => {
  try {
    const { topic, location, price, space } = req.body;
    const image = req.file ? req.file.filename : null;
    if (!topic || !location || !price || !space || !image)
      return res.status(400).json({ message: 'All fields required' });

    const newLesson = { topic, location, price: Number(price), space: Number(space), image };
    const result = await lessonsCollection.insertOne(newLesson);
    res.status(201).json({ message: 'Lesson added successfully', id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add lesson', error: err.message });
  }
});



app.listen(port,()=>console.log(`Server started on port ${port}`));
