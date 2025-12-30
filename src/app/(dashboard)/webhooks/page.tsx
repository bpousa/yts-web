'use client'

import { useState, useEffect } from 'react'
import {
  Webhook,
  Plus,
  Trash2,
  Edit2,
  PlayCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ExternalLink,
  Clock,
  AlertCircle,
} from 'lucide-react'

interface WebhookConfig {
  id: string
  name: string
  description?: string
  endpointUrl: string
  httpMethod: 'POST' | 'PUT' | 'PATCH'
  authType: 'none' | 'bearer' | 'api_key' | 'basic' | 'custom_header'
  enabled: boolean
  retryCount: number
  timeoutMs: number
  createdAt: string
}

interface WebhookLog {
  id: string
  webhookId: string
  contentId: string
  status: 'success' | 'failed' | 'pending'
  statusCode?: number
  errorMessage?: string
  executedAt: string
  durationMs?: number
}

const webhookTemplates = [
  { id: 'wordpress', name: 'WordPress REST API', description: 'Post content to WordPress as a draft' },
  { id: 'zapier', name: 'Zapier Webhook', description: 'Send content to Zapier for automation' },
  { id: 'make', name: 'Make (Integromat)', description: 'Send content to Make scenarios' },
  { id: 'n8n', name: 'N8N Webhook', description: 'Send content to N8N workflows' },
  { id: 'notion', name: 'Notion API', description: 'Create pages in Notion database' },
  { id: 'custom', name: 'Custom JSON', description: 'Fully customizable webhook' },
]

