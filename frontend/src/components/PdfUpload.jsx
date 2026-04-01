import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faFile, faTrash } from '@fortawesome/free-solid-svg-icons'
import { api } from '../utils/api'

export default function PdfUpload() {
  const [pdfs, setPdfs] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchPdfs()
  }, [])

  const fetchPdfs = async () => {
    try {
      const response = await api.get('/pdfs/list')
      setPdfs(response.data.pdfs || [])
    } catch (error) {
      console.error('Error fetching PDFs:', error)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setLoading(true)
    try {
      await api.post('/pdfs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMessage('✅ PDF uploaded successfully!')
      fetchPdfs()
    } catch (error) {
      setMessage('❌ Upload failed: ' + error.response?.data?.error)
    } finally {
      setLoading(false)
    }
  }

  const handleProcess = async (filename) => {
    try {
      await api.post(`/pdfs/process/${filename}`)
      setMessage('✅ PDF processed!')
    } catch (error) {
      setMessage('❌ Processing failed')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-card p-8">
      <h2 className="text-2xl font-bold mb-6">📄 PDF Management</h2>

      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-8">
        <FontAwesomeIcon icon={faUpload} className="text-4xl text-gray-400 mb-4" />
        <label className="cursor-pointer">
          <div className="text-lg font-semibold text-gray-700 mb-2">
            Click to upload PDF
          </div>
          <input
            type="file"
            accept=".pdf"
            onChange={handleUpload}
            disabled={loading}
            className="hidden"
          />
        </label>
        <p className="text-sm text-gray-500 mt-2">
          PDFs will be stored in /pdfs folder
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          {message}
        </div>
      )}

      {/* PDF List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Uploaded PDFs ({pdfs.length})</h3>
        {pdfs.length > 0 ? (
          <div className="space-y-2">
            {pdfs.map((pdf, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faFile} className="text-red-500" />
                  <span className="font-medium">{pdf}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleProcess(pdf)}
                    className="px-4 py-2 bg-[#667eea] text-white rounded-lg hover:bg-[#764ba2] transition"
                  >
                    Process
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No PDFs uploaded yet. Upload one to get started!
          </p>
        )}
      </div>
    </div>
  )
}
