const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongoose = require("mongoose");

const shortid = require("shortid");

mongoose.connect(
  process.env.MONGO_URI || "mongodb://localhost/exercise-track",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
);

// Create a Schema
var Schema = mongoose.Schema;

var userSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  _id: {
    type: String,
    default: shortid.generate,
    required: true
  }
});

var User = mongoose.model("User", userSchema);

var exerciseSchema = new Schema({
  userId: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: Date
  }
});

var Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/exercise/new-user", async function(req, res) {
  var username = req.body.username;
  var userExists = await User.findOne({ username: username });
  if (!userExists) {
    var _id = shortid.generate();
    var createAndSaveUser = function(done) {
      var user = new User({
        username,
        _id
      });

      user.save(function(err, data) {
        if (err) return console.log(err);
        done(null, data);
      });
    };
    createAndSaveUser(function(data) {});
    res.json({ username: username, _id: _id });
  } else {
    var { _id } = userExists;
    res.json({ username: username, _id: _id });
  }
});

app.get("/api/exercise/users", async function(req, res, next) {
  var users = await User.find({});
  res.json(users);
});

app.post("/api/exercise/add", async function(req, res) {
  var userId = req.body.userId;
  var date = req.body.date;
  var dateValidate = new Date(req.body.date);

  if (!date) date = new Date();
  else {
     if (dateValidate !== "Invalid Date"){
       date = dateValidate
     } else{
      res.send(`Cast to Date failed for value ${date} at path date`);
    }
  }
   
  var dateUTC = date.toDateString();
  var description = req.body.description;
  var duration = Number(req.body.duration);
  if (duration == 0) {
    res.send("Path `duration` is required.");
  }
  if (!description) {
    res.send("Path `description` is required.");
  }
  var user = await User.findById(userId);
  if (user._id) {
    var createAndSaveExercise = function(done) {
      var exercise = new Exercise({
        userId: user._id,
        description,
        duration,
        date
      });

      exercise.save(function(err, data) {
        if (err) return console.log(err);
        done(null, data);
      });
    };
    createAndSaveExercise(function(data) {});
    res.json({
      username: user.username,
      description: description,
      duration: duration,
      _id: user._id,
      date: date.toDateString()
    });
  }
});