const authTypes = [
  { id: 'none', label: 'None' },
  { id: 'bearer', label: 'Bearer Token' },
  { id: 'api_key', label: 'API Key' },
  { id: 'basic', label: 'Basic Auth' },
  { id: 'custom_header', label: 'Custom Header' },
]

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [loadingWebhooks, setLoadingWebhooks] = useState(true)
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null)
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    endpointUrl: '',
    httpMethod: 'POST' as 'POST' | 'PUT' | 'PATCH',
    authType: 'none' as 'none' | 'bearer' | 'api_key' | 'basic' | 'custom_header',
    authToken: '',
    authApiKey: '',
    authHeaderName: '',
    authHeaderValue: '',
    authUsername: '',
    authPassword: '',
    enabled: true,
    retryCount: 3,
    timeoutMs: 30000,
  })

  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const fetchWebhooks = async () => {
    try {
      const response = await fetch('/api/webhooks')
      const data = await response.json()
      setWebhooks(data.webhooks || [])
    } catch (err) {
      console.error('Failed to fetch webhooks:', err)
    } finally {
      setLoadingWebhooks(false)
    }
  }

  const fetchLogs = async (webhookId: string) => {
    setLoadingLogs(true)
    try {
      const response = await fetch(`/api/webhooks/${webhookId}`)
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleSelectWebhook = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook)
    fetchLogs(webhook.id)
  }

  const handleTemplateSelect = (templateId: string) => {
    // Pre-fill form based on template
    const templateDefaults: Record<string, Partial<typeof formData>> = {
      wordpress: {
        name: 'WordPress Post',
        description: 'Post content to WordPress as a draft',
        httpMethod: 'POST',
        authType: 'bearer',
      },
      zapier: {
        name: 'Zapier Webhook',
        description: 'Send content to Zapier',
        httpMethod: 'POST',
        authType: 'none',
      },
      make: {
        name: 'Make Webhook',
        description: 'Send content to Make scenarios',
        httpMethod: 'POST',
        authType: 'none',
      },
      n8n: {
        name: 'N8N Webhook',
        description: 'Send content to N8N workflows',
        httpMethod: 'POST',
        authType: 'none',
      },
      notion: {
        name: 'Notion Page',
        description: 'Create pages in Notion',
        httpMethod: 'POST',
        authType: 'bearer',
      },
      custom: {
        name: 'Custom Webhook',
        description: '',
        httpMethod: 'POST',
        authType: 'none',
      },
    }

    const defaults = templateDefaults[templateId] || {}
    setFormData((prev) => ({ ...prev, ...defaults }))
    setShowForm(true)
  }

  const handleEdit = (webhook: WebhookConfig) => {
    setEditingId(webhook.id)
    setFormData({
      name: webhook.name,
      description: webhook.description || '',
      endpointUrl: webhook.endpointUrl,
      httpMethod: webhook.httpMethod,
      authType: webhook.authType,
      authToken: '',
      authApiKey: '',
      authHeaderName: '',
      authHeaderValue: '',
      authUsername: '',
      authPassword: '',
      enabled: webhook.enabled,
      retryCount: webhook.retryCount,
      timeoutMs: webhook.timeoutMs,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.endpointUrl) {
      setError('Name and endpoint URL are required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const authConfig: Record<string, string> = {}
      if (formData.authType === 'bearer') authConfig.token = formData.authToken
      if (formData.authType === 'api_key') {
        authConfig.headerName = formData.authHeaderName
        authConfig.apiKey = formData.authApiKey
      }
      if (formData.authType === 'basic') {
        authConfig.username = formData.authUsername
        authConfig.password = formData.authPassword
      }
      if (formData.authType === 'custom_header') {
        authConfig.headerName = formData.authHeaderName
        authConfig.headerValue = formData.authHeaderValue
      }

      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        endpointUrl: formData.endpointUrl,
        httpMethod: formData.httpMethod,
        authType: formData.authType,
        authConfig,
        enabled: formData.enabled,
        retryCount: formData.retryCount,
        timeoutMs: formData.timeoutMs,
        payloadTemplate: {},
        fieldMappings: {
          content: 'content',
          title: 'title',
          format: 'format',
        },
      }

      const url = editingId ? `/api/webhooks/${editingId}` : '/api/webhooks'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save webhook')
      }

      await fetchWebhooks()
      setShowForm(false)
      setEditingId(null)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete webhook')
      }

      setWebhooks((prev) => prev.filter((w) => w.id !== id))
      if (selectedWebhook?.id === id) {
        setSelectedWebhook(null)
        setLogs([])
      }
    } catch (err) {
      console.error('Failed to delete webhook:', err)
    }
  }

  const handleTest = async (id: string) => {
    setTesting(id)
    setTestResult(null)

    try {
      const response = await fetch(`/api/webhooks/${id}/test`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setTestResult({ success: true, message: `Success! Status: ${data.statusCode}` })
      } else {
        setTestResult({ success: false, message: data.error || 'Test failed' })
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Test request failed' })
    } finally {
      setTesting(null)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      endpointUrl: '',
      httpMethod: 'POST',
      authType: 'none',
      authToken: '',
      authApiKey: '',
      authHeaderName: '',
      authHeaderValue: '',
      authUsername: '',
      authPassword: '',
      enabled: true,
      retryCount: 3,
      timeoutMs: 30000,
    })
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Webhooks
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure webhooks to automatically send generated content to external services.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Webhook List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Your Webhooks
              </h2>
              <button
                onClick={() => {
                  resetForm()
                  setEditingId(null)
                  setShowForm(true)
                }}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {loadingWebhooks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : webhooks.length === 0 ? (
              <div className="text-center py-8">
                <Webhook className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  No webhooks configured yet
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedWebhook?.id === webhook.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
                    }`}
                    onClick={() => handleSelectWebhook(webhook)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            webhook.enabled ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {webhook.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {webhook.httpMethod}
                      </span>
                    </div>
                    {webhook.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                        {webhook.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Templates */}
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Quick Start Templates
            </h3>
            <div className="space-y-2">
              {webhookTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className="w-full text-left p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {template.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {template.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2">
          {showForm ? (
            // Webhook Form
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingId ? 'Edit Webhook' : 'Create Webhook'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                    resetForm()
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      HTTP Method
                    </label>
                    <select
                      value={formData.httpMethod}
                      onChange={(e) => setFormData((p) => ({ ...p, httpMethod: e.target.value as 'POST' | 'PUT' | 'PATCH' }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Endpoint URL *
                  </label>
                  <input
                    type="url"
                    value={formData.endpointUrl}
                    onChange={(e) => setFormData((p) => ({ ...p, endpointUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Authentication
                  </label>
                  <select
                    value={formData.authType}
                    onChange={(e) => setFormData((p) => ({ ...p, authType: e.target.value as typeof formData.authType }))}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    {authTypes.map((at) => (
                      <option key={at.id} value={at.id}>
                        {at.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.authType === 'bearer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bearer Token
                    </label>
                    <input
                      type="password"
                      value={formData.authToken}
                      onChange={(e) => setFormData((p) => ({ ...p, authToken: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                )}

                {formData.authType === 'api_key' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Header Name
                      </label>
                      <input
                        type="text"
                        value={formData.authHeaderName}
                        onChange={(e) => setFormData((p) => ({ ...p, authHeaderName: e.target.value }))}
                        placeholder="X-API-Key"
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={formData.authApiKey}
                        onChange={(e) => setFormData((p) => ({ ...p, authApiKey: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {formData.authType === 'basic' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={formData.authUsername}
                        onChange={(e) => setFormData((p) => ({ ...p, authUsername: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={formData.authPassword}
                        onChange={(e) => setFormData((p) => ({ ...p, authPassword: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {formData.authType === 'custom_header' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Header Name
                      </label>
                      <input
                        type="text"
                        value={formData.authHeaderName}
                        onChange={(e) => setFormData((p) => ({ ...p, authHeaderName: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Header Value
                      </label>
                      <input
                        type="text"
                        value={formData.authHeaderValue}
                        onChange={(e) => setFormData((p) => ({ ...p, authHeaderValue: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Retry Count
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={formData.retryCount}
                      onChange={(e) => setFormData((p) => ({ ...p, retryCount: parseInt(e.target.value) }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Timeout (ms)
                    </label>
                    <input
                      type="number"
                      min={1000}
                      max={60000}
                      step={1000}
                      value={formData.timeoutMs}
                      onChange={(e) => setFormData((p) => ({ ...p, timeoutMs: parseInt(e.target.value) }))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData((p) => ({ ...p, enabled: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Enable webhook
                  </span>
                </label>

                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Webhook'
                  )}
                </button>
              </div>
            </div>
          ) : selectedWebhook ? (
            // Webhook Details
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedWebhook.name}
                      </h2>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          selectedWebhook.enabled
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {selectedWebhook.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    {selectedWebhook.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {selectedWebhook.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTest(selectedWebhook.id)}
                      disabled={testing === selectedWebhook.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-lg transition-colors"
                    >
                      {testing === selectedWebhook.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <PlayCircle className="w-4 h-4" />
                      )}
                      Test
                    </button>
                    <button
                      onClick={() => handleEdit(selectedWebhook)}
                      className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(selectedWebhook.id)}
                      className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-lg mb-4 flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm">{testResult.message}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Endpoint:</span>
                    <p className="font-mono text-gray-900 dark:text-white text-xs mt-1 break-all">
                      {selectedWebhook.endpointUrl}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Method:</span>
                    <p className="font-medium text-gray-900 dark:text-white mt-1">
                      {selectedWebhook.httpMethod}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Auth Type:</span>
                    <p className="font-medium text-gray-900 dark:text-white mt-1 capitalize">
                      {selectedWebhook.authType.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Timeout:</span>
                    <p className="font-medium text-gray-900 dark:text-white mt-1">
                      {selectedWebhook.timeoutMs / 1000}s (retry: {selectedWebhook.retryCount}x)
                    </p>
                  </div>
                </div>
              </div>

              {/* Execution Logs */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Execution History
                </h3>

                {loadingLogs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : logs.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    No executions yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {log.status === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : log.status === 'failed' ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <Clock className="w-5 h-5 text-yellow-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {log.status === 'success'
                                ? `HTTP ${log.statusCode}`
                                : log.errorMessage || 'Failed'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(log.executedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {log.durationMs && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {log.durationMs}ms
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Empty State
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Webhook className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  No webhook selected
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Select a webhook from the list or create a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
