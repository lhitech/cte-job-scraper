import axios from 'axios';
import * as cheerio from 'cheerio';
import { google } from 'googleapis';

const DOC_ID = '1qjf7xW0CN7d0xAoGB0yR7UdlBl55xlYt3IxJm136UbI'; 
const CREDENTIALS = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

// ----------------------------
// 🔍 1. Scrape MyFloridaJobs
// ----------------------------
const jobTitles = [
  'Career and Technical Education',
  'Director'
];

async function fetchStateJobs(searchTerm) {
  const url = `https://jobs.myflorida.com/search/?q=${encodeURIComponent(searchTerm)}`;
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

// ----------------------------
// 🏫 2. Scrape district sites
// ----------------------------
async function scrapeAppliTrackDistrict(subdomain) {
  const res = await axios.get(`https://www.applitrack.com/${subdomain}/onlineapp/`);
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

// ----------------------------
// 📄 3. Google Docs Update
// ----------------------------
async function updateGoogleDoc() {
  const auth = new google.auth.GoogleAuth({
    credentials: CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/documents'],
  });

  const client = await auth.getClient();
  const docs = google.docs({ version: 'v1', auth: client });

  // Get document length
  const doc = await docs.documents.get({ documentId: DOC_ID });
  const lastContent = doc.data.body.content.slice(-1)[0];
  let endIndex = lastContent?.endIndex || 1;

  // Don't delete trailing newline
  if (endIndex > 1) {
    endIndex -= 1;
  }

  // Only attempt deletion if there's something to delete
  const deleteRequests = endIndex > 1 ? [{
    deleteContentRange: {
      range: { startIndex: 1, endIndex }
    }
  }] : [];

  const requests = [...deleteRequests];

  // Section 1: MyFloridaJobs by keyword
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

  // Section 2: School Districts
  const districtSites = [
    { name: 'Escambia County Schools', id: 'escambia' }
  ];

  for (const site of districtSites) {
    const jobs = await scrapeAppliTrackDistrict(site.id);

    requests.push({
      insertText: {
        date: {'11/2/2025'},
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

  // Apply all updates
  await docs.documents.batchUpdate({
    documentId: DOC_ID,
    requestBody: { requests }
  });

  console.log('✅ Google Doc updated with job listings.');
}

updateGoogleDoc().catch((err) => {
  console.error('❌ Error updating doc:', err.message);
  process.exit(1);
});
