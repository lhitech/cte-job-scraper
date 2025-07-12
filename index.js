import axios from 'axios';
import * as cheerio from 'cheerio';
import { google } from 'googleapis';

const DOC_ID = 'YOUR_GOOGLE_DOC_ID'; // 🔁 Replace with your actual Google Doc ID
const CREDENTIALS = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

// ----------------------------
// 🔍 1. Scrape MyFloridaJobs
// ----------------------------
const jobTitles = [
  'Career and Technical Education',
  'Technical Instructor',
  'Welding',
  'Health Science',
  'STEM'
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
  const res = await axios.get(`https://www.applitrack.com/$