app.get("/api/exercise/log", async function(req, res) {
  var userId = req.query.userId;
  var limit = Number(req.query.limit);
  var from = new Date(req.query.from);
  var to = new Date(req.query.to);
  if (from == "Invalid Date") from = false;
  if (to == "Invalid Date") to = false;
  var user = await User.findById({ _id: userId });

  var exercises = await Exercise.find({ userId }).select("-_id -__v -userId");
  var exercisesDescription = exercises.map(exercise => exercise.description);
  var exercisesDuration = exercises.map(exercise => exercise.duration);
  var exercisesDate = exercises.map(exercise => exercise.date.toDateString());
  var log = [];
  for (let i = 0; i < exercises.length; i++) {
    log.push({
      description: exercisesDescription[i],
      duration: exercisesDuration[i],
      date: exercisesDate[i]
    });
  }

  var exercisesLimit = await Exercise.find({ userId })
    .select("-_id -__v -userId")
    .limit(limit);

  if (user) {
    if (from && to && limit) {
      var exercisesFromToLimit = exercisesLimit.filter(function(exercise) {
        return exercise.date >= from && exercise.date <= to;
      });
      exercisesDescription = exercisesFromToLimit.map(
        exercise => exercise.description
      );
      exercisesDuration = exercisesFromToLimit.map(
        exercise => exercise.duration
      );
      exercisesDate = exercisesFromToLimit.map(exercise =>
        exercise.date.toDateString()
      );
      var logFromToLimit = [];
      for (let i = 0; i < exercisesFromToLimit.length; i++) {
        logFromToLimit.push({
          description: exercisesDescription[i],
          duration: exercisesDuration[i],
          date: exercisesDate[i]
        });
      }

      res.json({
        _id: userId,
        username: user.username,
        from: from.toDateString(),
        to: to.toDateString(),
        count: logFromToLimit.length,
        log: logFromToLimit
      });
    } else {
      if (from && to) {
        var exercisesFromTo = exercises.filter(function(exercise) {
          return exercise.date >= from && exercise.date <= to;
        });

        exercisesDescription = exercisesFromTo.map(
          exercise => exercise.description
        );
        exercisesDuration = exercisesFromTo.map(exercise => exercise.duration);
        exercisesDate = exercisesFromTo.map(exercise =>
          exercise.date.toDateString()
        );
        var logFromTo = [];
        for (let i = 0; i < exercisesFromTo.length; i++) {
          logFromTo.push({
            description: exercisesDescription[i],
            duration: exercisesDuration[i],
            date: exercisesDate[i]
          });
        }

        res.json({
          _id: userId,
          username: user.username,
          from: from.toDateString(),
          to: to.toDateString(),
          count: logFromTo.length,
          log: logFromTo
        });
      }
      if (from && limit) {
        var exercisesFromLimit = exercisesLimit.filter(function(exercise) {
          return exercise.date >= from;
        });

        exercisesDescription = exercisesFromLimit.map(
          exercise => exercise.description
        );
        exercisesDuration = exercisesFromLimit.map(
          exercise => exercise.duration
        );
        exercisesDate = exercisesFromLimit.map(exercise =>
          exercise.date.toDateString()
        );
        var logFromLimit = [];
        for (let i = 0; i < exercisesFromLimit.length; i++) {
          logFromLimit.push({
            description: exercisesDescription[i],
            duration: exercisesDuration[i],
            date: exercisesDate[i]
          });
        }

        res.json({
          _id: userId,
          username: user.username,
          from: from.toDateString(),
          count: logFromLimit.length,
          log: logFromLimit
        });
      }
      if (to && limit) {
        var exercisesToLimit = exercisesLimit.filter(function(exercise) {
          return exercise.date <= to;
        });

        exercisesDescription = exercisesToLimit.map(
          exercise => exercise.description
        );
        exercisesDuration = exercisesToLimit.map(exercise => exercise.duration);
        exercisesDate = exercisesToLimit.map(exercise =>
          exercise.date.toDateString()
        );
        var logToLimit = [];
        for (let i = 0; i < exercisesToLimit.length; i++) {
          logToLimit.push({
            description: exercisesDescription[i],
            duration: exercisesDuration[i],
            date: exercisesDate[i]
          });
        }

        res.json({
          _id: userId,
          username: user.username,
          to: to.toDateString(),
          count: logToLimit.length,
          log: logToLimit
        });
      }
      if (from) {
        var exercisesFrom = exercises.filter(function(exercise) {
          return exercise.date >= from;
        });

        exercisesDescription = exercisesFrom.map(
          exercise => exercise.description
        );
        exercisesDuration = exercisesFrom.map(exercise => exercise.duration);
        exercisesDate = exercisesFrom.map(exercise =>
          exercise.date.toDateString()
        );
        var logFrom = [];
        for (let i = 0; i < exercisesFrom.length; i++) {
          logFrom.push({
            description: exercisesDescription[i],
            duration: exercisesDuration[i],
            date: exercisesDate[i]
          });
        }

        res.json({
          _id: userId,
          username: user.username,
          from: from.toDateString(),
          count: logFrom.length,
          log: logFrom
        });
      }
      if (to) {
        var exercisesTo = exercises.filter(function(exercise) {
          return exercise.date <= to;
        });

        exercisesDescription = exercisesTo.map(
          exercise => exercise.description
        );
        exercisesDuration = exercisesTo.map(exercise => exercise.duration);
        exercisesDate = exercisesTo.map(exercise =>
          exercise.date.toDateString()
        );
        var logTo = [];
        for (let i = 0; i < exercisesTo.length; i++) {
          logTo.push({
            description: exercisesDescription[i],
            duration: exercisesDuration[i],
            date: exercisesDate[i]
          });
        }

        res.json({
          _id: userId,
          username: user.username,
          to: to.toDateString(),
          count: logTo.length,
          log: logTo
        });
      }
      if (limit) {
        var exercisesDescription = exercisesLimit.map(
          exercise => exercise.description
        );
        var exercisesDuration = exercisesLimit.map(
          exercise => exercise.duration
        );
        var exercisesDate = exercisesLimit.map(exercise =>
          exercise.date.toDateString()
        );
        var logLimit = [];
        for (let i = 0; i < exercisesLimit.length; i++) {
          logLimit.push({
            description: exercisesDescription[i],
            duration: exercisesDuration[i],
            date: exercisesDate[i]
          });
        }

        res.json({
          _id: userId,
          username: user.username,
          count: logLimit.length,
          log: logLimit
        });
      }
    }
    if (!from && !to && !limit) {
      res.json({
        _id: userId,
        username: user.username,
        count: exercises.length,
        log: log
      });
    }
  }
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
