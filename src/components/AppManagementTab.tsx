import { useState, useEffect } from 'react';
import { Query } from 'appwrite';
import { databases, config } from '../lib/appwrite';

const APPS_COLLECTION_ID = 'apps';

interface AppData {
    $id: string;
    app_name: string;
    display_name: string;
    icon: string;
    color: string;
    description: string;
    tagline: string;
    platform_category: 'mobile' | 'desktop' | 'web';
    is_active: boolean;
    created_at: string;
}

interface AppFormData {
    app_name: string;
    display_name: string;
    icon: string;
    color: string;
    description: string;
    tagline: string;
    platform_category: 'mobile' | 'desktop' | 'web';
}

const EMPTY_FORM: AppFormData = {
    app_name: '',
    display_name: '',
    icon: 'fa-mobile-alt',
    color: 'blue',
    description: '',
    tagline: '',
    platform_category: 'mobile'
};

const COLOR_OPTIONS = [
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
    { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
    { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
    { value: 'red', label: 'Red', class: 'bg-red-500' },
];

const ICON_OPTIONS = [
    'fa-mobile-alt', 'fa-desktop', 'fa-globe', 'fa-handshake', 'fa-utensils',
    'fa-chart-line', 'fa-chart-bar', 'fa-bolt', 'fa-file-archive',
    'fa-calendar', 'fa-tasks', 'fa-shopping-cart', 'fa-warehouse'
];

export function AppManagementTab() {
    const [apps, setApps] = useState<AppData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editingApp, setEditingApp] = useState<AppData | null>(null);
    const [formData, setFormData] = useState<AppFormData>(EMPTY_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadApps();
    }, []);

    async function loadApps() {
        try {
            setIsLoading(true);
            const response = await databases.listDocuments(
                config.databaseId,
                APPS_COLLECTION_ID,
                [Query.orderAsc('app_name'), Query.limit(5000)]
            );
            setApps(response.documents as unknown as AppData[]);
        } catch (err: any) {
            setError('Failed to load apps: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    }

    async function toggleAppActive(app: AppData) {
        try {
            await databases.updateDocument(
                config.databaseId,
                APPS_COLLECTION_ID,
                app.$id,
                {
                    is_active: !app.is_active,
                    user_id: '',
                    team_id: '',
                    team_name: '',
                    member: '',
                }
            );
            await loadApps();
            setSuccess(`${app.app_name} ${!app.is_active ? 'enabled' : 'disabled'}`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError('Failed to toggle app: ' + err.message);
        }
    }

    async function deleteApp(app: AppData) {
        if (!confirm(`Delete "${app.app_name}"? This action cannot be undone.`)) return;

        try {
            await databases.deleteDocument(
                config.databaseId,
                APPS_COLLECTION_ID,
                app.$id
            );
            await loadApps();
            setSuccess(`Deleted ${app.app_name}`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError('Failed to delete app: ' + err.message);
        }
    }

    function openAddForm() {
        setEditingApp(null);
        setFormData(EMPTY_FORM);
        setShowForm(true);
        setError(null);
    }

    function openEditForm(app: AppData) {
        setEditingApp(app);
        setFormData({
            app_name: app.app_name,
            display_name: app.display_name || app.app_name,
            icon: app.icon,
            color: app.color,
            description: app.description,
            tagline: app.tagline,
            platform_category: app.platform_category
        });
        setShowForm(true);
        setError(null);
    }

    function closeForm() {
        setShowForm(false);
        setEditingApp(null);
        setFormData(EMPTY_FORM);
        setError(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            if (editingApp) {
                // Update existing app
                await databases.updateDocument(
                    config.databaseId,
                    APPS_COLLECTION_ID,
                    editingApp.$id,
                    {
                        ...formData,
                        user_id: '',
                        team_id: '',
                        team_name: '',
                        member: '',
                    }
                );
                setSuccess(`Updated ${formData.app_name}`);
            } else {
                // Create new app
                await databases.createDocument(
                    config.databaseId,
                    APPS_COLLECTION_ID,
                    'unique()',
                    {
                        ...formData,
                        is_active: true,
                        created_at: new Date().toISOString(),
                        user_id: '',
                        team_id: '',
                        team_name: '',
                        member: '',
                    }
                );
                setSuccess(`Created ${formData.app_name}`);
            }

            await loadApps();
            closeForm();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-purple-300">
                    <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin"></div>
                    <span className="text-lg">Loading apps...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">App Management</h2>
                    <p className="text-purple-300/70 text-sm mt-1">
                        Control which apps appear in the store and manage their details
                    </p>
                </div>
                <button
                    onClick={openAddForm}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all duration-300 flex items-center gap-2"
                >
                    <i className="fas fa-plus"></i>
                    <span>Add App</span>
                </button>
            </div>

            {/* Messages */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
                    <i className="fas fa-exclamation-circle text-red-400 mt-0.5"></i>
                    <p className="text-red-200 text-sm">{error}</p>
                </div>
            )}

            {success && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 flex items-start gap-3">
                    <i className="fas fa-check-circle text-green-400 mt-0.5"></i>
                    <p className="text-green-200 text-sm">{success}</p>
                </div>
            )}

            {/* Apps Grid */}
            {apps.length === 0 ? (
                <div className="text-center py-16">
                    <i className="fas fa-inbox text-5xl text-purple-500/30 mb-4"></i>
                    <h3 className="text-xl font-bold text-white mb-2">No Apps Yet</h3>
                    <p className="text-purple-200/70 text-sm mb-6">Add your first app to get started</p>
                    <button
                        onClick={openAddForm}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all"
                    >
                        <i className="fas fa-plus mr-2"></i>
                        Add First App
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {apps.map((app) => (
                        <div
                            key={app.$id}
                            className={`bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl p-5 hover:border-white/20 transition-all ${
                                !app.is_active ? 'opacity-50' : ''
                            }`}
                        >
                            {/* App Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className={`w-12 h-12 bg-${app.color}-500/20 rounded-xl flex items-center justify-center`}>
                                    <i className={`fas ${app.icon} text-xl text-${app.color}-400`}></i>
                                </div>
                                <span className={`text-xs px-2.5 py-1 rounded-full ${
                                    app.is_active
                                        ? 'bg-green-500/20 text-green-300 border border-green-500/20'
                                        : 'bg-gray-500/20 text-gray-300 border border-gray-500/20'
                                }`}>
                                    {app.is_active ? '✓ Active' : '✕ Disabled'}
                                </span>
                            </div>

                            {/* App Info */}
                            <h3 className="text-white font-semibold mb-1">{app.display_name || app.app_name}</h3>
                            <p className="text-purple-300/70 text-xs mb-1">{app.app_name}</p>
                            <p className="text-gray-400 text-sm mb-3">{app.tagline}</p>

                            {/* Platform Badge */}
                            <div className="mb-4">
                                <span className="text-xs px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-purple-300">
                                    <i className={`fas fa-${app.platform_category === 'mobile' ? 'mobile-alt' : app.platform_category === 'desktop' ? 'desktop' : 'globe'} mr-1.5`}></i>
                                    {app.platform_category}
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => openEditForm(app)}
                                    className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-purple-300 text-sm transition-all"
                                >
                                    <i className="fas fa-edit mr-1.5"></i>
                                    Edit
                                </button>
                                <button
                                    onClick={() => toggleAppActive(app)}
                                    className={`flex-1 px-3 py-2 border rounded-lg text-sm transition-all ${
                                        app.is_active
                                            ? 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30 text-yellow-300'
                                            : 'bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-300'
                                    }`}
                                >
                                    <i className={`fas fa-${app.is_active ? 'eye-slash' : 'eye'} mr-1.5`}></i>
                                    {app.is_active ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                    onClick={() => deleteApp(app)}
                                    className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm transition-all"
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 rounded-3xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Form Header */}
                        <div className="sticky top-0 bg-slate-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">
                                {editingApp ? 'Edit App' : 'Add New App'}
                            </h3>
                            <button
                                onClick={closeForm}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        {/* Form Content */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* App Name */}
                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">
                                    App Name (Unique) *
                                </label>
                                <input
                                    type="text"
                                    value={formData.app_name}
                                    onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                                    required
                                    disabled={!!editingApp} // Can't change app_name after creation
                                    placeholder="TraQify Mobile"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                {editingApp && (
                                    <p className="text-xs text-gray-400 mt-1">App name cannot be changed after creation</p>
                                )}
                            </div>

                            {/* Display Name */}
                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">
                                    Display Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.display_name}
                                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                    placeholder="Leave blank to use app name"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                                />
                            </div>

                            {/* Icon & Color */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-purple-200 mb-2">
                                        Icon *
                                    </label>
                                    <select
                                        value={formData.icon}
                                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 appearance-none"
                                    >
                                        {ICON_OPTIONS.map((icon) => (
                                            <option key={icon} value={icon} className="bg-slate-900">
                                                {icon.replace('fa-', '').replace(/-/g, ' ')}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                                        <i className={`fas ${formData.icon}`}></i>
                                        Preview
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-purple-200 mb-2">
                                        Color *
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {COLOR_OPTIONS.map((color) => (
                                            <button
                                                key={color.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, color: color.value })}
                                                className={`w-full h-10 ${color.class} rounded-lg border-2 ${
                                                    formData.color === color.value
                                                        ? 'border-white ring-2 ring-white/30'
                                                        : 'border-white/20'
                                                } transition-all hover:scale-105`}
                                                title={color.label}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Platform Category */}
                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">
                                    Platform *
                                </label>
                                <select
                                    value={formData.platform_category}
                                    onChange={(e) => setFormData({ ...formData, platform_category: e.target.value as any })}
                                    required
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 appearance-none"
                                >
                                    <option value="mobile" className="bg-slate-900">📱 Mobile</option>
                                    <option value="desktop" className="bg-slate-900">🖥️ Desktop</option>
                                    <option value="web" className="bg-slate-900">🌐 Web</option>
                                </select>
                            </div>

                            {/* Tagline */}
                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">
                                    Tagline *
                                </label>
                                <input
                                    type="text"
                                    value={formData.tagline}
                                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                    required
                                    placeholder="Track, Analyze, Optimize Your Life"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-2">
                                    Description *
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    required
                                    rows={3}
                                    placeholder="A comprehensive tool for..."
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 resize-none"
                                />
                            </div>

                            {/* Form Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-save"></i>
                                            <span>{editingApp ? 'Update App' : 'Create App'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
