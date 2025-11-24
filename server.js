import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// --- ESM COMPATIBILITY FIX ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --- DIRECTORY SETUP ---
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const BUILD_DIR = path.join(__dirname, 'dist'); 

const DB_FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  projects: path.join(DATA_DIR, 'projects.json'),
};

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Initialize DB Files if missing
if (!fs.existsSync(DB_FILES.users)) fs.writeFileSync(DB_FILES.users, '[]');
if (!fs.existsSync(DB_FILES.projects)) fs.writeFileSync(DB_FILES.projects, '[]');

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Replaces body-parser

// 1. Serve Uploaded Assets (Public)
app.use('/uploads', express.static(UPLOADS_DIR));

// 2. Serve Frontend Static Files (Vite Build)
app.use(express.static(BUILD_DIR));

// --- HELPER FUNCTIONS (MOCK DATABASE) ---
const db = {
  read: (file) => {
    try {
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      }
      return [];
    } catch (e) { return []; }
  },
  write: (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }
};

// --- API ROUTES ---

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  const user = {
    id: 'usr_' + Date.now(),
    email: email,
    name: email.split('@')[0],
    role: 'ADMIN',
    token: 'mock-jwt-token-' + Date.now()
  };
  res.json(user);
});

// Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fullUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: fullUrl, filename: req.file.filename, mimetype: req.file.mimetype });
});

// Projects: List
app.get('/api/projects', (req, res) => {
  const projects = db.read(DB_FILES.projects);
  res.json(projects);
});

// Projects: Get One
app.get('/api/projects/:id', (req, res) => {
  const projects = db.read(DB_FILES.projects);
  const project = projects.find(p => p.id === req.params.id);
  if (project) res.json(project);
  else res.status(404).json({ error: 'Not found' });
});

// Projects: Save (Create/Update)
app.post('/api/projects', (req, res) => {
  const project = req.body;
  const projects = db.read(DB_FILES.projects);
  
  const index = projects.findIndex(p => p.id === project.id);
  if (index >= 0) {
    projects[index] = { ...projects[index], ...project, lastModified: new Date().toISOString() };
  } else {
    project.lastModified = new Date().toISOString();
    projects.unshift(project);
  }
  
  db.write(DB_FILES.projects, projects);
  res.json(project);
});

// --- SPA ROUTING (SSR LITE) ---
app.get('*', (req, res) => {
  const indexPath = path.join(BUILD_DIR, 'index.html');
  
  if (req.path.startsWith('/v/')) {
    const projectId = req.path.split('/v/')[1];
    const projects = db.read(DB_FILES.projects);
    const project = projects.find(p => p.id === projectId);

    if (project && fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf8');
      
      const seoTags = `
        <title>${project.name}</title>
        <meta property="og:title" content="${project.name}" />
        <meta property="og:image" content="${project.thumbnail}" />
        <script>window.__INITIAL_PROJECT__ = ${JSON.stringify(project)};</script>
      `;
      
      html = html.replace('<!--SEO_START-->', '').replace('<!--SEO_END-->', '');
      html = html.replace('<title>Adhvyk AR Studio</title>', seoTags);
      
      return res.send(html);
    }
  }

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Build not found. Please run "npm run build".');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Serving static files from ${BUILD_DIR}`);
});