import React, { useRef, useState } from 'react';

interface InputUploadAudioLocutorProps {
  name: string;
  label: string;
  value?: string;
  onChange: (url: string) => void;
  uploadUrl?: string;
  accept?: string;
  disabled?: boolean;
}

export const InputUploadAudioLocutor: React.FC<InputUploadAudioLocutorProps> = ({
  name,
  label,
  value,
  onChange,
  uploadUrl = 'http://localhost:3001/api/upload/demo',
  accept = 'audio/*',
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(value || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('demo', file);
      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.message || 'Erro ao fazer upload do áudio.');
        setLoading(false);
        return;
      }
      setAudioUrl(data.url);
      onChange(data.url);
    } catch (err) {
      setError('Erro ao fazer upload do áudio.');
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
        className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 disabled:opacity-50"
        onChange={handleFileChange}
        aria-label={label}
        disabled={loading || disabled}
      />
      {loading && <span className="text-xs text-muted-foreground">Enviando áudio...</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
      {audioUrl && (
        <audio controls className="mt-2 w-full">
          <source src={audioUrl} />
          Seu navegador não suporta o elemento de áudio.
        </audio>
      )}
    </div>
  );
}; 