/**
 * Setup script for VarSys Store - Apps Management Collection
 * 
 * This script creates the 'apps' collection in Appwrite with proper schema
 * and migrates existing hardcoded APP_METADATA to the database.
 * 
 * Run with: node scripts/setup-apps-collection.js
 */

import * as sdk from 'node-appwrite';

// Appwrite Configuration - VarSys Store Project (Cloud Frankfurt)
const ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = '695215eb000105cdf565';
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = 'varsys_store_db';
const APPS_COLLECTION_ID = 'apps';

// Hardcoded APP_METADATA from types/index.ts to migrate
const APP_METADATA = {
    'Joint Journey Mobile': {
        icon: 'fa-handshake',
        color: 'blue',
        description: 'Comprehensive personal finance and fitness tracking',
        tagline: 'Your Journey to Financial and Physical Wellness',
        platform_category: 'mobile'
    },
    'CookSuite Mobile': {
        icon: 'fa-utensils',
        color: 'orange',
        description: 'Kitchen management and recipe organization',
        tagline: 'Master Your Kitchen, One Recipe at a Time',
        platform_category: 'mobile'
    },
    'TraQify Mobile': {
        icon: 'fa-chart-line',
        color: 'green',
        description: 'Advanced analytics and tracking solutions',
        tagline: 'Track, Analyze, Optimize Your Life',
        platform_category: 'mobile'
    },
    'Joint Journey Desktop': {
        icon: 'fa-desktop',
        color: 'blue',
        description: 'Desktop version for Windows',
        tagline: 'Full-featured desktop experience',
        platform_category: 'desktop'
    },
    'CookSuite Desktop': {
        icon: 'fa-desktop',
        color: 'orange',
        description: 'Desktop version for Windows',
        tagline: 'Full-featured desktop experience',
        platform_category: 'desktop'
    },
    'TraQify Desktop': {
        icon: 'fa-desktop',
        color: 'green',
        description: 'Desktop version for Windows',
        tagline: 'Full-featured desktop experience',
        platform_category: 'desktop'
    },
    'Usage Tracker Mobile': {
        icon: 'fa-chart-bar',
        color: 'purple',
        description: 'Real-time analytics dashboard for VarSys apps',
        tagline: 'Track, Analyze, Monitor Everything',
        platform_category: 'mobile'
    },
    'Volt Track Mobile': {
        icon: 'fa-bolt',
        color: 'yellow',
        description: 'Energy monitoring and power consumption tracking',
        tagline: 'Power Up Your Energy Management',
        platform_category: 'mobile'
    },
    'Volt Track Desktop': {
        icon: 'fa-desktop',
        color: 'yellow',
        description: 'Desktop version for Windows',
        tagline: 'Full-featured desktop experience',
        platform_category: 'desktop'
    },
    'DocuStore Mobile': {
        icon: 'fa-file-archive',
        color: 'indigo',
        description: 'Document management and storage solution',
        tagline: 'Your Documents, Organized and Secure',
        platform_category: 'mobile'
    },
    'DocuStore Desktop': {
        icon: 'fa-desktop',
        color: 'indigo',
        description: 'Desktop version for Windows',
        tagline: 'Full-featured desktop experience',
        platform_category: 'desktop'
    }
};

const client = new sdk.Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new sdk.Databases(client);

