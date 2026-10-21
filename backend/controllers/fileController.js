const fileModel = require('../models/fileModel');
const activity = require('../models/activityModel');
const fs = require('fs').promises;
const path = require('path');
async function uploadFile(req, res) {
    if (!req.file) return res.status(400).json({ message: 'Please select a file.' });
    let file;
    try {
        file = await fileModel.createFile(req.user.id, req.file.originalname, req.file.filename, req.file.path, req.file.mimetype, req.file.size);
    } catch (error) {
        await fs.unlink(req.file.path).catch(() => console.error('Upload cleanup failed'));
        throw error;
    }
    res.status(201).json({ message: 'File uploaded successfully.', file });
}
async function getMyFiles(req, res) { res.json({ files: await fileModel.getFilesByOwner(req.user.id) }); }
async function downloadFile(req, res, next) {
    const file = await fileModel.getDownloadableFile(req.params.id, req.user.id);
    if (!file) return res.status(404).json({ message: 'File not found or access revoked.' });
    // Legacy relative paths were stored relative to backend/.
    const location = path.isAbsolute(file.file_path) ? file.file_path : path.resolve(__dirname, '..', file.file_path);
    res.download(location, file.original_name, error => {
        if (error) {
            if (error.code === 'ENOENT') return next(Object.assign(new Error('Stored file is unavailable.'), { status: 404 }));
            return next(error);
        }
        // Transfer and PostgreSQL cannot form one transaction. Log only completed sends.
        activity.record(req.user.id, 'download', file.id, { filename: file.original_name })
            .catch(() => console.error('Download audit failed for file', file.id));
    });
}
async function deleteFile(req, res) {
    // Commit metadata + audit first; an unlink failure must never restore access.
    const file = await fileModel.deleteFile(req.params.id, req.user.id);
    if (!file) return res.status(404).json({ message: 'File not found.' });
    const location = path.isAbsolute(file.file_path) ? file.file_path : path.resolve(__dirname, '..', file.file_path);
    try { await fs.unlink(location); }
    catch (error) { if (error.code !== 'ENOENT') console.error('Deleted file needs disk cleanup:', file.id); }
    res.json({ message: 'File deleted successfully.' });
}
async function renameFile(req, res) {
    const name = req.body?.original_name;
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 255 || /[/\\\x00-\x1F\x7F]/.test(name)) return res.status(400).json({ message: 'Enter a valid filename without slashes, maximum 255 characters.' });
    const file = await fileModel.updateFileName(req.params.id, req.user.id, name.trim());
    if (!file) return res.status(404).json({ message: 'File not found.' });
    res.json({ message: 'File renamed successfully.', file });
}
async function searchFiles(req, res) {
    if (typeof req.query.q !== 'string' || req.query.q.length > 255) return res.status(400).json({ message: 'Enter a search query up to 255 characters.' });
    res.json({ files: await fileModel.searchFiles(req.user.id, req.query.q.trim()) });
}
module.exports = { uploadFile, getMyFiles, downloadFile, deleteFile, renameFile, searchFiles };

