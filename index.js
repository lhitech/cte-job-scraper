import axios from 'axios';
import * as cheerio from 'cheerio';
import { google } from 'googleapis';

const DOC_ID = 'YOUR_GOOGLE_DOC_ID';

const CREDENTIALS = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

async function scrapeJobs() {
  const res = await axios.get('https://jobs.myflorida.com/search/?q=Career+and+Technical+Education');
  const $ = cheerio.load(res.data);
  const jobs = [];

  $('.job-title').each((_, el) => {
    const title = $(el).text().trim();
    const link = 'https://jobs.myflorida.com' + $(el).find('a').attr('href');
    jobs.push(`${title} - ${link}`);
  });

  const auth = new google.auth.GoogleAuth({
    credentials: CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/documents'],
  });

  const client = await auth.getClient();
  const docs = google.docs({ version: 'v1', auth: client });

  const requests = jobs.map(job => ({
    insertText: {
      location: { index: 1 },
      text: `${job}\n`
    }
  }));

  await docs.documents.batchUpdate({
    documentId: DOC_ID,
    requestBody: { requests }
  });

  console.log('✅ Jobs written to Google Doc');
}

scrapeJobs().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
