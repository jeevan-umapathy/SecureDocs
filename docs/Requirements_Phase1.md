# SecureDocs

## Project Title

**SecureDocs: Secure Cloud File Sharing Platform with Multi-Factor
Authentication**

## Problem Statement

Individuals and small teams need a secure way to store, organize, and
share files over the internet. Existing solutions may be expensive,
overly complex, or unsuitable for learning purposes. SecureDocs is a
learning-oriented cloud file sharing platform that demonstrates modern
software engineering, database design, authentication, and cloud storage
concepts.

## Objective

Design and develop a secure cloud-based file sharing platform that
allows authenticated users to upload, organize, search, download, and
share files while protecting user accounts with Google Authenticator
(TOTP) and secure authentication.

## Scope

### Included

-   User registration and login
-   JWT authentication
-   Google Authenticator (TOTP)
-   Upload, download, rename and delete files
-   Folder creation and organization
-   Search files
-   File sharing with registered users
-   Audit logs
-   Role-based access control (User/Admin)
-   Cloud object storage integration

### Excluded (Phase 1)

-   Real-time collaboration
-   File version history
-   Chat
-   AI features
-   Mobile application
-   Public share links
-   Folder sharing

## User Roles

### User

-   Register
-   Login
-   Verify using Google Authenticator
-   Upload files
-   Download files
-   Delete files
-   Rename files
-   Create folders
-   Search files
-   Share files

### Admin

-   View users
-   Disable users
-   View audit logs
-   View storage statistics

## Functional Requirements

  ID      Requirement
  ------- -----------------------------------
  FR-01   User registration
  FR-02   User login
  FR-03   Google Authenticator verification
  FR-04   Upload files
  FR-05   Download files
  FR-06   Delete files
  FR-07   Rename files
  FR-08   Create folders
  FR-09   Search files
  FR-10   Store metadata in PostgreSQL
  FR-11   Store files in cloud storage
  FR-12   Maintain audit logs
  FR-13   Admin user management

## Non-Functional Requirements

-   Passwords must be securely hashed.
-   Authentication must use JWT.
-   Multi-factor authentication is required.
-   Designed for HTTPS deployment.
-   Database should support indexing.
-   Responsive user interface.

## Technology Stack

-   Frontend: React
-   Backend: Node.js + Express
-   Database: PostgreSQL
-   Authentication: JWT + Google Authenticator (TOTP)
-   Cloud Storage: MinIO (development), AWS S3/Cloudflare R2 (later)
-   Version Control: Git & GitHub

## Core Entities

-   User
-   Folder
-   File
-   Share
-   AuditLog

## Entity Overview

### User

-   id
-   username
-   email
-   password_hash
-   totp_secret
-   role
-   created_at

### Folder

-   id
-   owner_id
-   folder_name
-   parent_folder_id
-   created_at

### File

-   id
-   owner_id
-   folder_id (nullable)
-   filename
-   cloud_key
-   size
-   mime_type
-   uploaded_at

### Share

-   id
-   file_id
-   shared_with
-   permission
-   shared_at

### AuditLog

-   id
-   user_id
-   action
-   timestamp

## High-Level Relationships

-   One User owns many Folders.
-   One User owns many Files.
-   One User generates many Audit Logs.
-   One Folder contains many Files.
-   One File can be shared with many Users.
-   Files may exist in the root directory (folder_id is nullable).
-   Phase 1 supports file sharing only (no folder sharing).

## User Flow

### New User

Register → Login → Set up Google Authenticator → Scan QR Code → Verify
6-digit code → Dashboard

### Returning User

Login → Enter TOTP code → Dashboard

## Planned Dashboard

-   Upload File
-   Download File
-   Rename File
-   Delete File
-   Create Folder
-   Search Files
-   Share Files
-   View Storage Usage
-   Logout

## Current Phase Status

### Completed

-   Requirements Analysis
-   Project Scope
-   User Roles
-   Functional Requirements
-   Non-Functional Requirements
-   Technology Stack
-   Entity Identification
-   High-Level System Design
-   User Flow

### Next

-   ER Diagram
-   Relational Schema
-   Normalization (1NF--3NF)
-   API Design
