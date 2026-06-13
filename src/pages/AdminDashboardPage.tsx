import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Query, ID, Permission, Role } from 'appwrite';
import { useAuth } from '../context/AuthContext';
import { databases, storage, config } from '../lib/appwrite';
import type { AppUpdate } from '../types/index.js';
import { AppManagementTab } from '../components/AppManagementTab';

const APPS_COLLECTION_ID = 'apps';

interface AppData {
    app_name: string;
    display_name: string;
    icon: string;
    color: string;
    is_active: boolean;
}

export default function AdminDashboardPage() {
    const { user, logout, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [updates, setUpdates] = useState<AppUpdate[]>([]);
    const [_apps, setApps] = useState<AppData[]>([]);
    const [appNames, setAppNames] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'releases' | 'upload' | 'manage-apps'>('releases');
    const [previousVersion, setPreviousVersion] = useState<AppUpdate | null>(null);

    // Upload form state
    const [uploadForm, setUploadForm] = useState({
        appName: '',
        version: '',
        versionCode: '',
        buildNumber: '',
        buildType: 'production' as 'development' | 'production',
        releaseNotes: '',
        isMandatory: false
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/admin', { replace: true });
        }
    }, [user, authLoading, navigate]);

    // Prevent back navigation - push current state to history
    useEffect(() => {
        if (user) {
            // Replace entry and push a new one to prevent going back
            window.history.pushState(null, '', window.location.href);

            const handlePopState = () => {
                window.history.pushState(null, '', window.location.href);
            };

            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            loadApps();
            loadAllUpdates();
        }
    }, [user]);

    useEffect(() => {
        // Load previous version when app name changes
        if (uploadForm.appName) {
            loadPreviousVersion(uploadForm.appName);
        }
    }, [uploadForm.appName, updates]);

    async function loadApps() {
        try {
            const response = await databases.listDocuments(
                config.databaseId,
                APPS_COLLECTION_ID,
                [Query.equal('is_active', true), Query.orderAsc('app_name'), Query.limit(5000)]
            );
            const appsData = response.documents as unknown as AppData[];
            setApps(appsData);
            const names = appsData.map(app => app.app_name).sort();
            setAppNames(names);

            // Set default app name if not set
            if (names.length > 0 && !uploadForm.appName) {
                setUploadForm(prev => ({ ...prev, appName: names[0] }));
            }
        } catch (err) {
            console.error('Error loading apps:', err);
        }
    }

    async function loadPreviousVersion(appName: string) {
        try {
            const appUpdates = updates.filter(u => u.app_name === appName);
            if (appUpdates.length > 0) {
                // Get the latest version by version_code
                const latest = appUpdates.reduce((prev, current) =>
                    current.version_code > prev.version_code ? current : prev
                );
                setPreviousVersion(latest);
            } else {
                setPreviousVersion(null);
            }
        } catch (err) {
            console.error('Error loading previous version:', err);
            setPreviousVersion(null);
        }
    }

    async function loadAllUpdates() {
        try {
            const response = await databases.listDocuments(
                config.databaseId,
                config.collectionId,
                [
                    Query.orderDesc('released_at'),
                    Query.limit(5000)
                ]
            );
            setUpdates(response.documents as unknown as AppUpdate[]);
        } catch (err) {
            console.error('Error loading updates:', err);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedFile) {
            setUploadError('Please select a file to upload');
            return;
        }

        setIsUploading(true);
        setUploadError(null);
        setUploadSuccess(false);

        try {
            const ext = selectedFile.name.split('.').pop()?.toLowerCase();
            let platform = 'android';
            if (ext === 'exe' || ext === 'msi') platform = 'windows';
            else if (ext === 'dmg') platform = 'macos';
            else if (ext === 'ipa') platform = 'ios';

            const file = await storage.createFile(
                config.bucketId,
                ID.unique(),
                selectedFile,
                [
                    Permission.read(Role.any()),
                    Permission.update(Role.label('admin')),
                    Permission.delete(Role.label('admin'))
                ]
            );

            const fileUrl = `https://fra.cloud.appwrite.io/v1/storage/buckets/${config.bucketId}/files/${file.$id}/download?project=${config.projectId}&filename=${encodeURIComponent(selectedFile.name)}`;

            await databases.createDocument(
                config.databaseId,
                config.collectionId,
                ID.unique(),
                {
                    app_name: uploadForm.appName,
                    platform: platform,
                    version: uploadForm.version,
                    version_code: parseInt(uploadForm.versionCode),
                    build_number: parseInt(uploadForm.buildNumber),
                    build_type: uploadForm.buildType,
                    file_id: file.$id,
                    file_url: fileUrl,
                    file_size: selectedFile.size,
                    release_notes: uploadForm.releaseNotes || null,
                    is_mandatory: uploadForm.isMandatory,
                    released_at: new Date().toISOString(),
                    is_active: true,
                    user_id: user?.$id || '',
                    team_id: '',
                    team_name: '',
                    member: '',
                },
                [
                    Permission.read(Role.users()),
                    Permission.update(Role.label('admin')),
                    Permission.delete(Role.label('admin'))
                ]
            );

            setUploadSuccess(true);
            setUploadForm({
                appName: appNames[0] || '',
                version: '',
                versionCode: '',
                buildNumber: '',
                buildType: 'production',
                releaseNotes: '',
                isMandatory: false
            });
            setSelectedFile(null);
            loadAllUpdates();
            await loadApps(); // Reload apps in case new app was added
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to upload. Please try again.';
            setUploadError(errorMessage);
        } finally {
            setIsUploading(false);
        }
    }

    async function handleLogout() {
        await logout();
        navigate('/');
    }

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-purple-500/30 rounded-full"></div>
                    <div className="absolute inset-0 w-16 h-16 border-t-4 border-purple-500 rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-purple-600/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-blue-600/5 rounded-full blur-3xl"></div>
            </div>

            {/* Header */}
            <header className="relative border-b border-white/10 bg-black/30 backdrop-blur-2xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <Link to="/" className="text-purple-300 hover:text-white transition-colors flex items-center gap-2 text-sm sm:text-base">
                                <i className="fas fa-arrow-left"></i>
                                <span className="hidden sm:inline">Store</span>
                            </Link>
                            <div className="w-px h-6 bg-white/20 hidden sm:block"></div>
                            <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                <i className="fas fa-shield-alt text-purple-400"></i>
                                <span className="hidden sm:inline">Admin Dashboard (v1.1)</span>
                                <span className="sm:hidden">Dashboard (v1.1)</span>
                            </h1>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                            <span className="text-purple-300/70 text-xs sm:text-sm truncate max-w-[150px] sm:max-w-none">
                                <i className="fas fa-user mr-2"></i>
                                {user.email}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg sm:rounded-xl transition-colors text-xs sm:text-sm border border-red-500/20 flex items-center gap-2"
                            >
                                <i className="fas fa-sign-out-alt"></i>
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
                <div className="flex gap-2 sm:gap-3">
                    <button
                        onClick={() => setActiveTab('releases')}
                        className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base transition-all duration-300 flex items-center gap-2 ${activeTab === 'releases'
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                            : 'bg-white/5 text-purple-200 hover:bg-white/10 border border-white/10'
                            }`}
                    >
                        <i className="fas fa-list"></i>
                        <span className="hidden sm:inline">All Releases</span>
                        <span className="sm:hidden">Releases</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base transition-all duration-300 flex items-center gap-2 ${activeTab === 'upload'
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                            : 'bg-white/5 text-purple-200 hover:bg-white/10 border border-white/10'
                            }`}
                    >
                        <i className="fas fa-upload"></i>
                        <span className="hidden sm:inline">Upload New</span>
                        <span className="sm:hidden">Upload</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('manage-apps')}
                        className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base transition-all duration-300 flex items-center gap-2 ${activeTab === 'manage-apps'
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                            : 'bg-white/5 text-purple-200 hover:bg-white/10 border border-white/10'
                            }`}
                    >
                        <i className="fas fa-cog"></i>
                        <span className="hidden sm:inline">Manage Apps</span>
                        <span className="sm:hidden">Apps</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {activeTab === 'releases' ? (
                    <ReleasesTable updates={updates} isLoading={isLoading} />
                ) : activeTab === 'upload' ? (
                    <UploadForm
                        form={uploadForm}
                        setForm={setUploadForm}
                        selectedFile={selectedFile}
                        setSelectedFile={setSelectedFile}
                        isUploading={isUploading}
                        error={uploadError}
                        success={uploadSuccess}
                        onSubmit={handleUpload}
                        appNames={appNames}
                        previousVersion={previousVersion}
                    />
                ) : (
                    <AppManagementTab />
                )}
            </main>
        </div>
    );
}

interface ReleasesTableProps {
    updates: AppUpdate[];
    isLoading: boolean;
}

function ReleasesTable({ updates, isLoading }: ReleasesTableProps) {
    if (isLoading) {
        return (
            <div className="text-center py-12 sm:py-16">
                <div className="relative inline-block">
                    <div className="w-12 h-12 border-4 border-purple-500/30 rounded-full"></div>
                    <div className="absolute inset-0 w-12 h-12 border-t-4 border-purple-500 rounded-full animate-spin"></div>
                </div>
                <p className="text-purple-200 mt-4 text-sm sm:text-base">Loading releases...</p>
            </div>
        );
    }

    if (updates.length === 0) {
        return (
            <div className="bg-white/5 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center border border-white/10 backdrop-blur-xl">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <i className="fas fa-inbox text-3xl sm:text-4xl text-purple-400"></i>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">No Releases Found</h3>
                <p className="text-purple-200/70 text-sm sm:text-base">Upload your first release to get started.</p>
            </div>
        );
    }

    return (
        <div className="bg-white/5 rounded-2xl sm:rounded-3xl border border-white/10 backdrop-blur-xl overflow-hidden">
            {/* Mobile Cards */}
            <div className="block lg:hidden divide-y divide-white/5">
                {updates.map((update) => (
                    <div key={update.$id} className="p-4 sm:p-5">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="text-white font-semibold text-sm sm:text-base">{update.app_name}</h3>
                                <p className="text-purple-300 text-xs sm:text-sm">v{update.version} ({update.version_code})</p>
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full ${update.is_active
                                ? 'bg-green-500/20 text-green-300 border border-green-500/20'
                                : 'bg-gray-500/20 text-gray-300 border border-gray-500/20'
                                }`}>
                                {update.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                            <div><i className="fas fa-desktop mr-2"></i>{update.platform}</div>
                            <div><i className="fas fa-file mr-2"></i>{(update.file_size / 1024 / 1024).toFixed(2)} MB</div>
                            <div><i className="fas fa-calendar mr-2"></i>{new Date(update.released_at).toLocaleDateString()}</div>
                            <div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${(update.build_type || 'production') === 'development'
                                    ? 'bg-yellow-500/20 text-yellow-300'
                                    : 'bg-green-500/20 text-green-300'
                                    }`}>
                                    {(update.build_type || 'production') === 'development' ? '🔧 Dev' : '🚀 Prod'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-white/5">
                        <tr className="text-left text-purple-300 text-sm">
                            <th className="px-6 py-4 font-semibold">App Name</th>
                            <th className="px-6 py-4 font-semibold">Version</th>
                            <th className="px-6 py-4 font-semibold">Build Type</th>
                            <th className="px-6 py-4 font-semibold">Platform</th>
                            <th className="px-6 py-4 font-semibold">Size</th>
                            <th className="px-6 py-4 font-semibold">Released</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {updates.map((update) => (
                            <tr key={update.$id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 text-white font-medium">{update.app_name}</td>
                                <td className="px-6 py-4">
                                    <span className="text-purple-300">v{update.version}</span>
                                    <span className="text-gray-500 text-sm ml-2">({update.version_code})</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs px-2.5 py-1 rounded-full ${(update.build_type || 'production') === 'development'
                                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                        : 'bg-green-500/20 text-green-300 border border-green-500/30'
                                        }`}>
                                        {(update.build_type || 'production') === 'development' ? '🔧 Development' : '🚀 Production'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-300 capitalize">{update.platform}</td>
                                <td className="px-6 py-4 text-gray-300">{(update.file_size / 1024 / 1024).toFixed(2)} MB</td>
                                <td className="px-6 py-4 text-gray-400 text-sm">{new Date(update.released_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs px-3 py-1.5 rounded-full ${update.is_active
                                        ? 'bg-green-500/20 text-green-300 border border-green-500/20'
                                        : 'bg-gray-500/20 text-gray-300 border border-gray-500/20'
                                        }`}>
                                        {update.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

interface UploadFormData {
    appName: string;
    version: string;
    versionCode: string;
    buildNumber: string;
    buildType: 'development' | 'production';
    releaseNotes: string;
    isMandatory: boolean;
}

interface UploadFormProps {
    form: UploadFormData;
    setForm: React.Dispatch<React.SetStateAction<UploadFormData>>;
    selectedFile: File | null;
    setSelectedFile: React.Dispatch<React.SetStateAction<File | null>>;
    isUploading: boolean;
    error: string | null;
    success: boolean;
    onSubmit: (e: React.FormEvent) => void;
    appNames: string[];
    previousVersion: AppUpdate | null;
}

function UploadForm({
    form,
    setForm,
    selectedFile,
    setSelectedFile,
    isUploading,
    error,
    success,
    onSubmit,
    appNames,
    previousVersion
}: UploadFormProps) {
    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white/5 rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/10 backdrop-blur-xl">
                {/* Header */}
                <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl sm:rounded-2xl flex items-center justify-center">
                        <i className="fas fa-rocket text-xl sm:text-2xl text-white"></i>
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">Release New Version</h2>
                        <p className="text-purple-300/70 text-sm">Upload and publish a new app version</p>
                    </div>
                </div>

                {/* Previous Version Info */}
                {previousVersion && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl sm:rounded-2xl p-4 mb-5 sm:mb-6">
                        <div className="flex items-start gap-3">
                            <i className="fas fa-info-circle text-blue-400 mt-0.5"></i>
                            <div className="flex-1">
                                <p className="text-blue-200 font-medium text-sm mb-2">Current Latest Version</p>
                                <div className="grid grid-cols-3 gap-3 text-xs">
                                    <div>
                                        <span className="text-blue-300/70 block mb-1">Version</span>
                                        <span className="text-white font-semibold">{previousVersion.version}</span>
                                    </div>
                                    <div>
                                        <span className="text-blue-300/70 block mb-1">Version Code</span>
                                        <span className="text-white font-semibold">{previousVersion.version_code}</span>
                                    </div>
                                    <div>
                                        <span className="text-blue-300/70 block mb-1">Build Number</span>
                                        <span className="text-white font-semibold">{previousVersion.build_number}</span>
                                    </div>
                                </div>
                                <p className="text-blue-300/70 text-xs mt-2">
                                    💡 Bump version code to {previousVersion.version_code + 1} for the new release
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Messages */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-5 sm:mb-6 flex items-start gap-3">
                        <i className="fas fa-exclamation-circle text-red-400 mt-0.5"></i>
                        <p className="text-red-200 text-sm">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-5 sm:mb-6 flex items-start gap-3">
                        <i className="fas fa-check-circle text-green-400 mt-0.5"></i>
                        <p className="text-green-200 text-sm">Release uploaded successfully!</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
                    {/* App Name */}
                    <div>
                        <label className="block text-sm font-medium text-purple-200 mb-2">Application</label>
                        <div className="relative">
                            <select
                                value={form.appName}
                                onChange={(e) => setForm({ ...form, appName: e.target.value })}
                                className="w-full px-4 py-3 sm:py-3.5 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 appearance-none text-sm sm:text-base"
                            >
                                {appNames.map((name) => (
                                    <option key={name} value={name} className="bg-slate-900">{name}</option>
                                ))}
                            </select>
                            <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none"></i>
                        </div>
                    </div>

                    {/* Build Type */}
                    <div>
                        <label className="block text-sm font-medium text-purple-200 mb-2">Build Type</label>
                        <div className="relative">
                            <select
                                value={form.buildType}
                                onChange={(e) => setForm({ ...form, buildType: e.target.value as 'development' | 'production' })}
                                className="w-full px-4 py-3 sm:py-3.5 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 appearance-none text-sm sm:text-base"
                            >
                                <option value="production" className="bg-slate-900">🚀 Production (Stable Release)</option>
                                <option value="development" className="bg-slate-900">🔧 Development (Testing Build)</option>
                            </select>
                            <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none"></i>
                        </div>
                    </div>

                    {/* Version Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                            <label className="block text-sm font-medium text-purple-200 mb-2">Version</label>
                            <input
                                type="text"
                                value={form.version}
                                onChange={(e) => setForm({ ...form, version: e.target.value })}
                                required
                                placeholder="1.0.0"
                                className="w-full px-4 py-3 sm:py-3.5 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm sm:text-base"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-purple-200 mb-2">Version Code</label>
                            <input
                                type="number"
                                value={form.versionCode}
                                onChange={(e) => setForm({ ...form, versionCode: e.target.value })}
                                required
                                placeholder="1"
                                className="w-full px-4 py-3 sm:py-3.5 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm sm:text-base"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-purple-200 mb-2">Build Number</label>
                            <input
                                type="number"
                                value={form.buildNumber}
                                onChange={(e) => setForm({ ...form, buildNumber: e.target.value })}
                                required
                                placeholder="1"
                                className="w-full px-4 py-3 sm:py-3.5 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm sm:text-base"
                            />
                        </div>
                    </div>

                    {/* Release Notes */}
                    <div>
                        <label className="block text-sm font-medium text-purple-200 mb-2">Release Notes</label>
                        <textarea
                            value={form.releaseNotes}
                            onChange={(e) => setForm({ ...form, releaseNotes: e.target.value })}
                            rows={3}
                            placeholder="Bug fixes, new features, improvements..."
                            className="w-full px-4 py-3 sm:py-3.5 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 resize-none text-sm sm:text-base"
                        />
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-purple-200 mb-2">Application File</label>
                        <input
                            type="file"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            accept=".apk,.exe,.msi,.dmg,.ipa"
                            className="hidden"
                            id="file-upload"
                        />
                        <label
                            htmlFor="file-upload"
                            className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full px-4 py-6 sm:py-8 bg-white/5 border-2 border-dashed border-white/20 rounded-xl sm:rounded-2xl text-purple-200 hover:border-purple-500 hover:bg-white/5 cursor-pointer transition-all"
                        >
                            {selectedFile ? (
                                <>
                                    <i className="fas fa-file text-2xl text-purple-400"></i>
                                    <div className="text-center sm:text-left">
                                        <p className="text-white font-medium text-sm sm:text-base">{selectedFile.name}</p>
                                        <p className="text-gray-400 text-xs sm:text-sm">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-cloud-upload-alt text-2xl sm:text-3xl"></i>
                                    <div className="text-center">
                                        <p className="text-sm sm:text-base">Click to select file</p>
                                        <p className="text-gray-400 text-xs">APK, EXE, MSI, DMG, or IPA</p>
                                    </div>
                                </>
                            )}
                        </label>
                    </div>

                    {/* Mandatory Checkbox */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="mandatory"
                            checked={form.isMandatory}
                            onChange={(e) => setForm({ ...form, isMandatory: e.target.checked })}
                            className="w-5 h-5 rounded bg-white/10 border-white/20 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                        />
                        <label htmlFor="mandatory" className="text-purple-200 text-sm sm:text-base">
                            Make this update mandatory
                        </label>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isUploading}
                        className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl sm:rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
                    >
                        {isUploading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <i className="fas fa-rocket"></i>
                                <span>Release Version</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
