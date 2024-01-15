// routes.js
const express = require('express');
const bodyParser = require('body-parser');
const {auth} = require("googleapis/build/src/apis/dlp");
const { google } = require('googleapis');
const cron = require("node-cron");
const {Base64} = require('js-base64');
const HTMLParser = require('node-html-parser');

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
        maxResults: 20,
        // pageToken: pageToken
    });


    // console.log(relist, "list");

    let mailList = []
    for (let i = 0; i < relist.data.messages.length; i++){
        const message = relist.data.messages[i];
        // console.log(message, "message")
        const msg = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: "full"
        });
        // console.log(msg.data, "msg")
        mailList.push(msg.data)
    }

    // console.log(mailList, "mailList")

    return {
        list: mailList,
        nextPageToken: relist.data.nextPageToken,
        resultSizeEstimate: relist.data.resultSizeEstimate
    }
}


router.post('/auth', async (req, res) => {
    const code = req.body?.code;
    console.log(req.body)

    // if(!oauth2Client){
    //     const result = await fetchGoogleData(); // Replace with your actual Google API function
    //
    //     res.json({redirectUrl: result});
    // }

    if(oauth2Client){
        console.log("inside if")
        console.log(req.body?.pageToken, "pagetoken")
        res.json(await getMails(req.body?.pageToken))
    }
    else {

        let {tokens} = await oauth2Client.getToken(code);
        console.log(tokens, "response")
        oauth2Client.setCredentials(tokens);

        // gapiLoaded()
        console.log(req.body?.pageToken, "pagetoken")
        res.json(await getMails(req.body?.pageToken))
    }
});


