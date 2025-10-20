const express = require('express');
const multer = require('multer');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Configuración de multer para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'project-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB límite
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  }
});

// Obtener todos los proyectos (público)
router.get('/', async (req, res) => {
  try {
    const { category, featured } = req.query;
    let query = 'SELECT * FROM projects WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (featured === 'true') {
      query += ' AND featured = true';
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener proyectos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener proyecto por ID (público)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener proyecto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear proyecto (admin)
router.post('/', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, description, technologies, github_url, demo_url, category, featured } = req.body;
    
    if (!title || !description || !technologies) {
      return res.status(400).json({ message: 'Título, descripción y tecnologías son requeridos' });
    }

    const technologiesArray = Array.isArray(technologies) ? technologies : technologies.split(',').map(t => t.trim());
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO projects (title, description, technologies, image_url, github_url, demo_url, category, featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description, technologiesArray, imageUrl, github_url, demo_url, category || 'web', featured === 'true']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear proyecto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar proyecto (admin)
router.put('/:id', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, technologies, github_url, demo_url, category, featured } = req.body;

    // Verificar que el proyecto existe
    const existingProject = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (existingProject.rows.length === 0) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    const technologiesArray = Array.isArray(technologies) ? technologies : technologies.split(',').map(t => t.trim());
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : existingProject.rows[0].image_url;

    const result = await pool.query(
      `UPDATE projects SET 
       title = $1, description = $2, technologies = $3, image_url = $4, 
       github_url = $5, demo_url = $6, category = $7, featured = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 RETURNING *`,
      [title, description, technologiesArray, imageUrl, github_url, demo_url, category, featured === 'true', id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar proyecto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar proyecto (admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    res.json({ message: 'Proyecto eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar proyecto:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
