import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface UploadPedidoAudioVariables {
  file: File;
  username: string;
}

interface UploadPedidoAudioResponse {
  filePath: string; // Caminho relativo retornado pelo backend, ex: /uploads/audios/username/arquivo.mp3
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Função para upload em chunks (fallback para arquivos grandes)
const uploadFileInChunks = async (file: File, username: string): Promise<UploadPedidoAudioResponse> => {
  const chunkSize = 5 * 1024 * 1024; // 5MB por chunk
  const totalChunks = Math.ceil(file.size / chunkSize);
  const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  console.log(`[Chunked Upload] Iniciando upload de ${file.name} em ${totalChunks} chunks`);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const response = await fetch(`${API_URL}/api/upload-chunked/${username}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Chunk-Index': i.toString(),
        'X-Total-Chunks': totalChunks.toString(),
        'X-Original-Name': file.name,
        'X-Upload-Id': uploadId,
      },
      body: chunk,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro no chunk ${i + 1}/${totalChunks}`);
    }

    const result = await response.json();
    console.log(`[Chunked Upload] Chunk ${i + 1}/${totalChunks} enviado`);

    // Se é o último chunk, retornar o resultado final
    if (i === totalChunks - 1) {
      return { filePath: result.filePath };
    }
  }

  throw new Error('Upload em chunks falhou');
};

const uploadPedidoAudio = async ({ file, username }: UploadPedidoAudioVariables): Promise<UploadPedidoAudioResponse> => {
  const formData = new FormData();
  formData.append('audioFile', file);

  try {
    // Tentar upload normal primeiro
    const response = await fetch(`${API_URL}/api/upload/${username}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      // Se é erro 413 (arquivo muito grande), tentar upload em chunks
      if (response.status === 413) {
        console.log('[Upload] Erro 413 detectado, tentando upload em chunks...');
        toast.info('Arquivo grande detectado, usando upload em partes...', {
          duration: 3000,
        });
        return await uploadFileInChunks(file, username);
      }

      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Erro ao fazer upload do áudio.');
    }

    const data = await response.json();
    return { filePath: data.filePath };
  } catch (error) {
    // Se o erro não é 413, tentar upload em chunks como fallback
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.log('[Upload] Erro de rede detectado, tentando upload em chunks...');
      toast.info('Tentando método alternativo de upload...', {
        duration: 3000,
      });
      return await uploadFileInChunks(file, username);
    }
    throw error;
  }
};

export const useUploadPedidoAudio = () => {
  return useMutation<UploadPedidoAudioResponse, Error, UploadPedidoAudioVariables>({
    mutationFn: uploadPedidoAudio,
    onError: (error) => {
      toast.error('Falha ao fazer upload do áudio', {
        description: error.message,
      });
    },
  });
}; 