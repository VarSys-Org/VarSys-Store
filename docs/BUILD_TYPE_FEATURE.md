# Build Type Feature - Development & Production Builds

## Overview
The VarSys Store now supports separate display of **Development** and **Production** builds within each application, organized by build type and then by month of release.

## Features Added

### 1. Build Type Classification
- **Production Builds**: Stable releases for end users (🚀)
- **Development Builds**: Testing/debug builds for developers and testers (🔧)

### 2. UI Enhancements

#### Hierarchy Structure
Each application displays builds in the following structure:
```
App Name (e.g., "TraQify Mobile")
├── 🚀 Production (X builds)
│   ├── January 2026 (Y builds)
│   │   ├── v1.0.1
│   │   └── v1.0.0
│   └── December 2025 (Z builds)
│       └── v0.9.5
└── 🔧 Development (X builds)
    ├── January 2026 (Y builds)
    │   └── v1.0.1-dev
    └── December 2025 (Z builds)
        └── v0.9.5-dev
```

**Key Design Decisions**:
- Production and Development builds are shown within the same app section
- Build type headers (Production/Development) are distinct with icons and colors
- Monthly grouping is nested under each build type
- Empty build types are not displayed (e.g., if no development builds exist)

#### Build Type Filter Tabs
Three global filter options at the top:
- **All Builds**: Shows both development and production builds
- **Production**: Shows only production/stable releases  
- **Development**: Shows only development/testing builds

Each filter button has an icon:
- 🔷 All Builds: `fa-layer-group`
- 🚀 Production: `fa-rocket`
- 💻 Development: `fa-code`

#### Build Type Headers
Within each application:
- **Production Header**: Green with rocket icon (🚀 Production)
- **Development Header**: Yellow with code icon (🔧 Development)
- Each header shows total build count for that type

#### Month Grouping
Builds are now grouped by month with:
- 📅 Month header (e.g., "January 2026")
- Build count badge showing number of builds in that month
- Most recent months displayed first

#### Build Type Badge
Each build card displays a badge showing its type:
- **Development**: Yellow badge with code icon (🔧)
- **Production**: Green badge with rocket icon (🚀)

### 3. Database Schema Update

#### AppUpdate Interface (TypeScript)
```typescript
export interface AppUpdate {
    $id: string;
    app_name: string;
    platform: 'android' | 'ios' | 'windows' | 'macos';
    version: string;
    version_code: number;
    build_number: number;
    build_type?: 'development' | 'production'; // NEW FIELD
    file_id: string;
    file_url: string;
    file_size: number;
    release_notes: string | null;
    is_mandatory: boolean;
    released_at: string;
    is_active: boolean;
}
```

**Note**: `build_type` is optional for backward compatibility. Existing builds without this field default to 'production'.

## Usage

### Uploading Builds

#### Production Build
```powershell
node D:\VarSysProjects\scripts\upload-apk-to-appwrite.js `
  ".\app-release.apk" `
  "Joint Journey Mobile" `
  "1.0.5" `
  5 `
  5 `
  "production" `
  "Bug fixes and performance improvements" `
  false
```

#### Development Build
```powershell
node D:\VarSysProjects\scripts\upload-apk-to-appwrite.js `
  ".\app-debug.apk" `
  "Joint Journey Mobile" `
  "1.0.6-dev" `
  6 `
  6 `
  "development" `
  "Testing new location tracking feature" `
  false
```

### Script Parameters
```
1. filePath      - Path to APK/EXE/MSI file
2. appName       - Application name (e.g., "Joint Journey Mobile")
3. version       - Version string (e.g., "1.0.1")
4. versionCode   - Version code number (e.g., 2)
5. buildNumber   - Build number (e.g., 2)
6. buildType     - "development" OR "production" (default: production)
7. releaseNotes  - Optional release notes
8. isMandatory   - Optional: "true" or "false" (default: false)
```

## Appwrite Database Setup

### Add build_type Attribute to Collection

To enable this feature, add the `build_type` attribute to the `app_updates` collection:

1. **Login to Appwrite Console**
   - URL: https://cloud.appwrite.io
   - Project: VarSys Store (695215eb000105cdf565)

2. **Navigate to Database**
   - Database: `varsys_store_db`
   - Collection: `app_updates`

3. **Add Attribute**
   - **Attribute Key**: `build_type`
   - **Type**: Enum
   - **Elements**: `development`, `production`
   - **Default**: `production`
   - **Required**: No (allows backward compatibility)
   - **Array**: No

