import React, { useCallback, useState } from 'react';
import { UploadCloud } from 'lucide-react';

const FileUpload = ({ onUpload }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // In a real app, parse xlsx here
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`file-upload-zone ${dragActive ? 'active' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragActive ? 'var(--teal-accent)' : 'var(--glass-border)'}`,
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center',
        background: dragActive ? 'rgba(14, 165, 160, 0.1)' : 'rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
    >
      <input 
        type="file" 
        accept=".xlsx,.csv" 
        style={{ display: 'none' }} 
        id="file-upload" 
        onChange={handleChange} 
      />
      <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
        <UploadCloud size={32} className="text-muted mx-auto mb-2" style={{ margin: '0 auto 0.5rem auto' }} />
        <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>Drag & drop or click to upload</div>
        <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Supports Excel and CSV up to 10MB</div>
      </label>
    </div>
  );
};

export default FileUpload;
