// routes/tasks.js  ─── Farm task management (CRUD)
'use strict';

const express = require('express');
const db      = require('../db/setup');
const auth    = require('../middleware/auth');
const router  = express.Router();

// GET /api/tasks  ─── list all tasks for logged-in farmer
router.get('/', auth, (req, res) => {
  const { status, priority, date } = req.query;
  let sql = 'SELECT * FROM tasks WHERE farmer_id=?';
  const params = [req.farmer.id];

  if (status)   { sql += ' AND status=?';   params.push(status); }
  if (priority) { sql += ' AND priority=?'; params.push(priority); }
  if (date)     { sql += ' AND due_date=?'; params.push(date); }
  sql += ' ORDER BY CASE priority WHEN "urgent" THEN 1 WHEN "normal" THEN 2 ELSE 3 END, due_date';

  const tasks = db.prepare(sql).all(...params);
  const summary = {
    total  : tasks.length,
    done   : tasks.filter(t=>t.status==='done').length,
    pending: tasks.filter(t=>t.status==='pending').length,
    urgent : tasks.filter(t=>t.priority==='urgent'&&t.status==='pending').length,
  };
  return res.json({ tasks, summary });
});

// POST /api/tasks  ─── create task
router.post('/', auth, (req, res) => {
  const { title, description, due_date, priority, field_name } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title is required.' });

  const result = db.prepare(`
    INSERT INTO tasks (farmer_id, title, description, due_date, priority, field_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.farmer.id, title, description||null, due_date||null, priority||'normal', field_name||null);

  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(result.lastInsertRowid);
  return res.status(201).json({ message: 'Task created!', task });
});

// PUT /api/tasks/:id  ─── update task
router.put('/:id', auth, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id=? AND farmer_id=?')
                 .get(req.params.id, req.farmer.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  const { title, description, due_date, priority, status, field_name } = req.body;
  db.prepare(`
    UPDATE tasks SET title=?,description=?,due_date=?,priority=?,status=?,field_name=?
    WHERE id=?
  `).run(
    title       ?? task.title,
    description ?? task.description,
    due_date    ?? task.due_date,
    priority    ?? task.priority,
    status      ?? task.status,
    field_name  ?? task.field_name,
    task.id
  );
  return res.json({ message: 'Task updated.', task: db.prepare('SELECT * FROM tasks WHERE id=?').get(task.id) });
});

// PATCH /api/tasks/:id/toggle  ─── toggle done/pending
router.patch('/:id/toggle', auth, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id=? AND farmer_id=?')
                 .get(req.params.id, req.farmer.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  const newStatus = task.status === 'done' ? 'pending' : 'done';
  db.prepare('UPDATE tasks SET status=? WHERE id=?').run(newStatus, task.id);
  return res.json({ message: `Task marked as ${newStatus}.`, status: newStatus });
});

// DELETE /api/tasks/:id
router.delete('/:id', auth, (req, res) => {
  const task = db.prepare('SELECT id FROM tasks WHERE id=? AND farmer_id=?')
                 .get(req.params.id, req.farmer.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  db.prepare('DELETE FROM tasks WHERE id=?').run(task.id);
  return res.json({ message: 'Task deleted.' });
});

module.exports = router;
