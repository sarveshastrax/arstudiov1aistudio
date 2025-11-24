
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(PROJECTS_FILE)) fs.writeFileSync(PROJECTS_FILE, '[]');

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Serve static assets first (build folder)
// IMPORTANT: Do not serve index.html automatically for /v/:id routes
app.use(express.static(path.join(__dirname, 'build'), { index: false }));
app.use('/uploads', express.static(UPLOADS_DIR));

// --- API ROUTES ---

// 1. Upload Asset
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  const publicUrl = `/uploads/${req.file.filename}`;
  res.json({ 
    url: publicUrl,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

// 2. Get All Projects
app.get('/api/projects', (req, res) => {
  try {
    const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read database' });
  }
});

// 3. Save Project
app.post('/api/projects', (req, res) => {
  try {
    const project = req.body;
    const data = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
    
    const index = data.findIndex(p => p.id === project.id);
    if (index >= 0) {
      data[index] = project;
    } else {
      data.unshift(project);
    }
    
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(data, null, 2));
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save project' });
  }
});

// 4. Get Single Project
app.get('/api/projects/:id', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
    const project = data.find(p => p.id === req.params.id);
    if (project) res.json(project);
    else res.status(404).json({ error: 'Project not found' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- SSR / CLIENT ROUTING ---

// Handle Viewer Route with SSR (Data Injection)
app.get('/v/:id', (req, res) => {
  const projectId = req.params.id;
  const indexPath = path.join(__dirname, 'build', 'index.html');

  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) return res.status(500).send('Error loading app');

    // Try to find project for SEO tags
    let project = null;
    try {
      const data = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
      project = data.find(p => p.id === projectId);
    } catch (e) {}

    if (project) {
      // Inject SEO Meta Tags
      const seoTags = `
        <title>${project.name} | Adhvyk AR</title>
        <meta name="description" content="View this AR experience created with Adhvyk AR Studio." />
        <meta property="og:title" content="${project.name}" />
        <meta property="og:description" content="Interactive Augmented Reality Experience." />
        <meta property="og:image" content="${project.thumbnail}" />
        <meta property="twitter:card" content="summary_large_image" />
      `;
      
      // Inject Data so client doesn't need to fetch
      const dataInjection = `
        <script>
          window.__INITIAL_PROJECT__ = ${JSON.stringify(project)};
        </script>
      `;

      // Replace placeholders
      let finalHtml = html.replace('<!--SEO_START-->', '').replace('<!--SEO_END-->', ''); // Remove default block if needed
      finalHtml = finalHtml.replace('<title>Adhvyk AR Studio</title>', seoTags); 
      finalHtml = finalHtml.replace('<!--DATA_INJECTION_POINT-->', dataInjection);
      
      res.send(finalHtml);
    } else {
      // Send default if project not found (let client handle 404 UI)
      res.sendFile(indexPath);
    }
  });
});

// Fallback for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
