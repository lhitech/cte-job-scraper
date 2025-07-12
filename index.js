import axios from 'axios';
import * as cheerio from 'cheerio';
import { google } from 'googleapis';

const DOC_ID = '1qjf7xW0CN7d0xAoGB0yR7UdlBl55xlYt3IxJm136UbI'; // Replace with your actual Google Doc ID
const CREDENTIALS = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

// ----------------------------------------
// 🔍 Part 1: Job title search on MyFloridaJobs
// ----------------------------------------
const jobTitles = [
  'Career and Technical Education',
  'Technical Instructor',
  'Welding',
  'Health Science',
  'STEM'
];

async function fetchStateJobs(searchTerm) {
  const encodedTerm = encodeURIComponent(searchTerm);
  const url = `https://jobs.myflorida.com/search/?q=${encodedTerm}`;
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);
  const jobs = [];

  $('.job-title').each((_, el) => {
    const title = $(el).text().trim();
    const link = 'https://jobs.myflorida.com' + $(el).find('a').attr('href');
    jobs.push(`${title} - ${link}`);
  });

  return jobs;
}

// ----------------------------------------
// 🏫 Part 2: School district scrapers
// ----------------------------------------

async function scrapeEscambia() {
  const res = await axios.get('https://www.applitrack.com/escambia/onlineapp/');
  const $ = cheerio.load(res.data);
  const jobs = [];
  $('a.joblink').each((_, el) => {
    const title = $(el).text().trim();
    const href = $(el).attr('href');
    const link = href.startsWith('http') ? href : `https://www.applitrack.com${href}`;
    jobs.push(`${title} - ${link}`);
  });
  return jobs;
}

async function scrapeOkaloosa() {
  const res = await axios.get('https://www.applitrack.com/okaloosa/onlineapp/');
  const $ = cheerio.load(res.data);
  const jobs = [];
  $('a.joblink').each((_, el) => {
    const title = $(el).text().trim();
    const href = $(el).attr('href');
    const link = href.startsWith('http') ? href : `https://www.applitrack.com${href}`;
    jobs.push(`${title} - ${link}`);
  });
  return jobs;
}

async function scrapeSantaRosa() {
  const res = await axios.get('https://www.applitrack.com/santarosa/onlineapp/');
  const $ = cheerio.load(res.data);
  const jobs = [];
  $('a.joblink').each((_, el) => {
    const title = $(el).text().trim();
    const href = $(el).attr('href');
    const link = href.startsWith('http') ? href : `https://www.applitrack.com${href}`;
    jobs.push(`${title} - ${link}`);
  });
  return jobs;
}

// ----------------------------------------
// 📄 Part 3: Google Docs integration
// ----------------------------------------

async function updateGoogleDoc() {
  const auth = new google.auth.GoogleAuth({
    credentials: CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/documents'],
  });

  const client = await auth.getClient();
  const docs = google.docs({ version: 'v1', auth: client });

 // Get current document to determine length
const doc = await docs.documents.get({ documentId: DOC_ID });
const endIndex = doc.data.body.content.slice(-1)[0].endIndex || 1;

await docs.documents.batchUpdate({
  documentId: DOC_ID,
  requestBody: {
    requests: [{
      deleteContentRange: {
        range: {
          startIndex: 1,
          endIndex: endIndex,
        },
      }],
    },
  },
});


  const requests = [];

  // Section 1: State job listings by keyword
  for (const title of jobTitles) {
    const jobs = await fetchStateJobs(title);

    requests.push({
      insertText: {
        location: { index: 1 },
        text: `\n\n📌 ${title} Jobs (MyFloridaJobs)\n----------------------\n`
      }
    });

    if (jobs.length === 0) {
      requests.push({
        insertText: {
          location: { index: 1 },
          text: '❌ No jobs found.\n'
        }
      });
    } else {
      for (const job of jobs.reverse()) {
        requests.push({
          insertText: {
            location: { index: 1 },
            text: `- ${job}\n`
          }
        });
      }
    }
  }

  // Section 2: County school districts
  const districtSites = [
    { name: 'Escambia County Schools', fn: scrapeEscambia },
    { name: 'Okaloosa County Schools', fn: scrapeOkaloosa },
    { name: 'Santa Rosa County Schools', fn: scrapeSantaRosa },
  ];

  for (const site of districtSites) {
    const jobs = await site.fn();

    requests.push({
      insertText: {
        location: { index: 1 },
        text: `\n\n🏫 ${site.name} Job Listings\n-------------------------\n`
      }
    });

    if (jobs.length === 0) {
      requests.push({
        insertText: {
          location: { index: 1 },
          text: '❌ No job listings found.\n'
        }
      });
    } else {
      for (const job of jobs.reverse()) {
        requests.push({
          insertText: {
            location: { index: 1 },
            text: `- ${job}\n`
          }
        });
      }
    }
  }

  await docs.documents.batchUpdate({
    documentId: DOC_ID,
    requestBody: { requests }
  });

  console.log('✅ Google Doc updated with job listings.');
}

// ----------------------------------------

updateGoogleDoc().catch((err) => {
  console.error('❌ Error updating doc:', err.message);
  process.exit(1);
});
