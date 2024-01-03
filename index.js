// Import the express module
const express = require('express');
const bodyParser = require('body-parser');
var cors = require('cors')
const morgan = require('morgan')
const routes = require("./routes")
// Create an instance of the express application
const app = express();

// Use body-parser middleware to parse JSON and URL-encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan());
app.use(cors());

app.use('/', routes);


// Specify the port for the server to listen on
const port = 8000;

// Start the server and listen on the specified port
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
