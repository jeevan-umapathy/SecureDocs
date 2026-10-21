const path = require('path');
const fs = require('fs/promises');
require('../backend/node_modules/dotenv').config({path:path.join(__dirname,'../backend/.env'),quiet:true});
const {Pool}=require('../backend/node_modules/pg');
const adminPool=new Pool(process.env.DATABASE_URL?{connectionString:process.env.DATABASE_URL}:{user:process.env.DB_USER,host:process.env.DB_HOST,database:process.env.DB_NAME,password:process.env.DB_PASSWORD,port:process.env.DB_PORT});
const name='securedocs_test_'+Date.now();
(async()=>{
await adminPool.query('CREATE DATABASE "'+name+'"');
process.env.DB_NAME=name;
if(process.env.DATABASE_URL){const u=new URL(process.env.DATABASE_URL);u.pathname='/'+name;process.env.DATABASE_URL=u.toString();}
process.env.JWT_SECRET='temporary-preview-secret';
process.env.FRONTEND_ORIGIN='http://127.0.0.1:5174';
process.env.UPLOAD_DIR=path.join(__dirname,'preview-uploads');
const pool=require('../backend/config/database');
await pool.query(await fs.readFile(path.join(__dirname,'../backend/tests/legacy-schema.sql'),'utf8'));
await pool.query(await fs.readFile(path.join(__dirname,'../backend/migrations/001_activity_admin.sql'),'utf8'));
const bcrypt=require('../backend/node_modules/bcrypt');
const hash=await bcrypt.hash('Preview-only-123',10);
const owner=(await pool.query("INSERT INTO users(username,email,password_hash,role) VALUES('Review Admin','review@example.test',$1,'admin') RETURNING id",[hash])).rows[0];
await pool.query("INSERT INTO users(username,email,password_hash) VALUES('Demo Recipient','recipient@example.test',$1)",[hash]);
await fs.mkdir(process.env.UPLOAD_DIR,{recursive:true});
const contents='%PDF-1.4\nDisposable UI review file';
const loc=path.join(process.env.UPLOAD_DIR,'review.pdf');await fs.writeFile(loc,contents);
const file=await require('../backend/models/fileModel').createFile(owner.id,'Database review notes.pdf','review.pdf',loc,'application/pdf',Buffer.byteLength(contents));
await require('../backend/models/shareModel').createShare(file.id,owner.id,'recipient@example.test');
const server=require('../backend/server').listen(3000,'127.0.0.1',()=>console.log('Disposable preview API ready on port 3000'));
process.stdin.resume();
process.stdin.once('data',async()=>{await new Promise(r=>server.close(r));await pool.end();if(/^securedocs_test_[0-9]+$/.test(name))await adminPool.query('DROP DATABASE "'+name+'"');await adminPool.end();process.exit(0);});
})().catch(e=>{console.error(e.message);process.exitCode=1;});
