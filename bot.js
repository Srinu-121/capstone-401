const express = require('express');
const app = express();
const port = 3000;
const request = require('request');
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));


var serviceAccount = require('./srinu.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

app.get('/weather', function (req, res) {
  res.render('search');
});

app.get('/signin', function (req, res) {
  res.sendFile(__dirname + '/public/' + 'signin.html');
});

app.get('/home', function (req, res) {
  res.sendFile(__dirname + '/public/' + 'home.html');
});

app.post('/signinSubmit', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const fullName = req.body.FullName;
  const dob = req.body.dob;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const userSnapshot = await db
      .collection('signup info')
      .where('email', '==', email)
      .get();

    if (userSnapshot.empty) {
      await db.collection('signup info').add({
        Fullname: fullName,
        email: email,
        dob: dob,
        Password: hashedPassword,
      });

      res.sendFile(__dirname + '/public/' + 'login.html');
    } else {
      res.send('Email already exists. Please use a different email address.');
    }
  } catch (error) {
    console.error('Error signing up:', error);
    res.status(500).send('Error occurred while signing up');
  }
});

app.get('/login', function (req, res) {
  res.sendFile(__dirname + '/public/' + 'login.html');
});

app.post('/loginsubmit', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const userSnapshot = await db
      .collection('signup info')
      .where('email', '==', email)
      .get();

    if (userSnapshot.empty) {
      res.send('Invalid Credentials!');
      return;
    }

    const userDoc = userSnapshot.docs[0];
    const hashedPassword = userDoc.data().Password;

    const passwordMatch = await bcrypt.compare(password, hashedPassword);

    if (passwordMatch) {
      res.render('location');
    } else {
      res.send('Invalid Credentials!');
    }
  } catch (error) {
    console.error('Error checking login credentials:', error);
    res.status(500).send('Error occurred while checking login credentials');
  }
});

app.get('/weathersubmit', (req, res) => {
  const location = req.query.location;
  request(
    'https://api.openweathermap.org/data/2.5/weather?q=' +
      location +
      '&appid=ee105770f47410d41e658e851095a80b&units=metric', 
    function (error, response, body) {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .send('Error occurred while fetching weather data.');
      }

      try {
        const responseBody = JSON.parse(body);

        if ('error' in responseBody) {
          if (responseBody.error.code.toString().length > 0) {
            return res.render('location');
          }
        } else {
          const feels = responseBody.main.feels_like;
          const seaLevel = responseBody.main.sea_level; 
          const country = responseBody.sys.country;
          const speed = responseBody.wind.speed;
          const humidity = responseBody.main.humidity;
          const name = responseBody.name;
          const sunrise = responseBody.sys.sunrise;

          res.render('weather', {
            Feels: feels,
            Sea_Level: seaLevel,
            Country: country,
            Speed: speed,
            Humidity: humidity,
            Name: name,
            Sunrise: sunrise,
          });
        }
      } catch (parseError) {
        console.error(parseError);
        return res
          .status(500)
          .send('Error occurred while parsing weather data.');
      }
    }
  );
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
