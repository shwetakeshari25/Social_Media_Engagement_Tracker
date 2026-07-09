const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Usage: node test_key.js "path/to/your/downloaded-key.json"

const keyPath = process.argv[2];
const spreadsheetId = '11JCnYmCaqW_szz4ox0UpDSDy3epfJv3v5L98RkWxEWA';

if (!keyPath) {
  console.log('\n[DIAGNOSTIC] Please specify the path to your downloaded credentials JSON file.');
  console.log('Usage: node test_key.js "C:\\Users\\shwet\\Downloads\\your-key.json"\n');
  process.exit(1);
}

try {
  if (!fs.existsSync(keyPath)) {
    console.log(`\n[DIAGNOSTIC] File not found at: ${keyPath}\n`);
    process.exit(1);
  }

  const content = fs.readFileSync(keyPath, 'utf8');
  let json;
  try {
    json = JSON.parse(content);
  } catch (err) {
    console.log('\n[DIAGNOSTIC] ERROR: The file is not a valid JSON file. Details:', err.message);
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('GOOGLE CREDENTIALS DIAGNOSTIC TOOL');
  console.log('======================================================');

  // Check key type
  if (json.web || json.installed) {
    console.log('\n❌ ERROR: This is an "OAuth Client ID" credential file, not a "Service Account" key.');
    console.log('👉 ACTION REQUIRED: Go to Google Cloud Console > APIs & Services > Credentials.');
    console.log('   Click "Create Credentials" > select "Service Account".');
    console.log('   Then create a Key for that Service Account and download it.');
    process.exit(1);
  }

  if (json.type !== 'service_account') {
    console.log(`\n❌ ERROR: Invalid credential type. Expected "service_account", found: "${json.type || 'unknown'}"`);
    console.log('👉 ACTION REQUIRED: Please make sure you are using a Service Account JSON Key file.');
    process.exit(1);
  }

  const clientEmail = json.client_email;
  const privateKey = json.private_key;

  if (!clientEmail || !privateKey) {
    console.log('\n❌ ERROR: Missing client_email or private_key fields.');
    console.log('👉 ACTION REQUIRED: Please download a fresh Service Account JSON key from Google Cloud Console.');
    process.exit(1);
  }

  console.log(`\n✅ Credentials file detected: Service Account key`);
  console.log(`📧 Service Account Email: ${clientEmail}`);
  console.log(`ℹ️ Google Sheet ID to test: ${spreadsheetId}`);
  console.log('\nConnecting to Google API and verifying spreadsheet permissions...');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  console.log('\nTesting OAuth access token generation...');
  auth.getAccessToken()
    .then((tokenResponse) => {
      console.log('✅ Access Token generated successfully!');
      console.log(`🔑 Access Token starts with: ${tokenResponse.token.substring(0, 15)}...`);
      
      console.log('\nConnecting to Google Sheets API and verifying spreadsheet permissions...');
      const sheets = google.sheets({ version: 'v4', auth });

      sheets.spreadsheets.get({ spreadsheetId })
        .then((response) => {
          console.log('\n🎉 SUCCESS: Connected to Google Sheets API successfully!');
          console.log(`📊 Spreadsheet Title: "${response.data.properties.title}"`);
          console.log('👉 Everything is configured correctly! You can paste the contents of this JSON file into the web app to connect.');
        })
        .catch((error) => {
          console.log('\n❌ ERROR CONNECTING TO SPREADSHEET:');
          console.log(error);
          
          const errMsg = error.message || '';
          
          if (errMsg.includes("unregistered callers")) {
            console.log('\n[Reason] Google Sheets API is not enabled in your Google Cloud Project.');
            console.log('👉 ACTION REQUIRED: Go to: https://console.cloud.google.com/apis/library/sheets.googleapis.com');
            console.log('   Select your project and click the "ENABLE" button.');
          } 
          else if (error.code === 403 || errMsg.includes("permission") || errMsg.includes("not found")) {
            console.log('\n[Reason] The spreadsheet is not shared with the service account email, or the email does not have editor permission.');
            console.log(`👉 ACTION REQUIRED: Open your Google Sheet, click "Share" (Top-Right), paste the email:`);
            console.log(`   ${clientEmail}`);
            console.log(`   Set its permission role to "Editor" and click Send/Share.`);
          }
        });
    })
    .catch((tokenErr) => {
      console.log('\n❌ FAILED TO GENERATE ACCESS TOKEN:');
      console.log(tokenErr);
      console.log('\n👉 ACTION REQUIRED: The private key in the JSON file is invalid or corrupted.');
      console.log('   Please make sure you are copying the entire contents of the credentials JSON file, including the private_key field.');
    });

} catch (err) {
  console.log('\n[DIAGNOSTIC] Fatal Error running check:', err.message);
}
