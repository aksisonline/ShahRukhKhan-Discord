import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';

const app = express();
const port = process.env.PORT || 3000;
const configPath = path.resolve(__dirname, 'config.json');
const uploadsDir = path.resolve(__dirname, 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(null, false);
        }
    }
});

app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

app.get('/dashboard', (req, res) => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const userAudioList = Object.entries(config.userAudio || {}).map(([userId, audioPath]) => {
        const fullPath = path.resolve(uploadsDir, audioPath as string);
        const fileExists = fs.existsSync(fullPath);
        
        return `
        <tr>
            <td>${userId}</td>
            <td>${audioPath}</td>
            <td>
                ${fileExists ? `
                    <audio controls>
                        <source src="/uploads/${path.basename(audioPath as string)}" type="audio/mpeg">
                        Your browser does not support the audio element.
                    </audio>
                ` : '<span style="color: red;">File not found</span>'}
            </td>
            <td>
                <form method="POST" action="/dashboard/delete" style="display: inline;">
                    <input type="hidden" name="userId" value="${userId}">
                    <button type="submit" class="delete-btn">Delete</button>
                </form>
            </td>
        </tr>
    `}).join('');

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>SRK Dashboard</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
                .container {
                    background-color: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                h1 {
                    color: #333;
                    text-align: center;
                }
                form {
                    margin-bottom: 20px;
                }
                .form-group {
                    margin-bottom: 15px;
                }
                label {
                    display: block;
                    margin-bottom: 5px;
                    color: #666;
                }
                input[type="text"],
                input[type="file"] {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                button {
                    background-color: #4CAF50;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                button:hover {
                    background-color: #45a049;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th, td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                }
                th {
                    background-color: #f8f8f8;
                }
                .delete-btn {
                    background-color: #ff4444;
                }
                .delete-btn:hover {
                    background-color: #cc0000;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>SRK Dashboard</h1>
                <form method="POST" action="/dashboard" enctype="multipart/form-data">
                    <div class="form-group">
                        <label for="userId">Discord User ID:</label>
                        <input type="text" id="userId" name="userId" required />
                    </div>
                    <div class="form-group">
                        <label for="audioFile">Audio File:</label>
                        <input type="file" id="audioFile" name="audioFile" accept="audio/*" required />
                    </div>
                    <button type="submit">Upload Audio</button>
                </form>

                <h2>Existing Audio Mappings</h2>
                <table>
                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>File Path</th>
                            <th>Preview</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${userAudioList}
                    </tbody>
                </table>
            </div>
        </body>
        </html>
    `);
});

app.post('/dashboard', upload.single('audioFile'), (req, res) => {
    const { userId } = req.body;
    const audioFile = req.file;

    if (userId && audioFile) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        
        // Remove old file if it exists
        if (config.userAudio[userId]) {
            const oldPath = path.resolve(uploadsDir, path.basename(config.userAudio[userId]));
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        config.userAudio[userId] = audioFile.filename;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        res.redirect('/dashboard');
    } else {
        res.send('Missing userId or audio file.');
    }
});

app.post('/dashboard/delete', (req, res) => {
    const { userId } = req.body;
    if (userId) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.userAudio[userId]) {
            const filePath = path.resolve(uploadsDir, path.basename(config.userAudio[userId]));
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            delete config.userAudio[userId];
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        }
        res.redirect('/dashboard');
    } else {
        res.send('Missing userId.');
    }
});

app.listen(port, () => {
    console.log(`Dashboard running on http://localhost:${port}/dashboard`);
});