async function setupAppsCollection() {
    try {
        console.log('🚀 Starting Apps Collection Setup...\n');

        // Step 1: Check if collection already exists
        let collectionExists = false;
        try {
            await databases.getCollection(DATABASE_ID, APPS_COLLECTION_ID);
            console.log('✅ Collection "apps" already exists');
            collectionExists = true;
        } catch (error) {
            console.log('📦 Collection "apps" does not exist, creating...');
        }

        // Step 2: Create collection if it doesn't exist
        if (!collectionExists) {
            await databases.createCollection(
                DATABASE_ID,
                APPS_COLLECTION_ID,
                'apps',
                [
                    sdk.Permission.read(sdk.Role.any()), // Public read for store page
                    sdk.Permission.create(sdk.Role.label('admin')),
                    sdk.Permission.update(sdk.Role.label('admin')),
                    sdk.Permission.delete(sdk.Role.label('admin'))
                ]
            );
            console.log('✅ Created collection "apps"');

            // Step 3: Create attributes
            console.log('\n📝 Creating attributes...');

            await databases.createStringAttribute(
                DATABASE_ID,
                APPS_COLLECTION_ID,
                'app_name',
                255,
                true // required
            );
            console.log('  ✅ app_name (string, 255, required, unique)');

            await databases.createStringAttribute(
                DATABASE_ID,
                APPS_COLLECTION_ID,
                'display_name',
                255,
                false // optional - defaults to app_name
            );
            console.log('  ✅ display_name (string, 255, optional)');

            await databases.createStringAttribute(
                DATABASE_ID,
                APPS_COLLECTION_ID,
                'icon',
                100,
                true // required
            );
            console.log('  ✅ icon (string, 100, required) - FontAwesome class');

            await databases.createStringAttribute(
                DATABASE_ID,
                APPS_COLLECTION_ID,
                'color',
                50,
                true // required
            );
            console.log('  ✅ color (string, 50, required) - Tailwind color');

            await databases.createStringAttribute(
                DATABASE_ID,
                APPS_COLLECTION_ID,
                'description',
                500,
                true // required
            );
            console.log('  ✅ description (string, 500, required)');

            await databases.createStringAttribute(
                DATABASE_ID,
                APPS_COLLECTION_ID,
                'tagline',
                200,
                true // required
            );
            console.log('  ✅ tagline (string, 200, required)');

            await databases.createEnumAttribute(
                DATABASE_ID,
                APPS_COLLECTION_ID,
                'platform_category',
                ['mobile', 'desktop', 'web'],
                true // required
            );
            console.log('  ✅ platform_category (enum: mobile/desktop/web, required)');

            await databases.createBooleanAttribute(
                DATABASE_ID,
                APPS_COLLECTION_ID,
                'is_active',
                true // required
            );
            console.log('  ✅ is_active (boolean, required)');

            await databases.createDatetimeAttribute(
                DATABASE_ID,
                APPS_COLLECTION_ID,
                'created_at',
                false // optional
            );
            console.log('  ✅ created_at (datetime, optional)');

            console.log('\n⏳ Waiting 10 seconds for attributes to be ready...');
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Step 4: Create indexes
            console.log('\n🔍 Creating indexes...');

            await databases.createIndex(
                DATABASE_ID,
                APPS_COLLECTION_ID,
                'app_name_unique',
                'unique',
                ['app_name']
            );
            console.log('  ✅ app_name_unique (unique index)');

            await databases.createIndex(
                DATABASE_ID,
                APPS_COLLECTION_ID,
                'is_active_index',
                'key',
                ['is_active']
            );
            console.log('  ✅ is_active_index (key index)');

            await databases.createIndex(
                DATABASE_ID,
                APPS_COLLECTION_ID,
                'platform_index',
                'key',
                ['platform_category']
            );
            console.log('  ✅ platform_index (key index)');

            console.log('\n⏳ Waiting 3 seconds for indexes to be ready...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Step 5: Migrate existing APP_METADATA
        console.log('\n📦 Migrating existing APP_METADATA to database...');

        let migratedCount = 0;
        let skippedCount = 0;

        for (const [appName, metadata] of Object.entries(APP_METADATA)) {
            try {
                // Check if app already exists
                const existing = await databases.listDocuments(
                    DATABASE_ID,
                    APPS_COLLECTION_ID,
                    [sdk.Query.equal('app_name', appName)]
                );

                if (existing.total > 0) {
                    console.log(`  ⏭️  Skipped "${appName}" (already exists)`);
                    skippedCount++;
                    continue;
                }

                // Create app document
                await databases.createDocument(
                    DATABASE_ID,
                    APPS_COLLECTION_ID,
                    sdk.ID.unique(),
                    {
                        app_name: appName,
                        display_name: appName, // Can be customized later
                        icon: metadata.icon,
                        color: metadata.color,
                        description: metadata.description,
                        tagline: metadata.tagline,
                        platform_category: metadata.platform_category,
                        is_active: true, // All apps start active
                        created_at: new Date().toISOString()
                    }
                );

                console.log(`  ✅ Migrated "${appName}"`);
                migratedCount++;
            } catch (error) {
                console.error(`  ❌ Failed to migrate "${appName}":`, error.message);
            }
        }

        console.log(`\n✨ Migration complete!`);
        console.log(`  - Migrated: ${migratedCount} apps`);
        console.log(`  - Skipped: ${skippedCount} apps (already existed)`);
        console.log(`  - Total: ${migratedCount + skippedCount} apps in database\n`);

        console.log('🎉 Apps collection setup complete!\n');
        console.log('Next steps:');
        console.log('  1. Verify collection in Appwrite Console');
        console.log('  2. Update AdminDashboardPage.tsx to use dynamic apps');
        console.log('  3. Update StorePage.tsx to fetch apps from database');
        console.log('  4. Test app management UI\n');

    } catch (error) {
        console.error('\n❌ Setup failed:', error);
        console.error('Details:', error.message);
        process.exit(1);
    }
}

// Run setup
setupAppsCollection();