// Route for handling Google API requests
router.get('/authorize', async (req, res) => {
    try {
        // Your Google API logic here
        if(oauth2Client){
            res.json({ redirectUrl:  "https://minoan-gmail.minoanexperience.com/auth"});
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
        "https://minoan-gmail.minoanexperience.com/auth"
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


let historyId = 0;
let cronInProgress = false;

function getHeadersData(headers, value){
    if (!headers || headers === []){
        return ""
    }

    // console.log(headers, "headers")
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        // console.log(header.name, "header")
        // console.log(header.name === value)
        if (header.name === value){
            return header.value
        }
    }

    return "empty"
}

function getDataFromParts(res){
    let rawBody = res.payload?.parts
    // console.log(rawBody)
    if (!rawBody) return ""

    let decodedBody = ""
    for (let index = 0; index < rawBody.length; index++){
        let item = rawBody[index]
        // console.log(item)
        // console.log(item.mimeType)
        if(item.mimeType === "text/html"){
            decodedBody = item.body.data;
            break;
        }
        else if(item["mimeType"] === "text/plain"){
            decodedBody = item.body.data;
        }
    }
    // console.log(decodedBody);

    return Base64.decode(decodedBody.replace(/-/g, '+').replace(/_/g, '/'));
}

function decodeMailBody(res){
    let rawBody = res.payload.body?.data
    if (!rawBody) return getDataFromParts(res)
    
    return Base64.decode(rawBody.replace(/-/g, '+').replace(/_/g, '/'));
}

function elementContainsText(element, text) {
    return element.textContent.includes(text);
}

function getSku(url){
    var match = url.match(/-([^\/]+)\.html/);

    if (match && match[1]) {
        return match[1].split('-').pop();
    }
    return null
}

function extractOrderAndTrackingInfo(decodedBody) {
    // console.log(typeof(decodedBody))
    console.log("extractOrderAndTrackingInfo")
    const doc = HTMLParser.parse(decodedBody);
    let paragraphs = doc.querySelectorAll('p');
    let orderNumber = null;
    let trackingNumber = null;

    // Extract links
    let orderLink = null;
    let trackingLink = null;

    if(paragraphs) {
        // Initialize variables to store order and tracking elements
        let orderElement = null;
        let trackingElement = null;

        // Iterate over the paragraphs and find the ones with specific content
        paragraphs.forEach(function (paragraph) {
            let content = paragraph.textContent.trim();
            if (content.startsWith('Order #:')) {
                orderElement = paragraph;
            } else if (content.startsWith('Tracking #:')) {
                trackingElement = paragraph;
            }
        });

        // Extract order and tracking numbers
        orderNumber = orderElement ? orderElement.textContent.trim().split(':')[1].trim() : null;
        trackingNumber = trackingElement ? trackingElement.textContent.trim().split(':')[1].trim() : null;

        // Extract links
        orderLink = orderElement ? orderElement.querySelector('a').getAttribute('href') : null;
        trackingLink = trackingElement ? trackingElement.querySelector('a').getAttribute('href') : null;

        // Display the results
        // console.log('Order Number:', orderNumber);
        // console.log('Order Link:', orderLink);
        // console.log('Tracking Number:', trackingNumber);
        // console.log('Tracking Link:', trackingLink);
    }

    let strongElement = Array.from(doc.querySelectorAll('strong')).find(element => elementContainsText(element, 'Item(s) in this Shipment'));
    let shippingOrderDetails = []

    // Check if the <strong> element is found
    if (strongElement) {
        // Find the first <tr> ancestor with an "id" containing "Row"
        // console.log(strongElement.outerHTML, "strongElEMENT")
        let ancestorTr = strongElement.closest('tr[id*=Row]');
        // console.log(ancestorTr.outerHTML, "ancestor")

        // Check if the ancestor <tr> is found
        if (ancestorTr) {
            // Get the parent of the ancestor <tr>
            let parentOfAncestor = ancestorTr.parentNode;
            // console.log(parentOfAncestor.outerHTML, "parentOfAncestor")

            // Iterate over all the siblings of the parent
            let sibling = parentOfAncestor.nextElementSibling;
            // console.log("sibling")

            while (sibling) {
                // console.log(sibling.outerHTML, "sibling")
                let aElement = Array.from(sibling.querySelectorAll('a'))
                if(!aElement) {
                    sibling = sibling.nextElementSibling;
                    continue;
                }
                let qtyElement = aElement.find(element => elementContainsText(element, 'Qty:'));
                // console.log(qtyElement, "anchors")
                // console.log(qtyElement.outerHTML, "qtyElement")


                if(qtyElement){
                    let spanValue = qtyElement.querySelector('span').textContent.trim();
                    // console.log("Quantity : ", spanValue);
                    // console.log("spanValue")

                    let grandparents = qtyElement.parentNode.parentNode.parentNode;
                    // console.log("grandparents", grandparents.outerHTML)

                    let firstChild = grandparents.querySelector(':first-child');
                    // console.log('First child of the great-grandparent:', firstChild.outerHTML);
                    // console.log("firstChild")


                    let hrefValue = firstChild.querySelector('a').getAttribute('href');
                    let textContent = firstChild.textContent.trim();
                    // console.log("textContent")

                    // Display the results
                    // console.log('Href:', hrefValue);
                    // console.log('Text Content:', textContent);

                    if (spanValue && hrefValue && textContent){
                        shippingOrderDetails.push({
                            "Quantity": spanValue,
                            "sku": getSku(hrefValue),
                            "title": textContent
                        })
                    }
                }


                // Move to the next sibling
                sibling = sibling.nextElementSibling;
            }
        } else {
            console.log('Ancestor <tr> with "Row" in id not found.');
        }
    } else {
        console.log('Strong element not found.');
    }

    // console.log(shippingOrderDetails)

    const reqBody = {
        'Order Number:': orderNumber,
        'Order Link:': orderLink,
        'Tracking Number:': trackingNumber,
        'Tracking Link:': trackingLink,
        'shippingOrderDetails': shippingOrderDetails
    }

    console.log(reqBody, "ReqBody")

}

async function updateShippingCron(){

    let pageToken = ""
    let currentHistoryId = Number.MAX_SAFE_INTEGER;
    while(currentHistoryId > historyId){
        let mailData = await getMails(pageToken);
        // pageToken = mailData.nextPageToken;

        console.log(mailData.list.length)

        for (let i = 0; i < mailData.list.length; i++){
            let message = mailData.list[i];
            // console.log(message, "message")

            let mailFrom = getHeadersData(message.payload.headers, "From")

            // console.log(mailFrom,"mailfrom")

            if (mailFrom.includes("Orders @ Minoan")){
                console.log(mailFrom)
                const decodedBody = decodeMailBody(message)

                // console.log(decodedBody)
                if(decodedBody){
                    extractOrderAndTrackingInfo(decodedBody)
                }
            }

            // currentHistoryId = message.historyId;
        }
    }

    // historyId = currentHistoryId;
    // console.log(historyId);
}



cron.schedule("*/100  * * * * *", async function() {
    console.log("running a task every 100 second");

    if(!cronInProgress && oauth2Client !== null) {
        console.log("begin cron")
        cronInProgress = true
        await updateShippingCron()
        cronInProgress = false
    }
});


module.exports = router;
