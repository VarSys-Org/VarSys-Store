import { Client, Databases, Query } from 'node-appwrite';

const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('695215eb000105cdf565')
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function checkAndFixApps() {
    try {
        console.log('📊 Checking all apps in database...\n');
        
        // Get all apps (no filter)
        const response = await databases.listDocuments(
            'varsys_store_db',
            'apps',
            [Query.limit(100)]
        );
        
        console.log(`Total apps: ${response.documents.length}\n`);
        
        const inactiveApps = [];
        
        response.documents.forEach(app => {
            const status = app.is_active ? '✅ Active' : '❌ Inactive';
            console.log(`${status} - ${app.app_name}`);
            if (!app.is_active) {
                inactiveApps.push(app);
            }
        });
        
        if (inactiveApps.length > 0) {
            console.log(`\n⚠️  Found ${inactiveApps.length} inactive apps. Activating them...\n`);
            
            for (const app of inactiveApps) {
                await databases.updateDocument(
                    'varsys_store_db',
                    'apps',
                    app.$id,
                    { is_active: true }
                );
                console.log(`✅ Activated: ${app.app_name}`);
            }
            
            console.log('\n🎉 All apps are now active!');
        } else {
            console.log('\n✅ All apps are already active!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkAndFixApps();
