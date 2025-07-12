import axios from 'axios';
import * as cheerio from 'cheerio';
import { google } from 'googleapis';

const DOC_ID = 'YOUR_GOOGLE_DOC_ID'; // Replace with your actual Google Doc ID
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
    con
