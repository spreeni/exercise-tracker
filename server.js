const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

const Schema = mongoose.Schema;
var subSchema = mongoose.Schema({
      description: String,
      duration: Number,
      date: Date
},{ _id : false });
const exerciseSchema = new Schema({
    userName:  {type: String, required: true},
    exercises: [subSchema]
})
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())



app.post('/api/exercise/new-user', function(req, res) {
  // Checks if the Username exists in the databank and if not creates a new document and returns its JSON file.
  console.log(JSON.stringify(req.body))
  Exercise.findOne({userName: req.body.username}, function(err, data) {
    console.log('FindOne results: ' + JSON.stringify(data))
    if (data==null || req.body.username!=data.userName) {
      let newEntry = new Exercise({
        userName:  req.body.username,
        exercises: []
      }) 
      newEntry.save(function(err, data) {
        console.log(`User ${req.body.username} successfully saved to the database.`)
        res.send(JSON.stringify({username: data.userName, _id: data.id}))
      })
    } else {
      console.log(`Error: userName ${req.body.username} already exists in the database.`)
      res.send(`Error: Username "${req.body.username}" already exists in the database.`)
    }
  })
})

app.post('/api/exercise/add', function(req,res) {
  // Takes a UserID, and a description, duration and date for an exercise, then enters the exercise into the database.
  let entry = {
    description: req.body.description,
    duration: req.body.duration,
    date: req.body.date ? req.body.date : new Date()
  }
  Exercise.findByIdAndUpdate(req.body.userId, {"$push": { "exercises": entry }}, { new: true }, (err, data) => {
    if (err) {
      return res.status(500).send({message: err.message});
    }
    res.send(JSON.stringify({
      username: data.userName, 
      _id: req.body.userId,
      description: entry.description,
      duration: entry.duration,
      date: entry.date.toLocaleDateString()//toString()
    }))
  })
})


app.get('/api/exercise/log', function(req, res) { 
  // Takes a Query with a userId and the optional date range and the limit for the query. 
  console.log(req.query)
  Exercise.findById(req.query.userId).select({__v: 0}).exec(function(err, data) {
    if (err) {
      return res.status(500).send({message: err.message});
    }
    if (req.query.from) {
      data.exercises = data.exercises.filter((item) => {
        return (item.date >= new Date(req.query.from))
      })
    }
    if (req.query.to) {
      data.exercises = data.exercises.filter((item) => {
        return (item.date <= new Date(req.query.to))
      })
    }
    data.exercises.sort((a,b) => {
      return (a.date < b.date)
    })
    if (req.query.limit) {
      data.exercises.splice(req.query.limit, data.exercises.length-req.query.limit)
    }
    console.log('Chain results: ' + JSON.stringify(data))
    res.send(JSON.stringify(data))
  })
})





app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})
  
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
