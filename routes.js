// routes.js
const express = require('express');
const bodyParser = require('body-parser');
const {auth} = require("googleapis/build/src/apis/dlp");
const { google } = require('googleapis');

const router = express.Router();
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

const CLIENT_ID = '1027312931677-pcphcmai165agebltgscpmde90ukf1cb.apps.googleusercontent.com';
const CLIENT_SECRET = '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'
const API_KEY = 'AIzaSyA4ev26qn-yxK7D2r7z-gieyFQevfsyluM';
const refresh_token = '1//0gLiWX9JeSffICgYIARAAGBASNwF-L9IrDNN4VRk9R4I--tnBpgw5p8vze5c6yLWjXF_nJK5-ds6GS5jAnD9uk__k8fmUrgwZMpY';

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';
let oauth2Client = null;

router.get('/hello', (req, res) => {
    res.send('Hello, World!');
});

async function getMails(pageToken){
    const gmail = google.gmail({"version": "v1", auth: oauth2Client})
    // console.log(gmail, "gmail")


    const relist = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 10,
        pageToken: pageToken
    });

    console.log(relist.data.messages, "list");

    let mailList = []
    for (let i = 0; i < relist.data.messages.length; i++){
        const message = relist.data.messages[i];
        console.log(message, "message")
        const msg = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: "full"
        });
        console.log(msg.data, "msg")
        mailList.push(msg.data)
    }

    console.log(mailList, "mailList")

    return {list: mailList}
}

router.post('/auth', async (req, res) => {
    const code = req.body?.code;
    console.log(req.body)

    if(code === "none"){
        console.log("inside if")
        res.json(await getMails(""))
    }
    else {

        let {tokens} = await oauth2Client.getToken(code);
        console.log(tokens, "response")
        oauth2Client.setCredentials(tokens);

        // gapiLoaded()
        res.json(await getMails(""))
    }
});



// Route for handling Google API requests
router.get('/authorize', async (req, res) => {
    try {
        // Your Google API logic here
        if(oauth2Client){
            res.json({ redirectUrl:  "https://834b-2405-201-4044-1078-5175-ae3c-c8b7-4654.ngrok-free.app/auth"});
        }
        else {
            const result = await fetchGoogleData(); // Replace with your actual Google API function

            res.json({redirectUrl: result});
        }
    } catch (error) {
        console.error('Error fetching Google data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const fetchGoogleData = async () => {
    // Implement your logic to interact with Google APIs using the googleapis library
    // For example, you can use the OAuth2 client to authenticate and make requests
    // Replace the following with your actual Google API implementation
    oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        "https://834b-2405-201-4044-1078-5175-ae3c-c8b7-4654.ngrok-free.app/auth"
    );


// Generate a url that asks permissions for the Drive activity scope
    const authorizationUrl = oauth2Client.generateAuthUrl({
        // 'online' (default) or 'offline' (gets refresh_token)
        access_type: 'offline',
        /** Pass in the scopes array defined above.
         * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
        scope: SCOPES,
        // Enable incremental authorization. Recommended as a best practice.
        include_granted_scopes: true
    });

    console.log(authorizationUrl)

    return authorizationUrl;
};

module.exports = router;
