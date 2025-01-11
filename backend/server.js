const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');
const { body, validationResult } = require('express-validator');

dotenv.config();

const { createPool } = require('mysql2/promise');

const app = express();
app.use(express.json());
app.use(cors());

const db = createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
    ssl: {
        rejectUnauthorized: false
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('SIGINT', async () => {
    await db.end();
    process.exit();
});

const getLastID = async (table) => {
    const [result] = await db.query(`SELECT MAX(id) AS lastID FROM ??`, [table]);
    return result[0].lastID || 0;
};

app.get('/', async (req, res) => {
    try {
        const [data] = await db.query("SELECT * FROM student");
        return res.json({ message: "From Backend!!!", studentData: data });
    } catch (error) {
        console.error('Error fetching student data:', error);
        return res.status(500).json({ error: 'Error fetching student data' });
    }
});

app.get('/student', async (req, res) => {
    try {
        const [data] = await db.query("SELECT * FROM student");
        return res.json(data);
    } catch (error) {
        console.error('Error fetching students:', error);
        return res.status(500).json({ error: 'Error fetching students' });
    }
});

app.get('/teacher', async (req, res) => {
    try {
        const [data] = await db.query("SELECT * FROM teacher");
        return res.json(data);
    } catch (error) {
        console.error('Error fetching teachers:', error);
        return res.status(500).json({ error: 'Error fetching teachers' });
    }
});

app.post('/addstudent', [
    body('name').isString().notEmpty(),
    body('rollNo').isNumeric(),
    body('class').isString().notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const lastStudentID = await getLastID('student');
        const nextStudentID = lastStudentID + 1;

        const { name, rollNo, class: studentClass } = req.body;
        const sql = `INSERT INTO student (id, name, roll_number, class) VALUES (?, ?, ?, ?)`;
        await db.query(sql, [nextStudentID, name, rollNo, studentClass]);
        return res.json({ message: 'Data inserted successfully' });
    } catch (error) {
        console.error('Error inserting student data:', error);
        return res.status(500).json({ error: 'Error inserting student data' });
    }
});

app.post('/addteacher', [
    body('name').isString().notEmpty(),
    body('subject').isString().notEmpty(),
    body('class').isString().notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const lastTeacherID = await getLastID('teacher');
        const nextTeacherID = lastTeacherID + 1;

        const { name, subject, class: teacherClass } = req.body;
        const sql = `INSERT INTO teacher (id, name, subject, class) VALUES (?, ?, ?, ?)`;
        await db.query(sql, [nextTeacherID, name, subject, teacherClass]);
        return res.json({ message: 'Data inserted successfully' });
    } catch (error) {
        console.error('Error inserting teacher data:', error);
        return res.status(500).json({ error: 'Error inserting teacher data' });
    }
});

app.delete('/student/:id', async (req, res) => {
    const studentId = req.params.id;
    const sqlDelete = 'DELETE FROM student WHERE id = ?';
    const sqlSelect = 'SELECT id FROM student ORDER BY id';

    try {
        await db.query(sqlDelete, [studentId]);
        const [rows] = await db.query(sqlSelect);

        const updatePromises = rows.map(async (row, index) => {
            const newId = index + 1;
            await db.query('UPDATE student SET id = ? WHERE id = ?', [newId, row.id]);
        });

        await Promise.all(updatePromises);
        return res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Error deleting student:', error);
        return res.status(500).json({ error: 'Error deleting student' });
    }
});

app.delete('/teacher/:id', async (req, res) => {
    const teacherID = req.params.id;
    const sqlDelete = 'DELETE FROM teacher WHERE id = ?';
    const sqlSelect = 'SELECT id FROM teacher ORDER BY id';

    try {
        await db.query(sqlDelete, [teacherID]);
        const [rows] = await db.query(sqlSelect);

        const updatePromises = rows.map(async (row, index) => {
            const newId = index + 1;
            await db.query('UPDATE teacher SET id = ? WHERE id = ?', [newId, row.id]);
        });

        await Promise.all(updatePromises);
        return res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        console.error('Error deleting teacher:', error);
        return res.status(500).json({ error: 'Error deleting teacher' });
    }
});

app.listen(3500, () => {
    console.log("Server listening on Port 3500");
});
