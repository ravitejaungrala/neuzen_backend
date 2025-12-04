// backend/routes/uploadRoutes.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Serve uploaded files
router.get('/resumes/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '..', 'uploads', 'resumes', filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }
    
    // Send file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Serve file error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error serving file'
    });
  }
});

export default router;
