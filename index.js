import axios from 'axios';
import * as cheerio from 'cheerio';
import { google } from 'googleapis';

const DOC_ID = 'YOUR_GOOGLE_DOC_ID'; // Replace with your actual Doc ID

// Load and parse the service account credentials from the GitHub secret
const CREDENTIALS = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

async function scrapeJobs() {
  const response = await axios.get(
    'https://jobs.myflorida.com/search/?q=Career+and+Technical+Education'
  );

  const $ = cheerio.load(response.data);
  const jobs = [];

  $('.job-title').each((_, el) => {
    const title = $(el).text().trim();
    const link = 'https://jobs.myflorida.com' + $(el).find('a').attr('href');
    jobs.push(`${title} - ${link}`);
  });

  if (jobs.length === 0) {
    console.log('⚠️ No job listings found.');
    return;
  }

  // Authenticate with Google Docs API using the service account
  const auth = new google.auth.GoogleAuth({
    credentials: CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/documents'],
  });

  const client = await auth.getClient();
  const docs = google.docs({ version: 'v1', auth: client });

  // Clear existing content by inserting a newline at the top
  const clearRequest = [
    {
      deleteContentRange: {
        range: {
          startIndex: 1,
          endIndex: 9999
        }
      }
    }
  ];

  await docs.documents.batchUpdate({
    documentId: DOC_ID,
    requestBody: { requests: clearRequest },
  });

  // Format job listings and add to doc
  const insertRequests = jobs.map(job => ({
    insertText: {
      location: { index: 1 },
      text: `${job}\n`,
    },
  }));

  await docs.documents.batchUpdate({
    documentId: DOC_ID,
    requestBody: { requests: insertRequests },
  });

  console.log(`✅ Added ${jobs.length} job listings to Google Doc`);
}

scrapeJobs().catch((err) => {
  console.error('❌ Failed to update Google Doc:', err.message);
  process.exit(1);
});
