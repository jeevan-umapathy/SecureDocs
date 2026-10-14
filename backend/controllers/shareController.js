const model = require('../models/shareModel');
async function shareFile(req, res) {
    const email = req.body?.email;
    if (typeof email !== 'string' || !email.trim() || email.length > 255) return res.status(400).json({ message: 'Recipient email is required.' });
    res.status(201).json({ message: 'File shared successfully.', share: await model.createShare(req.params.id, req.user.id, email.trim()) });
}
async function getSharedFiles(req, res) { res.json({ files: await model.getSharedFiles(req.user.id) }); }
async function getFileShares(req, res) { res.json({ shares: await model.getFileShares(req.params.id, req.user.id) }); }
async function revokeShare(req, res) {
    await model.revokeShare(req.params.id, req.params.shareId, req.user.id);
    res.json({ message: 'Access revoked.' });
}
module.exports = { shareFile, getSharedFiles, getFileShares, revokeShare };

