// backend/services/resumeParser.js
import fs from 'fs';
import { createRequire } from 'module';
import AIService from './aiService.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse'); // pdf-parse is CommonJS -> load with require()

class ResumeParser {
  /**
   * Accepts either:
   * - a Buffer (pdf content), or
   * - a path to a file (string)
   *
   * Returns structured parsed object (name, email, phone, experience, skills, raw)
   */
  async parsePDF(input) {
    try {
      let buffer;
      if (Buffer.isBuffer(input)) {
        buffer = input;
      } else if (typeof input === 'string') {
        buffer = fs.readFileSync(input);
      } else {
        throw new Error('parsePDF expects a Buffer or a file path string');
      }

      const data = await pdfParse(buffer);
      // pdf-parse returns { text, numpages, info, metadata, etc. }
      return this.extractTextData(data.text || '');
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error('Failed to parse PDF resume');
    }
  }

  async parseText(text) {
    if (typeof text !== 'string') text = String(text || '');
    return this.extractTextData(text);
  }

  async extractTextData(text) {
    // Clean and normalize text
    const cleanedText = (text || '')
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Attempt AI parsing, but gracefully fallback if AIService is not available or errors
    let parsedData = {};
    try {
      if (AIService && typeof AIService.parseResumeText === 'function') {
        parsedData = await AIService.parseResumeText(cleanedText);
      } else {
        parsedData = {};
      }
    } catch (aiErr) {
      console.warn('AIService.parseResumeText failed — falling back to regex extraction:', aiErr?.message || aiErr);
      parsedData = {};
    }

    // Enhance with regex-based extraction to fill gaps or override AI results
    const enhanced = this.enhanceWithRegex(cleanedText, parsedData || {});
    // include raw content for downstream processing or debugging
    enhanced.raw = cleanedText;
    return enhanced;
  }

  enhanceWithRegex(text, parsedData = {}) {
    // Extract name (basic - first two capitalized words) unless already present
    if (!parsedData.name) {
      const nameMatch = text.match(/\b([A-Z][a-z]+(?:[\s-][A-Z][a-z]+){0,2})\b/);
      if (nameMatch) parsedData.name = nameMatch[1];
    }

    // Extract email
    if (!parsedData.email) {
      const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
      if (emailMatch) parsedData.email = emailMatch[0];
    }

    // Extract phone (common international/local formats)
    if (!parsedData.phone) {
      const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/);
      if (phoneMatch) parsedData.phone = phoneMatch[0];
    }

    // Extract highest years of experience mentioned
    if (!parsedData.experience) {
      const expMatches = text.match(/(\d{1,2})\s*(?:years|yrs|year)\b/gi);
      if (expMatches && expMatches.length > 0) {
        const years = expMatches.map(m => {
          const n = m.match(/\d+/);
          return n ? parseInt(n[0], 10) : 0;
        });
        parsedData.experience = Math.max(...years);
      }
    }

    // Basic skills extraction: common separators and look for plausible skill tokens
    if (!parsedData.skills) {
      const skillCandidates = [];
      // Look for lines labeled Skills, Technologies, Tools, etc.
      const skillSectionMatch = text.match(/(?:skills|technologies|tools|expertise)[:\s]*([^\n]{0,200})/i);
      if (skillSectionMatch && skillSectionMatch[1]) {
        skillSectionMatch[1]
          .split(/[,;|•\n/]/)
          .map(s => s.trim())
          .filter(Boolean)
          .forEach(s => skillCandidates.push(s));
      } else {
        // fallback: pick known tech keywords
        const techKeywords = ['javascript','typescript','react','vue','angular','node','express','python','django','flask','java','spring','c++','c#','php','aws','gcp','azure','docker','kubernetes','sql','postgres','mysql','mongodb','tensorflow','pytorch','nlp','machine learning','data science'];
        for (const kw of techKeywords) {
          const regex = new RegExp(`\\b${kw.replace(/[.+?^${}()|[\]\\]/g,'\\$&')}\\b`, 'i');
          if (regex.test(text)) skillCandidates.push(kw);
        }
      }
      // unique and trimmed
      parsedData.skills = Array.from(new Set(skillCandidates.map(s => s.toLowerCase().trim()))).slice(0, 50);
    }

    return parsedData;
  }

  /**
   * helper which accepts either a file path or a buffer and returns parsed object
   * @param {string|Buffer} fileOrBuffer
   * @param {string} originalName - optional original filename to help decide type
   */
  async parseResumeFile(fileOrBuffer, originalName = '') {
    try {
      // If fileOrBuffer is a buffer -> decide by originalName
      if (Buffer.isBuffer(fileOrBuffer)) {
        if ((originalName || '').toLowerCase().endsWith('.pdf')) {
          return await this.parsePDF(fileOrBuffer);
        } else {
          // treat as plain text fallback
          return await this.parseText(fileOrBuffer.toString('utf8'));
        }
      }

      // If fileOrBuffer is a path string
      if (typeof fileOrBuffer === 'string') {
        const lower = (originalName || fileOrBuffer).toLowerCase();
        if (lower.endsWith('.pdf')) {
          return await this.parsePDF(fileOrBuffer);
        } else {
          // read file and treat as text
          const text = fs.readFileSync(fileOrBuffer, 'utf8');
          return await this.parseText(text);
        }
      }

      throw new Error('Unsupported input to parseResumeFile. Provide Buffer or string file path.');
    } catch (error) {
      console.error('Resume file parsing error:', error);
      throw error;
    }
  }
}

export default new ResumeParser();
