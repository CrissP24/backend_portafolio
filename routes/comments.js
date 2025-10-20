const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Obtener comentarios por proyecto (público - solo aprobados)
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM comments WHERE project_id = $1 AND approved = true ORDER BY created_at DESC',
      [projectId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener todos los comentarios (admin)
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { approved } = req.query;
    let query = `
      SELECT c.*, p.title as project_title 
      FROM comments c 
      JOIN projects p ON c.project_id = p.id
    `;
    const params = [];
    
    if (approved !== undefined) {
      query += ' WHERE c.approved = $1';
      params.push(approved === 'true');
    }
    
    query += ' ORDER BY c.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear comentario (público)
router.post('/', async (req, res) => {
  try {
    const { project_id, author_name, author_email, content, rating } = req.body;

    if (!project_id || !author_name || !author_email || !content) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    // Verificar que el proyecto existe
    const projectExists = await pool.query('SELECT id FROM projects WHERE id = $1', [project_id]);
    if (projectExists.rows.length === 0) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    const result = await pool.query(
      `INSERT INTO comments (project_id, author_name, author_email, content, rating, approved)
       VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
      [project_id, author_name, author_email, content, rating || null]
    );

    res.status(201).json({
      message: 'Comentario enviado correctamente. Será revisado antes de publicarse.',
      comment: result.rows[0]
    });
  } catch (error) {
    console.error('Error al crear comentario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Aprobar/rechazar comentario (admin)
router.patch('/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    const result = await pool.query(
      'UPDATE comments SET approved = $1 WHERE id = $2 RETURNING *',
      [approved, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Comentario no encontrado' });
    }

    res.json({
      message: approved ? 'Comentario aprobado' : 'Comentario rechazado',
      comment: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar comentario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar comentario (admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM comments WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Comentario no encontrado' });
    }

    res.json({ message: 'Comentario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar comentario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
