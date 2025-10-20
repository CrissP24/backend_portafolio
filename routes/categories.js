const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Obtener todas las categorías (público)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COUNT(p.id) as project_count 
      FROM categories c 
      LEFT JOIN projects p ON c.name = p.category 
      GROUP BY c.id, c.name, c.color, c.description, c.created_at 
      ORDER BY c.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener categoría por ID (público)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear categoría (admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, color, description } = req.body;
    
    if (!name || !color) {
      return res.status(400).json({ message: 'Nombre y color son requeridos' });
    }

    // Verificar que no existe una categoría con el mismo nombre
    const existingCategory = await pool.query('SELECT id FROM categories WHERE name = $1', [name]);
    if (existingCategory.rows.length > 0) {
      return res.status(400).json({ message: 'Ya existe una categoría con ese nombre' });
    }

    const result = await pool.query(
      'INSERT INTO categories (name, color, description) VALUES ($1, $2, $3) RETURNING *',
      [name, color, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar categoría (admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, description } = req.body;

    // Verificar que la categoría existe
    const existingCategory = await pool.query('SELECT id FROM categories WHERE id = $1', [id]);
    if (existingCategory.rows.length === 0) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Verificar que no existe otra categoría con el mismo nombre
    const duplicateCategory = await pool.query('SELECT id FROM categories WHERE name = $1 AND id != $2', [name, id]);
    if (duplicateCategory.rows.length > 0) {
      return res.status(400).json({ message: 'Ya existe una categoría con ese nombre' });
    }

    const result = await pool.query(
      'UPDATE categories SET name = $1, color = $2, description = $3 WHERE id = $4 RETURNING *',
      [name, color, description || null, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar categoría (admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que la categoría existe
    const existingCategory = await pool.query('SELECT id FROM categories WHERE id = $1', [id]);
    if (existingCategory.rows.length === 0) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Verificar que no hay proyectos usando esta categoría
    const projectsUsingCategory = await pool.query('SELECT COUNT(*) FROM projects WHERE category = (SELECT name FROM categories WHERE id = $1)', [id]);
    if (parseInt(projectsUsingCategory.rows[0].count) > 0) {
      return res.status(400).json({ message: 'No se puede eliminar la categoría porque tiene proyectos asociados' });
    }

    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    
    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
