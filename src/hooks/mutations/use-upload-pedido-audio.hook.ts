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

const uploadPedidoAudio = async ({ file, username }: UploadPedidoAudioVariables): Promise<UploadPedidoAudioResponse> => {
  const formData = new FormData();
  formData.append('audioFile', file);

  const response = await fetch(`${API_URL}/api/upload/${username}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Erro ao fazer upload do áudio.');
  }

  const data = await response.json();
  return { filePath: data.filePath };
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