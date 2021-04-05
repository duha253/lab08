'use strict';


// declaring variable ;
const express = require('express');
const superagent = require('superagent');
const cors = require('cors');
require('dotenv').config();
const pg = require('pg');


// initialize the server
const app = express();
app.use(cors());

//declaring a port
const PORT = process.env.PORT || 3001; //API key for locatins
const ENV = process.env.ENV || 'DEP';
const GEO_CODE_API_KEY = process.env.GEO_CODE_API_KEY; //API key for wheather
const WEATHER_CODE_API_KEY = process.env.WEATHER_CODE_API_KEY; //API key for PARK
const PARK_CODE_API_KEY = process.env.PARK_CODE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;//database
const MOVIE_API_KEY = process.env.MOVIE_API_KEY;
const YELP_API_KEY = process.env.YELP_API_KEY;


let client = '';
if (ENV === 'DEV') {
  client = new pg.Client({
    connectionString: DATABASE_URL
  });
} else {
  client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized : false
    }
  });
}



// routes
app.get('/location', handelLocationRequest);
app.get('/weather', handelWeatheRequest);
app.get('/parks', handelParkRequest);
app.get('/movies', handleMoviesRequest);
app.get('/yelp', handleYelpRequest);


let city;
function handelLocationRequest(req, res) {
  city = req.query.city;
  //const urlGEO = `https://us1.locationiq.com/v1/search.php?key=${GEO_CODE_API_KEY}&city=${city}&format=json`;
  const urlGEO = `https://us1.locationiq.com/v1/search.php`;
  const query = {
    key : process.env.GEO_CODE_API_KEY,
    lat : req.query.latitude,
    lon: req.query.longitude,
    city: city,
    format: 'json'
  }

  if (!city) {
    res.status(500).send('Status 500: Sorry, something went wrong');
  }

  const sqlQuery = `SELECT * FROM locations WHERE search_query = '${city}';`;
  client.query(sqlQuery).then(data => {
    if (data.rows.length === 0) {
      superagent.get(urlGEO).query(query).then(location => {
        const locationObj = new Location(city, location.body[0]);
        const sqlQuery = `INSERT INTO locations(search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4)`;
        let values = [city, locationObj.formatted_query, locationObj.latitude, locationObj.longitude];
        client.query(sqlQuery, values).then(() => {
          res.status(200).json(locationObj);
        })
      }).catch(error => {
        console.log('error', error);
        res.status(500).send('there is no Location ');
      });
    }
    else if (data.rows[0].search_query === city) {
      // get data from DB
      console.log('they are equal' ,data.rows[0]);
      res.status(200).json(data.rows[0]);
    }
  }).catch(error => {
    console.log('error', error);
    res.status(500).send('Sorry, something went wrong ');
  });
}

//weather function
// localhost:3000/weather?search_query=amman  //// function to get weather data
function handelWeatheRequest(req, res) {
    const url = `https://api.weatherbit.io/v2.0/forecast/daily?`;
    const queryObj = {
      lat: req.query.latitude,
      lon: req.query.longitude,
      key: WEATHER_CODE_API_KEY,
    };
  
    superagent.get(url).query(queryObj).then(reqData => {
      const myWeatherData = reqData.body.data.map(weather => {
        return new Weather(weather);
      });
  
      res.send(myWeatherData);
    }).catch((error) => {
      console.error('ERROR', error);
      res.status(500).send('there is no data weather');
    });
  }

// constructor function formate the location responed data
function Location(searchQuery, data) {
    this.search_query = searchQuery;
    this.formatted_query = data.display_name;
    this.latitude = data.lat;
    this.longitude = data.lon;

// constructor function formate the weather responed data
    function Weather(data) {
        this.forecast = data.weather.description;
        this.time = data.datetime;
      }

// Error Handler Routes
app.use('*', notFoundHandler);
function notFoundHandler(request, response) {
  response.status(404).send('huh?');
};
