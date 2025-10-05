import React, { useState, useEffect, useCallback } from 'react';
import { Upload, History, BarChart3, FileImage, Check, X } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

// Main App Component
export default function SafetySnapApp() {
  const [currentPage, setCurrentPage] = useState('upload');

  const pages = {
    upload: <UploadPage setPage={setCurrentPage} />,
    history: <HistoryPage />,
    analytics: <AnalyticsPage />
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <FileImage className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  SafetySnap
                </h1>
                <p className="text-xs text-gray-500">PPE Detection System</p>
              </div>
            </div>
            <nav className="flex space-x-2">
              <NavButton
                icon={Upload}
                label="Upload"
                active={currentPage === 'upload'}
                onClick={() => setCurrentPage('upload')}
              />
              <NavButton
                icon={History}
                label="History"
                active={currentPage === 'history'}
                onClick={() => setCurrentPage('history')}
              />
              <NavButton
                icon={BarChart3}
                label="Analytics"
                active={currentPage === 'analytics'}
                onClick={() => setCurrentPage('analytics')}
              />
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {pages[currentPage]}
      </main>
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
        active
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
          : 'bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="font-medium">{label}</span>
    </button>
  );
}

function UploadPage({ setPage }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/api/images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Image for PPE Detection</h2>

        {!result ? (
          <div className="space-y-6">
            {!preview ? (
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-400">PNG, JPG, JPEG (MAX. 10MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>
            ) : (
              <div className="space-y-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-96 object-contain rounded-xl bg-gray-100"
                />
                <div className="flex space-x-3">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                  >
                    {uploading ? 'Analyzing...' : 'Analyze PPE'}
                  </button>
                  <button
                    onClick={reset}
                    className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <X className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-900">Upload Failed</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <ResultView
            result={result}
            onReset={reset}
            onViewHistory={() => setPage('history')}
          />
        )}
      </div>
    </div>
  );
}

function ResultView({ result, onReset, onViewHistory }) {
  const isCompliant = result.label === 'compliant';

  return (
    <div className="space-y-6">
      <div
        className={`flex items-center justify-center space-x-3 p-6 rounded-xl ${
          isCompliant
            ? 'bg-green-50 border-2 border-green-200'
            : 'bg-red-50 border-2 border-red-200'
        }`}
      >
        {isCompliant ? (
          <Check className="w-8 h-8 text-green-600" />
        ) : (
          <X className="w-8 h-8 text-red-600" />
        )}
        <div>
          <h3 className={`text-2xl font-bold ${isCompliant ? 'text-green-900' : 'text-red-900'}`}>
            {isCompliant ? 'PPE Compliant' : 'Non-Compliant'}
          </h3>
          <p className={`text-sm ${isCompliant ? 'text-green-700' : 'text-red-700'}`}>
            {isCompliant
              ? 'Both helmet and vest detected'
              : 'Missing required PPE equipment'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Helmet</span>
            {result.detections.some(d => d.class === 'helmet') ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <X className="w-5 h-5 text-red-600" />
            )}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Safety Vest</span>
            {result.detections.some(d => d.class === 'vest') ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <X className="w-5 h-5 text-red-600" />
            )}
          </div>
        </div>
      </div>

      {result.detections.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Detected Objects</h4>
          <div className="space-y-2">
            {result.detections.map((det, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm bg-white rounded p-3"
              >
                <span className="font-medium capitalize">{det.class}</span>
                <span className="text-gray-600">
                  {(det.confidence * 100).toFixed(1)}% confidence
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={onViewHistory}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          View History
        </button>
        <button
          onClick={onReset}
          className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Upload Another
        </button>
      </div>
    </div>
  );
}

function HistoryPage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ label: '', from: '', to: '' });
  const [pagination, setPagination] = useState({ limit: 10, offset: 0, total: 0 });

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pagination.limit,
        offset: pagination.offset,
      });

      if (filters.label) params.append('label', filters.label);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);

      const response = await fetch(`${API_BASE}/api/images?${params}`);
      const data = await response.json();

      setImages(data.images);
      setPagination((prev) => ({ ...prev, total: data.total }));
    } catch (err) {
      console.error('Failed to fetch images:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset, filters.label, filters.from, filters.to]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this image?')) return;

    try {
      await fetch(`${API_BASE}/api/images/${id}`, { method: 'DELETE' });
      fetchImages();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
            <select
              value={filters.label}
              onChange={(e) => setFilters({ ...filters, label: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="compliant">Compliant</option>
              <option value="partial">Partial</option>
              <option value="non-compliant">Non-Compliant</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Upload History ({pagination.total} images)
        </h2>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : images.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No images found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((img) => (
              <ImageCard key={img.id} image={img} onDelete={handleDelete} />
            ))}
          </div>
        )}

        {pagination.total > pagination.limit && (
          <div className="flex justify-center items-center space-x-4 mt-6">
            <button
              onClick={() =>
                setPagination((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))
              }
              disabled={pagination.offset === 0}
              className="px-4 py-2 border rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              {pagination.offset + 1}-
              {Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
              {pagination.total}
            </span>
            <button
              onClick={() => setPagination((p) => ({ ...p, offset: p.offset + p.limit }))}
              disabled={pagination.offset + pagination.limit >= pagination.total}
              className="px-4 py-2 border rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ImageCard({ image, onDelete }) {
  const isCompliant = image.label === 'compliant';

  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="h-48 bg-gray-200 flex items-center justify-center">
        <FileImage className="w-16 h-16 text-gray-400" />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900 truncate">{image.filename}</span>
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              isCompliant ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {isCompliant ? 'Compliant' : 'Non-Compliant'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{new Date(image.uploaded_at).toLocaleDateString()}</span>
          <span>{image.detections.length} detections</span>
        </div>
        <button
          onClick={() => onDelete(image.id)}
          className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/analytics`);
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="text-center py-12 text-gray-500">No data available</div>;
  }

  const compliancePercentage = analytics.compliance_rate || 0;
  const helmetRate = analytics.compliant > 0 ? ((analytics.compliant / analytics.total_images) * 100).toFixed(1) : 0;
  const vestRate = analytics.compliant > 0 ? ((analytics.compliant / analytics.total_images) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Images"
          value={analytics.total_images}
          icon={FileImage}
          color="blue"
        />
        <StatCard
          title="Compliant"
          value={analytics.compliant}
          icon={Check}
          color="green"
        />
        <StatCard
          title="Non-Compliant"
          value={analytics.non_compliant}
          icon={X}
          color="red"
        />
        <StatCard
          title="Compliance Rate"
          value={`${compliancePercentage}%`}
          icon={BarChart3}
          color="indigo"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Compliance Overview</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Compliant</span>
                <span className="font-medium">{analytics.compliant}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${compliancePercentage}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Non-Compliant</span>
                <span className="font-medium">{analytics.non_compliant}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-red-500 h-3 rounded-full transition-all"
                  style={{ width: `${100 - compliancePercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Detection Rates</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Helmet Detection</span>
                <span className="font-medium">{helmetRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all"
                  style={{ width: `${helmetRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Vest Detection</span>
                <span className="font-medium">{vestRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-orange-500 h-3 rounded-full transition-all"
                  style={{ width: `${vestRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    indigo: 'bg-indigo-500',
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div
          className={`w-12 h-12 ${colorClasses[color]} rounded-lg flex items-center justify-center`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}