4. **Create Indexes** (Optional - for performance)
   - Index Key: `build_type_index`
   - Type: Key
   - Attributes: `build_type`
   - Order: ASC

### Alternative: Using MCP Tools

If you have MCP Appwrite tools enabled:

```typescript
// Add enum column for build_type
mcp_appwrite-api_tables_db_create_enum_column({
  database_id: 'varsys_store_db',
  table_id: 'app_updates',
  key: 'build_type',
  elements: ['development', 'production'],
  default: 'production',
  required: false
})
```

## User Experience

### For End Users
1. Visit the store page
2. See **All Builds** by default
3. Click **Production** to see only stable releases
4. Builds organized by month (newest first)
5. Each build shows its type with a colored badge

### For Developers/Testers
1. Click **Development** filter
2. See only testing/debug builds
3. Identify development builds by yellow badge
4. Download appropriate build for testing

## Backward Compatibility

- Existing builds without `build_type` field default to **'production'**
- No need to update old database entries
- Store continues to work with legacy data
- Gradual migration possible (add build_type to new uploads only)

## Visual Design

### Color Scheme
- **Build Type Filter**: Indigo buttons (`bg-indigo-600`)
- **App Filter**: Purple buttons (`bg-purple-600`)
- **Development Badge**: Yellow (`bg-yellow-500/20 text-yellow-300`)
- **Production Badge**: Green (`bg-green-500/20 text-green-300`)

### Layout
```
┌─────────────────────────────────────────┐
│   🔷 All Builds  🚀 Production  💻 Dev  │  <- Build Type Filter
│   ○ All  ○ CookSuite  ○ TraQify ...    │  <- App Filter
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📅 December 2025            [3 builds]  │  <- Month Header
│  ┌───────┐ ┌───────┐ ┌───────┐          │
│  │ Card  │ │ Card  │ │ Card  │          │  <- Build Cards
│  └───────┘ └───────┘ └───────┘          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📅 November 2025            [2 builds]  │
│  ┌───────┐ ┌───────┐                    │
│  │ Card  │ │ Card  │                    │
│  └───────┘ └───────┘                    │
└─────────────────────────────────────────┘
```

### Build Card Badge
```
┌────────────────────────┐
│  🍽️  CookSuite      v1.0.5 │  <- Version badge
│                     [🚀 Prod] │  <- Build type badge
│  Master Your Kitchen...      │
└────────────────────────┘
```

## Files Modified

1. **src/types/index.ts**
   - Added `build_type` field to `AppUpdate` interface

2. **src/pages/StorePage.tsx**
   - Added `buildTypeFilter` state
   - Added `groupByMonth()` function
   - Updated `getFilteredUpdates()` to filter by build type
   - Added build type filter buttons
   - Added month headers with build counts
   - Added build type badges to cards

3. **scripts/upload-apk-to-appwrite.js**
   - Added `buildType` parameter to `uploadAPK()` function
   - Added `build_type` field to database document creation
   - Updated usage instructions and examples
   - Added buildType validation

## Testing Checklist

- [ ] Upload a production build
- [ ] Upload a development build
- [ ] Verify both appear in "All Builds" view
- [ ] Verify only production builds show in "Production" filter
- [ ] Verify only development builds show in "Development" filter
- [ ] Verify builds are grouped by month
- [ ] Verify most recent month appears first
- [ ] Verify build type badges display correctly (colors, icons)
- [ ] Verify month headers show correct build counts
- [ ] Test with existing builds (should default to production)
- [ ] Test app filters work with build type filters

## Future Enhancements

1. **Beta Channel**: Add 'beta' build type for beta testers
2. **Auto-Update Logic**: Different auto-update behavior for dev vs prod
3. **Version Comparison**: Show which version is newer across build types
4. **Download Analytics**: Track downloads by build type
5. **Expiration**: Auto-hide old development builds after X days
6. **Release Notes Filter**: Show only builds with release notes
7. **Search**: Search builds by version, notes, or date

## Troubleshooting

### Build type not showing
- Verify `build_type` attribute exists in Appwrite collection
- Check that enum values are exactly 'development' and 'production'
- Ensure upload script is using latest version

### Builds not grouping by month
- Check `released_at` field has valid ISO date strings
- Verify browser date formatting (may vary by locale)

### Filter not working
- Clear browser cache
- Check browser console for JavaScript errors
- Verify TypeScript compilation succeeded

## Support

For issues or questions:
- Check Appwrite Console for data structure
- Review browser console for errors
- Verify script output during upload
- Test with simplified data first
