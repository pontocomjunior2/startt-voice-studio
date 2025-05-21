import React, { useRef, useState } from 'react';

interface InputUploadImagemLocutorProps {
  name: string;
  label: string;
  value?: string;
  onChange: (url: string) => void;
  uploadUrl?: string;
  accept?: string;
}

export const InputUploadImagemLocutor: React.FC<InputUploadImagemLocutorProps> = ({
  name,
  label,
  value,
  onChange,
  uploadUrl = 'http://localhost:3001/api/upload/avatar',
  accept = 'image/*',
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.message || 'Erro ao fazer upload da imagem.');
        setLoading(false);
        return;
      }
      setPreview(data.url);
      onChange(data.url);
    } catch (err) {
      setError('Erro ao fazer upload da imagem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-xs">
      <label htmlFor={name} className="font-medium text-sm text-foreground mb-1">{label}</label>
      <input
        ref={inputRef}
        id={name}
        name={name}
        type="file"
        accept={accept}
        className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
        onChange={handleFileChange}
        aria-label={label}
        disabled={loading}
      />
      {loading && <span className="text-xs text-muted-foreground">Enviando imagem...</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
      {preview && (
        <img
          src={preview}
          alt="Avatar do locutor"
          className="mt-2 rounded shadow w-24 h-24 object-cover border border-muted"
          width={96}
          height={96}
        />
      )}
    </div>
  );
}; 