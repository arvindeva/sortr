# Dev Environment Cleanup Scripts

This directory contains scripts to clean your development environment by removing sorter-related data while preserving users and their avatars.

## 🎯 Purpose

These scripts are designed to help you reset your development environment for fresh testing without losing user accounts and avatar data.

## 📋 Available Scripts

### 1. Database Cleanup (`cleanup-dev-db.ts`)

**Command:** `npm run cleanup:db`

Removes all sorter-related data from the database:

**Tables Cleaned:**
- `sessionFiles` - Uploaded files in sessions
- `sorterHistory` - Historical sorter snapshots  
- `sortingResults` - User ranking results
- `sorterItems` - Individual sorter items
- `sorterGroups` - Sorter group data
- `uploadSessions` - File upload sessions
- `sorters` - Main sorter entities

**Tables Preserved:**
- `user` - User accounts
- `account` - Authentication accounts
- `session` - User sessions
- `verificationToken` - Email verification tokens

### 2. R2 Storage Cleanup (`cleanup-dev-r2-sorters.ts`)

**Command:** `npm run cleanup:r2`

Removes sorter-related files from R2 storage:

**Folders Cleaned:**
- `sessions/` - Temporary upload session files
- `sorters/` - Sorter cover images and item images

**Folders Preserved:**
- `avatars/` - User avatar images

### 3. Complete Cleanup (`cleanup-dev-all.ts`)

**Command:** `npm run cleanup:all`

Runs both database and R2 cleanup scripts in sequence with confirmation prompt.

## 🔒 Enhanced Safety Features

- **Multi-layer validation**: Three independent safety checks must pass
- **Production indicator blocking**: Rejects URLs/buckets containing 'prod', 'production', 'live', 'staging'
- **Explicit dev patterns**: Requires specific development indicators in URLs/bucket names
- **Environment validation**: NODE_ENV must be development-friendly
- **Explicit enablement**: DEV_CLEANUP_ENABLED must be set to 'true'
- **Confirmation prompts**: The complete cleanup script asks for explicit confirmation
- **Progress logging**: Detailed output showing what's being cleaned
- **Error handling**: Graceful handling of failures with clear error messages
- **Preservation guarantees**: Users and avatars are never touched

## 🚀 Usage

### Quick Complete Cleanup
```bash
npm run cleanup:all
```

### Individual Operations
```bash
# Clean database only
npm run cleanup:db

# Clean R2 storage only  
npm run cleanup:r2
```

## ⚠️ Important Notes

1. **Development Only**: These scripts include safety checks to prevent running on production environments
2. **Irreversible**: Deleted data cannot be recovered - ensure you want to clean before running
3. **User Preservation**: Users can still log in after cleanup, but all their sorters will be gone
4. **Avatar Preservation**: User avatars remain intact and accessible

## 🔧 Environment Requirements

### Required for All Scripts:
- `DEV_CLEANUP_ENABLED=true` - **Must be explicitly set to 'true'**
- `NODE_ENV` - Must be one of: `development`, `dev`, `local`, `test` (optional but recommended)

### For Database Cleanup:
- `DATABASE_URL` - Must meet these criteria:
  - **MUST contain** one of: `localhost`, `127.0.0.1`, `::1`, `.dev`, `-dev`, `dev.`, `dev-`, `development`
  - **MUST NOT contain** any of: `prod`, `production`, `live`, `staging`

### For R2 Cleanup:
- `R2_BUCKET_NAME` - Must meet these criteria:
  - **MUST** end with `-dev`, start with `dev-`, contain `.dev`, contain `development`, or be exactly `dev`
  - **MUST NOT contain** any of: `prod`, `production`, `live`, `staging`
- `R2_ACCOUNT_ID` 
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

### ⚠️ **Critical Setup Note:**
Add this to your `.env` file:
```bash
DEV_CLEANUP_ENABLED=true
NODE_ENV=development
```

## 📊 Example Output

```
🚀 Starting complete dev environment cleanup...
🎯 This will clean both database and R2 storage
🛡️  Preserving: users, avatars, and authentication data

🔧 Environment check:
NODE_ENV: development
DEV_CLEANUP_ENABLED: ✅ Set

🔒 Running enhanced safety checks...
✅ All safety checks passed!

⚠️  WARNING: This will permanently delete all sorter data from your dev environment!
🛡️  Users and avatars will be preserved.

Are you sure you want to continue? (type 'yes' to confirm): yes

✅ Confirmation received. Starting cleanup...

📱 Running Database Cleanup...
🔒 Running enhanced safety checks...
✅ All safety checks passed!
🗑️  Total deleted: 1,247 records
✅ Database Cleanup completed successfully

📱 Running R2 Storage Cleanup...
🔒 Running enhanced safety checks...
✅ All safety checks passed!
🗑️  Total deleted: 89 objects
✅ R2 Storage Cleanup completed successfully

🎉 Complete dev environment cleanup finished successfully!
```

### If Safety Checks Fail:

```
🔧 Environment check:
NODE_ENV: production
DEV_CLEANUP_ENABLED: ❌ Missing

🔒 Running enhanced safety checks...
❌ Safety check failed: NODE_ENV is not set to a development environment
Current NODE_ENV: production
Allowed values: development, dev, local, test
```

## 🏗️ Technical Details

- **Database**: Uses Drizzle ORM with proper foreign key handling
- **R2 Storage**: Uses AWS SDK v3 with batch deletion (1000 objects per batch)
- **Error Recovery**: Individual failures don't stop the entire process
- **Logging**: Comprehensive progress tracking and error reporting